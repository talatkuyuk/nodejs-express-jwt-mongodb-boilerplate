/** @typedef {import('express-validator').ValidationChain} ValidationChain */
/** @typedef {import('express-validator').ContextRunner} ContextRunner */
/** @typedef {import('express-validator/lib/base').Middleware} Middleware */
/** @typedef {import('express-validator').FieldValidationError} FieldValidationError */
/** @typedef {import('express').RequestHandler} RequestHandler */
/** @typedef {Object.<string, string[]>} Errors */

const httpStatus = require("http-status");

const { validationResult, matchedData } = require("express-validator");
const { traceError } = require("../utils/errorUtils");
const ApiError = require("../utils/ApiError");

/**
 * Add FieldValidationErrors into new Errors object
 * @param {FieldValidationError} err
 * @param {Errors} errors
 * @returns {void}
 */
function addValidationError(err, errors) {
  // if (!err.path) err.path = "body";
  const key = err.path || err.location;

  if (errors[key]?.length) {
    errors[key].push(err.msg);
  } else {
    errors[key] = [err.msg];
  }
}

/**
 *
 * @param {ValidationChain[] |  Middleware & ContextRunner} rules
 * @returns {RequestHandler}
 */
const validate = (rules) => async (req, _res, next) => {
  try {
    if (Array.isArray(rules)) {
      // validate all validation rules in ValidationChain
      await Promise.all(rules.map((rule) => rule.run(req)));
    } else {
      // validate oneOf related validation rule
      await rules.run(req);
    }

    // debug the data validated or sanitized from the request
    console.log(
      matchedData(req, {
        includeOptionals: false,
        onlyValidData: false,
      }),
    );

    const validationErrors = validationResult(req);

    console.log({ validationErrors: validationErrors.array() });

    if (validationErrors.isEmpty()) return next();

    /** @type {Errors} */
    const errors = {};

    // convert validationErrors to custom errors object as structured at the end of the file
    validationErrors.array().forEach((err) => {
      switch (err.type) {
        // FieldValidationError
        case "field":
          addValidationError(err, errors);
          break;

        // AlternativeValidationError
        case "alternative":
          if (errors["body"]?.length) {
            errors["body"].push(err.msg);
          } else {
            errors["body"] = [err.msg];
          }
          break;

        // GroupedAlternativeValidationError
        case "alternative_grouped":
          // no exists, because oneOf(,,{errorType: "flat"}) in user validation
          break;

        // UnknownFieldValidationError
        case "unknown_fields":
          const fields = err.fields.map((field) => field.path).join(", ");
          errors["unknown"] = [`Unknown fields found in validation: ${fields}`];
          break;

        // Not a known type
        default:
          throw new Error("Not a known express-validator error");
      }
    });

    const validationError = new ApiError(
      httpStatus.UNPROCESSABLE_ENTITY, // error.statusCode (422)
      "ValidationError: The request could not be validated", // "error.name: error.message"
      true, // error.isOperational
      errors, // converted validation errors
    );

    next(validationError);
  } catch (error) {
    throw traceError(error, "ValidationMiddleware : validate");
  }
};

module.exports = validate;

// {
// 	validationErrors: [
//     {
//       type: 'field';
//       location: 'body' | 'cookies' | 'headers' | 'params' | 'query';
//       path: string;
//       value: any;
//       msg: any;
//     },
//     {
//       type: 'alternative';
//       msg: any;
//       nestedErrors: [
//         {
//           type: 'field';
//           location: 'body' | 'cookies' | 'headers' | 'params' | 'query';
//           path: string;
//           value: any;
//           msg: any;
//         },
//       ]
//     },
//     {
//       type: 'unknown_fields';
//       msg: any;
//       fields: [
//         {
//           path: string;
//           location: 'body' | 'cookies' | 'headers' | 'params' | 'query';
//           value: any;
//         },
//       ]
//     }
//   ]
// }

// {
//     "errors": {
//         "param1": [
//             "message"
//         ],
//         "param2": [
//             "message"
//         ],
//         "param3": [
//             "message1",
//             "message2"
//         ]
//     }
// }
