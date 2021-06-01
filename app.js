const smpp = require('@jambonz/node-smpp');
const express = require('express');
const app = express();
const opts = Object.assign({
  timestamp: () => `, "time": "${new Date().toISOString()}"`,
  level: process.env.LOGLEVEL || 'info'
});
const logger = require('pino')(opts);
const port = process.env.HTTP_PORT || 3020;
const smppPort = process.env.SMPP_PORT || 2775;
const {retrieveSet} = require('@jambonz/realtimedb-helpers')({
  host: process.env.JAMBONES_REDIS_HOST || 'localhost',
  port: process.env.JAMBONES_REDIS_PORT || 6379
}, logger);

const {
  lookupSmppGatewaysByBindCredentials,
  lookupAppByPhoneNumber
} = require('@jambonz/db-helpers')({
  host: process.env.JAMBONES_MYSQL_HOST,
  user: process.env.JAMBONES_MYSQL_USER,
  port: process.env.JAMBONES_MYSQL_PORT || 3306,
  password: process.env.JAMBONES_MYSQL_PASSWORD,
  database: process.env.JAMBONES_MYSQL_DATABASE,
  connectionLimit: process.env.JAMBONES_MYSQL_CONNECTION_LIMIT || 10
}, logger);
const sessionHandler = require('./lib/session-handler');

app.locals = {
  ...app.locals,
  dbHelpers: {
    lookupSmppGatewaysByBindCredentials,
    lookupAppByPhoneNumber
  },
  realtimeDbHelpers: {
    retrieveSet
  },
  logger,
};
const routes = require('./lib/routes');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/', routes);
app.use((err, req, res, next) => {
  logger.error(err, 'burped error');
  res.status(err.status || 500).json({msg: err.message});
});

app.listen(port, () => {
  logger.info(`jambonz-smpp-esme listening for api requests at http://localhost:${port}`);
});

/* create smpp server */
const server = smpp.createServer((session) => {
  session.on('bind_transceiver', async(pdu) => {
    session.pause();
    try {
      const gw = await lookupSmppGatewaysByBindCredentials(pdu.system_id, pdu.password);
      if (0 === gw.length) throw new Error('credentials not found');
      session.send(pdu.response());
      session.resume();
      sessionHandler(logger, session, gw);
    } catch (err) {
      logger.info({err}, `Incoming connection rejected for system_id ${pdu.system_id}`);
      await session.send(pdu.response({command_status: smpp.ESME_RBINDFAIL}))
        .catch((err) => logger.error({err}, 'Error sending ESME_RBINDFAIL'));
      session.close();
    }
  });
});
server.listen(smppPort, () => {
  logger.info(`jambonz-smpp-esme listening for smpp at http://localhost:${smppPort}`);
});

module.exports = app;
