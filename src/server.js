
const config = require('./config');
const app = require('./core/express');
const logger = require('./core/logger')

app.listen(config.port, function () {
    logger.info('Server started on port ' + config.port);
});