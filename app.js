const express = require('express');
const app = express();
const opts = Object.assign({
  timestamp: () => `, "time": "${new Date().toISOString()}"`,
  level: process.env.LOGLEVEL || 'info'
});
const logger = require('pino')(opts);
const port = process.env.HTTP_PORT || 3020;

app.locals = {
  ...app.locals,
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
  logger.info(`jambonz-smpp-esme-client listening at http://localhost:${port}`);
});
