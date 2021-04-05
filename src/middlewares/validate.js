const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { validationResult } = require('express-validator')


const validate = (rulesSchema) => async (req, res, next) => {

	// it validates all related validation rules (express-validator rules in validations)
  	await Promise.all(rulesSchema.map((rulesSchema) => rulesSchema.run(req)));

  	const errors = validationResult(req)
  	if (errors.isEmpty()) {
    	return next();
 	}
  
  	const xerrors = {};
  
	// convert errors object to xerrors object as structured below commented.
  	errors.array().map(err => {
		xerrors[err.param] = xerrors[err.param] ? [...xerrors[err.param], err.msg] : [err.msg];
  	});

	// instead of sending errors directly to the client, we use error handling mechanism below
	// return res.status(422).json({
	// 	errors: xerrors
	// })

	const error = new ApiError(
		httpStatus.UNPROCESSABLE_ENTITY, // statusCode: 422
		"Validation Error", // message
		xerrors, // errors
		true // isOperaional
	); 
  
	next(error);
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

