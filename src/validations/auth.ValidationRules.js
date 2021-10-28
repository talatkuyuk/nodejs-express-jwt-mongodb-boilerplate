const { body } = require('express-validator');
const {
	check_body_email,
	check_body_email_isTaken,
	check_body_password,
	check_body_passwordConfirmation,
} = require('./common.ValidationRules');



const loginValidationRules = [
	...check_body_email,

	body('password')
		.exists({checkFalsy: true}).withMessage('password must not be empty or falsy value'),

	body().custom( (body, { req }) => {
		const validKeys = ['email', 'password'];
		return Object.keys(req.body).every(key => validKeys.includes(key));
	}).withMessage(`Any extra parameter is not allowed other than ${['email', 'password']}`),
];



const signupValidationRules = [
    ...check_body_email,
	...check_body_email_isTaken,
	...check_body_password,
    ...check_body_passwordConfirmation,

	body().custom( (body, { req }) => {
		const validKeys = ['email', 'password', 'passwordConfirmation'];
		return Object.keys(req.body).every(key => validKeys.includes(key));
	}).withMessage(`Any extra parameter is not allowed other than ${['email', 'password', 'passwordConfirmation']}`),
];



const refreshTokensValidationRules = [
	body('refreshToken')
      .notEmpty().withMessage('refresh token must not be empty')
];



const forgotPasswordValidationRules = [
	...check_body_email,
];



const resetPasswordValidationRules = [
	...check_body_password,
	...check_body_passwordConfirmation,

	body('token')
      .notEmpty().withMessage('token must not be empty'),
];



const verifyEmailValidationRules = [
	body('token')
      .notEmpty().withMessage('token must not be empty'),
];



module.exports = {
	loginValidationRules, 
	signupValidationRules,
	refreshTokensValidationRules,
	forgotPasswordValidationRules,
	resetPasswordValidationRules,
	verifyEmailValidationRules,
};