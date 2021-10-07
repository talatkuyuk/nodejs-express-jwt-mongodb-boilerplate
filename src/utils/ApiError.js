const httpStatus = require('http-status');
const {serializeError} = require('serialize-error');

const Utils = require('./Utils');


// interface Error {
//     name: string, // always "Error"
//     message: string,
//     stack?: string,
// }
// There is only one constructor: new Error(message);


// interface ApiError {
//     name: string,
//     message: string,
//     statusCode: Number,
//     errors: Object,
//     isOperational: string,
//     stack?: string,
// }

class ApiError extends Error {
    constructor(statusCode, error, description = null, errors = null, isOperational = true, stack = '') {
      
      // ApiError accepts any Error instance as the paramater error.
      if (error instanceof Error) {
        //console.log("ApiError from Error: ", Utils.removeKey("stack", serializeError(error)));

        super(error.message);
        this.name = error.name === Error.prototype.name ? this.constructor.name : error.name;
        this.description = error.description ?? description;
        this.stack = error.stack;
      }

      // ApiError accepts string "error message" or "XxxError: error message" as the paramater error.
      else if (typeof error === 'string') {
        if (error.includes(':')) {
            const [name, message] = Utils.splitTwo(error, ':');
            super(message);
            this.name = name;
        } else {
            super(error);
            this.name = this.constructor.name;
        }
        this.description = description;
      }

      // if ApiError receives wrong argument type for the paramater error
      else {
        super("bad reference for error message");
        this.name = this.constructor.name;
        this.description = description;
      }
      
      this.statusCode = statusCode;
	    this.errors = errors;
      this.isOperational = isOperational;

      if (!this.stack)
          Error.captureStackTrace(this, this.constructor);
    }

    static notFound() {
        return new ApiError(httpStatus.NOT_FOUND, 'Not found');
    }
}

module.exports = ApiError;
