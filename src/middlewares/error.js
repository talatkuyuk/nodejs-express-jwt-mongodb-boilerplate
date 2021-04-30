const mongodb = require('mongodb');
const httpStatus = require('http-status');
const config = require('../config');
const logger = require('../core/logger');
const ApiError = require('../utils/ApiError');

// Convert errors to ApiError if it is not
const errorConverter = (err, req, res, next) => {
    let error = err;
    if (!(error instanceof ApiError)) {
      const statusCode = error.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
	  if (error instanceof mongodb.MongoError) statusCode = httpStatus.BAD_REQUEST; //TODO 
      const message = error.message || httpStatus[statusCode];
      error = new ApiError(statusCode, message, null, false, err.stack);
    }
    next(error);
  };
  

  // eslint-disable-next-line no-unused-vars
  const errorHandler = (err, req, res, next) => {

    let { statusCode, message, errors, stack } = err;

    if (config.env === 'production' && !err.isOperational) {
      statusCode = httpStatus.INTERNAL_SERVER_ERROR;
      message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR];
    }
  
	// morgan handler uses the errorMessage in res.locals to tokenize
    res.locals.errorMessage = message;
  
    const response = {
      code: statusCode,
      message,
	  ...(errors && { errors }), // { errors: errors }
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