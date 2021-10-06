const { body, param, query } = require('express-validator');
const { authuserService } = require('../services');
const { commonRules } = require('./auth.ValidationRules');


// Option-1: authuser validation is handled here in custom validation 
const check_param_id_with_custom = [
	param("id")
		.isLength({ min: 24, max: 24 }).withMessage('The param id must be a 24-character number')
		.bail()
		.custom(async (value) => {
			try {
				if (await authuserService.isValidAuthUser(value)) 
					return true; // indicates validation is success: the id is valid
				throw new Error('No user found');
				
			} catch (error) {
				throw error;
			}
		}),
];

// Option-2: authuser validation is handled in service not here (I've choosen this option for now)
const check_param_id = [
	param("id")
		.isLength({ min: 24, max: 24 })
		.withMessage('The param id must be a 24-character number')
];


////////////////////////////////////////////////////////////////////////


const getAuthUsers = [
	query("isDisabled")
		.isBoolean()
		.withMessage("The query param 'isDisabled' must be boolean value")
		.optional(),
	
	query("isEmailVerified")
		.isBoolean()
		.withMessage("The query param 'isEmailVerified' must be boolean value")
		.optional(),

	query("page")
		.isNumeric()
		.withMessage("The query param 'page' must be numeric value")
		.optional(),
	
	query("size")
		.isNumeric()
		.withMessage("The query param 'size' must be numeric value")
		.isLength({ max: 50 })
		.withMessage("The query param 'size' can be at most 50")
		.optional(),
];



const getAuthUser = [
	...check_param_id,
];



const addAuthUser = [

	...commonRules.check_body_email,
	...commonRules.check_body_email_custom_isTaken,
	...commonRules.check_body_password,
	...commonRules.check_body_passwordConfirmation,

	// just for experimental custom validation
	body().custom( (body, { req }) => {
		const validKeys = ['email', 'password', 'passwordConfirmation'];
		return Object.keys(req.body).every(key => validKeys.includes(key));
	}).withMessage(`Any extra parameter is not allowed other than ${['email', 'password', 'passwordConfirmation']}`),

];



const changePassword = [
	...commonRules.check_body_password,
	...commonRules.check_body_passwordConfirmation,

	body('currentPassword')
		.exists({checkFalsy: true}).withMessage('current password must not be empty or falsy value')
		.bail()
		.custom(async (value, { req }) => {
			try {
				if (await req.user.isPasswordMatch(value))
					return true; // indicates validation is success: the id is valid
				throw new Error('incorrect current password');
				
			} catch (error) {
				throw error;
			}
		}),
];


const toggleAuthUser = [
	...check_param_id
];



const deleteAuthUser = [
	...check_param_id
];



module.exports = {
	addAuthUser,
	getAuthUser,
	getAuthUsers,
	changePassword,
	toggleAuthUser,
	deleteAuthUser,
};