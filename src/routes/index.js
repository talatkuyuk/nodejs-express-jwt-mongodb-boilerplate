const express = require('express');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const docsRoute = require('./docs.route');
const config = require('../config');

const router = express.Router();

router.get('/', (req, res) => res.send('Hello'));
router.get('/status', (req, res) => res.send('OK'));

router.use('/auth', authRoute);
router.use('/user', userRoute);

/* istanbul ignore next */
if (config.env === 'development') {
    router.use('/docs', docsRoute);
}

module.exports = router;