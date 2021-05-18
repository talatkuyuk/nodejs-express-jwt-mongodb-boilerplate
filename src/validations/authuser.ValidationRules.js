const { body, param } = require('express-validator');
const { authuserService } = require('../services');
const { commonRules } = require('./auth.ValidationRules');

const check_param_id = [
	param("id")
		.isLength({ min: 24, max: 24}).withMessage('param id is wrong')
		.bail()
		.custom(async (value) => {
			try {
				if (await authuserService.utils.isValidAuthUser(value)) 
					return true; // indicates validation is success: the id is valid
				throw new Error('param id does not refer any user. (User not found)');
				
			} catch (error) {
				throw error;
			}
	}),
];


////////////////////////////////////////////////////////////////////////


const getAuthUsers = [
	param("disabled")
		.isBoolean()
		.withMessage("The query param disabled must be boolean value")
		.optional(),
];



const getAuthUser = [
	...check_param_id,
];



const addAuthUser = [

	...commonRules.check_body_email,
	...commonRules.check_body_email_custom_isTaken,
	...commonRules.check_body_password,

	body().custom( (body, { req }) => {
		const validKeys = ['email', 'password'];
		return Object.keys(req.body).every(key => validKeys.includes(key));
	}).withMessage(`Any extra parameter is not allowed other than ${['email', 'password']}`),

];



const changePassword = [
	...commonRules.check_body_password,
	...commonRules.check_body_passwordConfirmation,

	body('currentPassword')
		.exists({checkFalsy: true}).withMessage('current password must not be empty or falsy value')
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