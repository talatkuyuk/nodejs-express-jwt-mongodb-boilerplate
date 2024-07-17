const MongoError = require("mongodb").MongoError;
const httpStatus = require("http-status");
const config = require("../config");
const logger = require("../core/logger");
const ApiError = require("../utils/ApiError");

/**
 * Throw ApiError for the routes that are not defined
 * @type {import('express').RequestHandler}
 */
const notFound = (_req, _res, next) => next(new ApiError(httpStatus.NOT_FOUND, "Not found"));

/**
 * Convert errors to ApiError if it is not
 * @type {import('express').ErrorRequestHandler}
 */
const converter = (err, _req, _res, next) => {
  if (err instanceof ApiError) next(err);

  let convertedError;

  !err.errorPath && (err.errorPath = "Catched in error middleware");

  if (err instanceof MongoError) {
    !err.message && (err.message = "Database error in MongoDB");
    convertedError = new ApiError(httpStatus.BAD_REQUEST, err, true);
  } else {
    !err.message && (err.message = "Internal server error");
    convertedError = new ApiError(httpStatus.INTERNAL_SERVER_ERROR, err, false);
  }

  next(convertedError);
};

/**
 * Prepare the response having the error
 * @type {import('express').ErrorRequestHandler}
 */
const handler = (err, _req, res, _next) => {
  let { statusCode, name, message, isOperational, errors, errorPath, stack } = err;

  // morgan handler uses the res.locals.error to tokenize
  res.locals.error = `${name}: ${message}`;

  // log the error object
  config.env === "development" && logger.error(err);

  if (config.env === "production" && !isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR];
  }

  const response = {
    success: false,
    error: {
      code: statusCode,
      name,
      message,
      ...(errors && { errors }),
      ...(config.env !== "production" && errorPath && { errorPath }),
      ...(config.env === "development" && stack && { stack }), // { stack: stack }
    },
  };

  if (!isOperational) {
    console.log("The programmer error is NOT operational!");

    // ReferenceError, TypeError etc.
    console.log(response);

    process.exit(1);
  }

  res.status(statusCode).send(response);
};

module.exports = {
  notFound,
  converter,
  handler,
};
