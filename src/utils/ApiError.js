const config = require('../config');


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


/*
interface Error {
    name: "Error",
    message: string,
    stack?: string,
}

There is only one constructor: new Error(message);

interface ApiError {
    name: string,
    message: string,
    statusCode: Number,
    errors: Object,
    isOperational: string,
    stack?: string,
}

Operational Errors: represent runtime problems. These errors are expected in the Node.js runtime and should be dealt with in a proper way. This does not mean the application itself has bugs. It means they need to be handled properly. Here’s a list of common operational errors:

failed to connect to server
failed to resolve hostname
invalid user input
resource not found
forbidden/unauthorized requests
request timeout
socket hang-up
system is out of memory

Programmer Errors: are what we call bugs. They represent issues in the code itself. Here are a few more:

reading a property of an undefined object
called an asynchronous function without a callback
did not resolve a promise
did not catch a rejected promise
passed a string where an object was expected
passed an object where a string was expected
passed incorrect parameters in a function


Operational errors are part of the runtime and application while programmer errors are bugs you introduce in your codebase.
*/
