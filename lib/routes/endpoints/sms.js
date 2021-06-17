const smpp = require('@jambonz/node-smpp');
const {errors} = smpp;
const {SmppError} = require('../../errors');
const router = require('express').Router();

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
  logger.info({payload: req.body}, 'POST /sms');
  if ([ipv4, port, use_tls, smpp_system_id, smpp_password].find((val) => !val)) {
    logger.info({payload}, 'POST /sms missing params');
    return res.send(400);
  }
  try {

    /* connect */
    const url = `${use_tls ? 'smpps' : 'smpp'}://${ipv4}:${port}`;
    const session = await smpp.connect(url);

    /* bind */
    let pdu = await session.bind_transceiver({
      system_id: smpp_system_id,
      password: smpp_password
    });
    if (errors.ESME_ROK !== pdu.command_status) {
      logger.info(`error binding ${pdu.command_status}`);
      throw new SmppError(pdu.command_status);
    }

    /* send */
    pdu = await session.submit_sm({
      destination_addr: to,
      short_message: text,
      source_addr: from
    });
    if (errors.ESME_ROK !== pdu.command_status) {
      logger.info(`error sending 0X00${pdu.command_status.toString(16)}`);
      throw new SmppError(pdu.command_status);
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
      logger.info({payload: req.body}, `Error sending SMS: ${err.msg}`);
      return res.status(480).json({smpp_err_code: err.code});
    }
    logger.error({err, payload: req.body}, 'POST /sms');
    res.status(500).json({msg: err.message});
  }
});

module.exports = router;
