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
    constructor(statusCode, error, errors = null, isOperational = true, stack = '') {
      
      // ApiError accepts any Error instance as the paramater error.
      if (error instanceof Error) {
        console.log("ApiError from Error: ", Utils.removeKey("stack", serializeError(error)));

        super(error.message);
        this.name = error.name;
      }

      // ApiError accepts Object {name, message} as the paramater error.
      else if (typeof error === 'object') {
        console.log("ApiError from object: ", error.message);

        super(error.message);
        this.name = error.name ?? this.constructor.name;
      }

      // ApiError accepts string "error message" or "XxxError: error message" as the paramater error.
      else if (typeof error === 'string') {
        console.log("ApiError from string: ", error);

        if (error.includes(':')) {
            const [name, message] = Utils.splitTwo(error, ':');
            super(message);
            this.name = name;
        } else {
            super(error);
            this.name = this.constructor.name;
        }
      }

      // ApiError receives wrong argument type for the paramater error
      else {
        super("bad reference for error message");
        this.name = this.constructor.name;;
      }
      
      this.statusCode = statusCode;
	    this.errors = errors;
      this.isOperational = isOperational;
      
      if (stack) {
          this.stack = stack;
      } else {
          Error.captureStackTrace(this, this.constructor);
      }
    }

    static notFound() {
        return new ApiError(httpStatus.NOT_FOUND, 'Not found');
    }
}

module.exports = ApiError;
