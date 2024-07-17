// HTTP request logger middleware for node.js
const morgan = require("morgan");

const config = require("../config");
const logger = require("./logger");

// add ":user" token
// @ts-ignore
morgan.token("user", (req, _res) => req.authuser?.email || "anonymous");

// add ":error" token. ("res.locals.error" is setted via errorHandler in error.js)
// @ts-ignore
morgan.token("error", (_req, res) => res.locals.error || "");

const getIpFormat = () => (config.env === "production" ? ":remote-addr - " : "");
const successResponseFormat = `${getIpFormat()}:method :url :status - :response-time ms - :user`;
const errorResponseFormat = `${getIpFormat()}:method :url :status - :response-time ms - :user - :error`;

const successHandler = morgan(successResponseFormat, {
  skip: (_req, res) => res.statusCode >= 400,
  stream: { write: (message) => logger.info(message.trim()) },
});

const errorHandler = morgan(errorResponseFormat, {
  skip: (_req, res) => res.statusCode < 400,
  stream: { write: (message) => logger.error(message.trim()) },
});

module.exports = {
  successHandler,
  errorHandler,
};
