const config = require('../config');

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
    constructor(statusCode, error, description = null, errors = null, isOperational = true, stack) {
      
      // ApiError accepts any Error instance as the paramater error.
      if (error instanceof Error) {
        super(error.message);
        this.name = error.name === Error.prototype.name ? this.constructor.name : error.name;
        this.description = error.description ?? description;
        this.stack = error.stack;
      }

      // ApiError accepts string "error message" or "XxxError: error message" as the paramater error.
      else if (typeof error === 'string') {
        if (error.includes(':')) {
            const [name, message] = error.split(":");
            super(message.trim());
            this.name = name.trim();
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

      stack && (this.stack = stack);

      if (!this.stack)
          Error.captureStackTrace(this, this.constructor);
    }
}



// Add desription to Error to locate the module in which occurs
const locateError = (error, description) => {
  if (config.env !== "production") {

      const [main, module] = description.split(" : ");

      // OPTION-1 (error point)
      // error.description || (error.description = description);

      // OPTION-2 (error path)
      if (error.description)
          error.description += `  --->  ${main} [${module}]`
      else
          error.description = `failed in ${main} [${module}]`
      
      return error;
  }
}


module.exports = {
  ApiError,
  locateError
};
