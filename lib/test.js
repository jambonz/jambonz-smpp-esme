const smpp = require('@jambonz/node-smpp');

module.exports = (logger) => {
  const connect = async() => {
    try {
      /* connect */
      const url = `smpp://${process.env.SMPP_HOST}:${process.env.SMPP_PORT}`;
      logger.info(`connecting to ${url}`);
      const session = await smpp.connect(url);
      logger.info({session}, 'Successfully connected!!');

      /* bind */
      const pdu = await session.bind_transceiver({
        system_id: process.env.SYSTEM_ID,
        password: process.env.PASSWORD
      });
      logger.info({pdu}, 'bind successful!!');
      session.auto_enquire_link_period = 60000;

      /* send message */
      const pdu2 = await session.submit_sm({
        destination_addr: '15083084809',
        short_message: 'verification code is 66668',
        source_addr: 'Alert'
      });
      logger.info({pdu2}, 'sent message!!');
    } catch (err) {
      logger.error({err}, 'Error');
    }
  };

  return {
    connect
  };
};
