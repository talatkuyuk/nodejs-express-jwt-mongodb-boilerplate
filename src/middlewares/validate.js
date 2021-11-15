const httpStatus = require('http-status');

const { validationResult, matchedData } = require('express-validator')
const { ApiError, locateError } = require('../utils/ApiError');


const validate = (rules) => async (req, res, next) => {
	try {
		// validate all related validation rules
		await Promise.all(rules.map((rule) => rule.run(req)));

		const bodyData = matchedData(req, { includeOptionals: false, onlyValidData: false });
		console.log(bodyData);

		const errors = validationResult(req);

		if (errors.isEmpty()) return next();

		const myerrors = {};

		// convert errors object to myerrors object as structured below at the end of the file.
		errors.array().map(err => {
			// oneOf([check(...).exists(), ...]) --> param: "_error" (see at users validation)
			if (err.param === "_error") err.param = "body";
			
			const key = err.param || err.location;
			myerrors[key] = myerrors[key] ? [...myerrors[key], err.msg] : [err.msg];
		});

		const validationError = new ApiError(
			httpStatus.UNPROCESSABLE_ENTITY, // error.statusCode (422)
			"ValidationError: The request could not be validated", // error.name: error.message
			null, // error.description
			myerrors, // converted validation errors
			true, // error.isOperational
		);

		next(validationError);

	} catch (error) {
		throw locateError(error, "ValidationMiddleware : validate");
	}
}

module.exports = validate;

// { 
// 		"errors": [ 
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
//     "myerrors": {
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

