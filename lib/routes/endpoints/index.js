const router = require('express').Router();

router.use('/sms', require('./sms'));

module.exports = router;
