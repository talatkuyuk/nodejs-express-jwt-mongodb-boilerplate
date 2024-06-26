const httpStatus = require("http-status");

const { validationResult, matchedData } = require("express-validator");
const { traceError } = require("../utils/errorUtils");
const ApiError = require("../utils/ApiError");

const validate = (rules) => async (req, res, next) => {
  try {
    // validate all related validation rules
    await Promise.all(rules.map((rule) => rule.run(req)));

    const bodyData = matchedData(req, {
      includeOptionals: false,
      onlyValidData: false,
    });

    console.log(bodyData);

    const validationErrors = validationResult(req);

    if (validationErrors.isEmpty()) return next();

    const errors = {};

    // convert errors object to errors object as structured below at the end of the file.
    validationErrors.array().map((err) => {
      // oneOf([check(...).exists(), ...]) --> param: "_error" (see at users validation)
      if (err.path === "_error" || !err.path) err.path = "body";

      const key = err.path || err.location;
      errors[key] = errors[key] ? [...errors[key], err.msg] : [err.msg];
    });

    const validationError = new ApiError(
      httpStatus.UNPROCESSABLE_ENTITY, // error.statusCode (422)
      "ValidationError: The request could not be validated", // error.name: error.message
      true, // error.isOperational
      errors // converted validation errors
    );

    next(validationError);
  } catch (error) {
    throw traceError(error, "ValidationMiddleware : validate");
  }
};

module.exports = validate;

// {
// 		"validationErrors": [
// 			{
// 				value,
// 				msg,
// 				param,
// 				location
// 			},
// 			{ ... },
// 		]
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
