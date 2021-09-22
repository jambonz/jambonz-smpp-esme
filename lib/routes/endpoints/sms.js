const smpp = require('@jambonz/node-smpp');
const {errors} = smpp;
const {SmppError} = require('../../errors');
const router = require('express').Router();
const SmsCounter = require('sms-counter-npm');

/* send an SMS */
router.post('/', async(req, res) => {
  const {logger} = req.app.locals;
  const payload = req.body;
  const {
    ipv4,
    port,
    use_tls,
    smpp_system_id,
    smpp_password,
    from,
    to,
    text,
    name
  } = payload;

  /* validate params */
  logger.debug({payload}, 'POST /sms');
  if ([ipv4, port, use_tls, smpp_system_id, smpp_password].find((val) => val === null)) {
    logger.info({payload}, 'POST /sms missing some mandatory params: have you configured system id and password?');
    return res.send(400);
  }
  try {

    /* connect */
    const url = `${use_tls ? 'smpps' : 'smpp'}://${ipv4}:${port}`;
    logger.info(`POST /sms (sending outbound): connecting to ${url}`);
    const session = await smpp.connect(url);
    logger.info(`POST /sms (sending outbound): connected successfully to ${url}`);

    /* bind */
    let pdu = await session.bind_transceiver({
      system_id: smpp_system_id,
      password: smpp_password
    });
    if (errors.ESME_ROK !== pdu.command_status) {
      logger.info(`error binding ${pdu.command_status}`);
      throw new SmppError(pdu.command_status);
    }
    logger.debug(`successfully bound outgoing session to ${url}`);

    /* send */
    const smscount = SmsCounter.count(text);
    if (smscount.messages === 1 || process.env.AVOID_UDH) {
      let submit_params = {
        destination_addr: to,
        source_addr: from
      };
      if (smscount.messages > 1) submit_params = {...submit_params, message_payload: text};
      else submit_params = {...submit_params, short_message: text};
      pdu = await session.submit_sm(submit_params);
      if (errors.ESME_ROK !== pdu.command_status) {
        logger.info(`error sending 0X00${pdu.command_status.toString(16)}`);
        throw new SmppError(pdu.command_status);
      }
    }
    else {
      const l = text.length;
      let lc = 0;
      const messages = [];
      let c = 0;
      const chunkSize = smscount.per_message;

      for (; lc < l; c++) messages[c] = text.slice(lc, lc += chunkSize);

      const concatRef = Math.floor(Math.random() * 255);
      logger.info(`we will be sending this in ${messages.length} parts with ref ${concatRef}`);

      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        const udh = Buffer.alloc(6);
        udh.write(String.fromCharCode(0x5), 0); /* Length of UDH */
        udh.write(String.fromCharCode(0x0), 1); /* Indicator for concatenated message */
        udh.write(String.fromCharCode(0x3), 2); /* Subheader Length (3 bytes) */
        udh.write(String.fromCharCode(concatRef), 3); /* Same reference for all concatenated messages */
        udh.write(String.fromCharCode(messages.length), 4); /* Number of total messages in the split */
        udh.write(String.fromCharCode(i + 1), 5); /* Sequence number (used to concatenate the split messages) */

        const submit_params = {
          destination_addr: to,
          source_addr: from,
          short_message: {udh, message}
        };

        logger.info(`sending message part ${i + 1}`);
        pdu = await session.submit_sm(submit_params);
        if (errors.ESME_ROK !== pdu.command_status) {
          const err = new SmppError(pdu.command_status);
          logger.info(`Error sending: ${err.message}`);
          throw err;
        }
      }
    }

    logger.info({pdu, name}, 'got response to submit_sm');
    res.status(201).json({
      message_id: pdu.message_id,
      carrier: name
    });

    /* unbind */
    try {
      pdu = await session.unbind();
    } catch (err) {
      logger.info({err}, 'Error unbinding');
    }
    session.close();

  } catch (err) {
    if (err instanceof SmppError) {
      const {message, code} = err;
      logger.info({payload: req.body, err}, `Error sending SMS: ${message}`);
      return res.status(480).json({message, smpp_err_code: code});
    }
    logger.error({err, payload: req.body}, 'POST /sms - Error');
    res.status(500).json({msg: err.message});
  }
});

module.exports = router;
