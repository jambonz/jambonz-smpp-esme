const smpp = require('@jambonz/node-smpp');
const {errors} = smpp;
const {SmppError} = require('../../errors');
const router = require('express').Router();

/* send an SMS */
router.post('/', async(req, res) => {
  const {logger, lookupSmppGateways} = req.app.locals;
  const {
    account_sid,
    to,
    text
  } = req.body;
  if (!account_sid) {
    logger.info('POST /sms - missing account_sid');
    return res.send(500, 'account_sid is missing');
  }
  try {
    logger.info({payload: req.body}, 'POST /sms');

    const gateways = await lookupSmppGateways(null, account_sid);
    if (0 == gateways.length) throw new Error();

    const {host, port, use_tls, system_id, password} = gateways[0];

    /* connect */
    const url = `${use_tls ? 'smpps' : 'smpp'}://${host}:${port}`;
    const session = await smpp.connect(url);

    /* bind */
    let pdu = await session.bind_transceiver({system_id, password});
    if (errors.ESME_ROK !== pdu.command_status) {
      logger.info(`error binding ${pdu.command_status}`);
      throw new SmppError(pdu.command_status);
    }

    /* send */
    pdu = await session.submit_sm({
      destination_addr: to,
      short_message: text,
      source_addr: 'Alert'
    });
    if (errors.ESME_ROK !== pdu.command_status) {
      logger.info(`error sending 0X00${pdu.command_status.toString(16)}`);
      throw new SmppError(pdu.command_status);
    }
    res.status(201).json({message_id: pdu.message_id});

    /* unbind */
    try {
      pdu = await session.unbind();
    } catch (err) {
      logger.info({err}, 'Error unbinding');
    }
    session.close();

  } catch (err) {
    if (err instanceof SmppError) {
      logger.info({payload: req.body}, `Error sending SMS: ${err.msg}`);
      return res.status(480).json({smpp_err_code: err.code});
    }
    logger.error({err, payload: req.body}, 'POST /sms');
    res.status(500).json({msg: err.message});
  }
});

module.exports = router;
