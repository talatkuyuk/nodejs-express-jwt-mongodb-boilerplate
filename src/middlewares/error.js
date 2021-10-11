const MongoError = require('mongodb').MongoError;
const httpStatus = require('http-status');
const config = require('../config');
const logger = require('../core/logger');
const { ApiError } = require('../utils/ApiError');



// Convert errors to ApiError if it is not
const errorConverter = (err, req, res, next) => {
  
  if (!(err instanceof ApiError)) {
    let statusCode, description;

    if (err instanceof MongoError) {
        statusCode = httpStatus.BAD_REQUEST;
        description = err.description ?? "Database error in MongoDB";

    } else {
        statusCode = httpStatus.INTERNAL_SERVER_ERROR;
        description = err.description ?? "Internal server error";
    }
    
    const convertedError = new ApiError(statusCode, err, description, null, false, err.stack);
    next(convertedError);
  }
  
  next(err);
};
  


// Prepare the response having the error
const errorHandler = (err, req, res, next) => {
  let { name, statusCode, message, description, errors, stack } = err;

  if (config.env === 'production' && !err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR];
    description = null;
  }

  // morgan handler uses the error in res.locals to tokenize
  res.locals.error = `${name}: ${message}`;

  const response = {
    code: statusCode,
    name,
    message,
    ...(description && { description }),
    ...(errors && { errors }),
    ...(config.env === 'development' && { stack }) // { stack: stack }
  };

// shows the error object (error message and error stack) in terminal
  if (config.env === 'development') {
    logger.error(err);
  }

  res.status(statusCode).send(response);
};


module.exports = {
  errorConverter,
  errorHandler,
};