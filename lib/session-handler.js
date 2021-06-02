const { v4: uuidv4 } = require('uuid');
const bent = require('bent');
const {getUdh} = require('./utils');
const partialMsgs = new Map();
let idx = 0;

const translateApp = (app) => {
  app.messageSid = app.message_sid;
  delete app.message_sid;

  app.accountSid = app.account_sid;
  delete app.account_sid;

  app.applicationSid = app.application_sid;
  delete app.application_sid;

  return app;
};

class Sms {
  constructor({totalParts, part, message}) {
    this._message = [];
    this.totalParts = totalParts;
    this._message[part - 1] = message;
  }

  get message() {
    return this._message.join('');
  }

  get isComplete() {
    return this._message
      .filter((m) => typeof m === 'string')
      .length === this.totalParts;
  }

  addPart(part, msg) {
    this._message[part - 1] = msg;
  }
}

const processFullMessage = async(logger, session, pdu, message_sid, message) => {
  const {carrier, voip_carrier_sid} = session.locals;
  const {lookupAppByPhoneNumber} = require('..').locals.dbHelpers;
  const {retrieveSet} = require('..').locals.realtimeDbHelpers;

  try {
    const app = await lookupAppByPhoneNumber(pdu.destination_addr, voip_carrier_sid);
    logger.info({app}, `Retrieved app for incoming SMS, carrier is ${carrier}`);
    if (!app || !app.messaging_hook) {
      logger.info(`No application found for incoming SMS to ${pdu.destination_addr}`);
      return;
    }

    /* find a feature server to send to */
    const setName = `${process.env.JAMBONES_CLUSTER_ID || 'default'}:active-fs`;
    const fs = await retrieveSet(setName);
    if (0 === fs.length) {
      logger.info('No available feature servers to handle createCall API request');
      return;
    }
    const ip = fs[idx++ % fs.length];
    const serviceUrl = `http://${ip}:3000`;

    const payload = {
      messageSid: message_sid,
      app: translateApp(app),
      from: pdu.source_addr,
      to: pdu.destination_addr,
      text: message,
      pdu
    };

    /* send POST to feature server */
    logger.info(`sending call to ${carrier}`);
    const post = bent(serviceUrl, 'POST', 'json', 200);
    const response = await post(`/v1/messaging/${carrier}`, payload);

    /* send success back to MC */
    logger.info({response}, 'response from feature server');
  } catch (err) {

  }
};

const handleIncomingMsg = async(logger, session, pdu) => {
  logger.info({pdu}, 'got incoming message');
  const message_sid = uuidv4();
  session.send(pdu.response({message_sid}));

  try {
    const udh = getUdh(pdu);
    if (udh) {
      /* concatenated sms */
      const {message} = pdu.short_message;
      let sms = partialMsgs.get(udh.ref);
      if (sms) sms.addPart(udh.part, message);
      else {
        sms = new Sms({...udh, message});
        partialMsgs.set(udh.ref, sms);
      }

      if (sms.isComplete) {
        const msg = sms.message;
        logger.info({message_sid}, 'sending concatenated message');
        processFullMessage(logger, session, pdu, message_sid, msg);
        partialMsgs.delete(udh.ref);
      }
    }
    else {
      logger.info({message_sid}, 'sending simple message');
      processFullMessage(logger, session, pdu, message_sid, pdu.short_message.message);
    }
  } catch (err) {
    logger.error({err}, 'Error processing incoming message');
  }
};

const onPdu = (logger, session, pdu) => {
  switch (pdu.command) {
    case 'enquire_link':
      const {sequence_number} = pdu;
      logger.info(`got enquire_link, seq ${sequence_number}`);
      session.send(pdu.response());
      break;
    case 'submit_sm':
      handleIncomingMsg(logger, session, pdu);
      break;
    default:
      logger.info({pdu}, 'got pdu');
      session.send(pdu.response());
      break;
  }
};

const onClose = (logger, session) => {
  logger.info('close from far end');
};

const onError = (logger, session, err) => {
  logger.info({err}, 'session error');
  session.unbind()
    .then(() => session.close())
    .catch(() => session.close());
};

module.exports = (logger, session, gw) => {
  const {vc, sg} = gw[0];
  const {account_sid, service_provider_sid, voip_carrier_sid} = sg;
  const {name} = vc;

  logger.info({sg, vc}, 'new connection');
  session.locals = {
    account_sid,
    service_provider_sid,
    voip_carrier_sid,
    carrier: name
  };

  session.on('pdu', onPdu.bind(null, logger, session));
  session.on('close', onClose.bind(null, logger, session));
  session.on('error', onError.bind(null, logger, session));
};

