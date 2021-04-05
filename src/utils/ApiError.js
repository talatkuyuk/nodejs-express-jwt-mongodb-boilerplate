// For information
// interface Error {
//     name: string;
//     message: string;
//     stack?: string;
// }

class ApiError extends Error {
    constructor(statusCode, message, errors = null, isOperational = true, stack = '') {
      super(message);
      this.statusCode = statusCode;
	  this.errors = errors;
      this.isOperational = isOperational;
      if (stack) {
        this.stack = stack;
      } else {
        Error.captureStackTrace(this, this.constructor);
      }
    }
}
  
module.exports = ApiError;
