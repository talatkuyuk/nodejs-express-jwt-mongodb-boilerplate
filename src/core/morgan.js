const morgan = require('morgan');
const config = require('../config');
const logger = require('./logger');

// it tokenizes errorMessage in res.locals as message. It is set via errorHandler in error.js
morgan.token('message', (req, res) => res.locals.errorMessage || '');
morgan.token('user', (req, res) => req?.user?.email || '');

const getIpFormat = () => (config.env === 'production' ? ':remote-addr - ' : '');
const successResponseFormat = `${getIpFormat()}:method :url :status - :response-time ms user::user`;
const errorResponseFormat = `${getIpFormat()}:method :url :status - :response-time ms  user::user - message: :message`;

const successHandler = morgan(successResponseFormat, {
  skip: (req, res) => res.statusCode >= 400,
  stream: { write: (message) => logger.info(message.trim()) },
});

const errorHandler = morgan(errorResponseFormat, {
  skip: (req, res) => res.statusCode < 400,
  stream: { write: (message) => logger.error(message.trim()) },
});

module.exports = {
  successHandler,
  errorHandler,
};