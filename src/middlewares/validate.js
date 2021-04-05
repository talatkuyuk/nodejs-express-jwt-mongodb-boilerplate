const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { validationResult } = require('express-validator')


const validate = (rulesSchema) => async (req, res, next) => {

  	await Promise.all(rulesSchema.map((rulesSchema) => rulesSchema.run(req)));

  	const errors = validationResult(req)
  	if (errors.isEmpty()) {
    	return next();
 	}
  
  	const xerrors = {};
  
  	errors.array().map(err => {
		xerrors[err.param] = xerrors[err.param] ? [...xerrors[err.param], err.msg] : [err.msg];
  	});

	const error = new ApiError(
		httpStatus.UNPROCESSABLE_ENTITY, // statusCode: 422
		"Validation Error", // message
		xerrors, // errors
		true // isOperaional
	); 
  
	next(error);
	
	// return res.status(422).json({
	// 	errors: xerrors
	// })
}

module.exports = validate;

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

