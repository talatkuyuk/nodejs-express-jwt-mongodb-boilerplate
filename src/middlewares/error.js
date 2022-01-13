const MongoError = require('mongodb').MongoError;
const httpStatus = require('http-status');
const config = require('../config');
const logger = require('../core/logger');
const ApiError = require('../utils/ApiError');



// Throw ApiError for the routes that are not defined
const notFound = (req, res, next) => next( new ApiError(httpStatus.NOT_FOUND, 'Not found') );



// Convert errors to ApiError if it is not
const converter = (err, req, res, next) => {

  if (err instanceof ApiError) next(err);
  
  let convertedError;

  if (err instanceof MongoError) {
      err.message = err.message ?? "Database error in MongoDB";
      err.errorPath = err.errorPath ?? "Catched in error middleware";
      convertedError = new ApiError(httpStatus.BAD_REQUEST, err, true, null, err.errorPath, err.stack);

  } else {
      err.message = err.message ?? "Internal server error";
      err.errorPath = err.errorPath ?? "Catched in error middleware";
      convertedError = new ApiError(httpStatus.INTERNAL_SERVER_ERROR, err, false, null, err.errorPath, err.stack);
  }

  next(convertedError);
};
  


// Prepare the response having the error
const handler = (err, req, res, next) => {
  let { statusCode, name, message, errors, errorPath, stack } = err;

  // morgan handler uses the res.locals.error to tokenize
  res.locals.error = `${name}: ${message}`;

  // log the error object
  config.env === 'development' && (logger.error(err));
    
  if (config.env === 'production' && !err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR];
  }

  const response = {
    code: statusCode,
    name,
    message,
    ...(errors && { errors }),
    ...(config.env !== 'production' && errorPath && { errorPath }),
    ...(config.env === 'development' && stack && { stack }) // { stack: stack }
  };

  !err.isOperational && (process.exit(1));

  res.status(statusCode).send(response);
};


module.exports = {
  notFound,
  converter,
  handler,
};