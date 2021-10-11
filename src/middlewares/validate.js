const httpStatus = require('http-status');
const { validationResult } = require('express-validator')

const { ApiError, locateError } = require('../utils/ApiError');

const validate = (rulesSchema) => async (req, res, next) => {
	try {
		// it validates all related validation rules (express-validator rules in validations directory)
		await Promise.all(rulesSchema.map((rule) => rule.run(req)));

		const errors = validationResult(req);

		if (errors.isEmpty()) return next();

		const xerrors = {};

		// convert errors object to xerrors object as structured below commented.
		errors.array().map(err => {
			const param = err.param !== "" ? err.param : "body";
			xerrors[param] = xerrors[param] ? [...xerrors[param], err.msg] : [err.msg];
		});

		// instead of sending errors directly to the client, I use error handling mechanism below with next function
		// return res.status(422).json({
		// 	errors: xerrors
		// })

		const validationError = new ApiError(
			httpStatus.UNPROCESSABLE_ENTITY, // statusCode: 422
			"ValidationError: The request could not be validated", // message
			null, // no need error description
			xerrors, // converted validation errors
			true, // isOperational
		);

		console.log(validationError)
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

