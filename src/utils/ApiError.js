class ApiError extends Error {
  constructor(statusCode, error, isOperational = true, errors = null) {
    if (!statusCode || !error) throw Error("bad ApiError argument");

    // ApiError accepts any Error instance as the paramater error.
    if (error instanceof Error) {
      super(error.message);
      this.name =
        error.name === Error.prototype.name
          ? this.constructor.name
          : error.name;
    }

    // ApiError accepts string "error message" or "XxxError: error message" as the paramater error.
    else if (typeof error === "string") {
      if (error.includes(":")) {
        const [name, message] = error.split(":");
        super(message.trim());
        this.name = name.trim();
      } else {
        super(error.trim());
        this.name = this.constructor.name;
      }
    }

    // if ApiError may receive an error like object
    else if (typeof error === "object") {
      super(error.message ?? "no specific error message");
      this.name = error.isAxiosError
        ? "AxiosError"
        : error.name ?? this.constructor.name;
    }

    // if received wrong argument type, throw an error
    else {
      throw Error("bad ApiError argument");
    }

    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;
    this.errorPath = null;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;

/*
The error object is a built-in object that provides a standard set of useful information when an error occurs, such as a stack trace and the error message.

interface Error {
    name: "Error",
    message: string,
    stack?: string,
}

If you want to add more information to the Error object, you can always add properties.
var error = new Error("The error message");
error.http_code = 404;

There is only one constructor: new Error(message);

I've implemented an ApiError on top of the Error object:
-------------------------------------------------------
interface ApiError {
    statusCode: Number,
    name: string,
    message: string,
    isOperational: string,
    errors: Object,
    errorPath: string,
    stack?: string,
}

// https://sematext.com/blog/node-js-error-handling/

To avoid from:
- uncaughtException
- unhandledRejection

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
examples: [Error, TypeError, ReferenceError]  


Operational errors are part of the runtime and application while programmer errors are bugs you introduce in your codebase.

Operational errors are (unavoidable) run-time problems experienced by correctly-written programs, such as disk full, network connection loss, database is not available for temporary etc.

Do you want to restart your app if there’s a user not found error? Absolutely not. Other users are still enjoying your app. This is an example of an operational error.

What about failing to catch a rejected promise? Does it make sense to keep the app running even when a bug threatens your app? No! Restart it.
*/
