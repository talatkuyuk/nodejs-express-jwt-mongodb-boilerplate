const { body, query, param } = require('express-validator');
const authuserService = require('../services/authuser.service');


const check_param_id = [
	param("id")
		.isLength({ min: 24, max: 24}).withMessage('param id is wrong')
		.bail()
		.custom(async (value) => {
			try {
				if (await authuserService.isValidUser(value)) 
					return true; // indicates validation is success: the id is valid
				throw new Error('param id does not refer any user. (AuthUser not found)');
				
			} catch (error) {
				throw error;
			}
	}),
];

const check_body_refreshToken = [
	body('refreshToken')
      .notEmpty().withMessage('refresh token must not be empty')
];

const check_body_email = [
	body('email')
	  .trim()
	  //.normalizeEmail()
      .exists({checkFalsy: true}).withMessage('email must not be empty or falsy value')
	  .bail()
      .isEmail().withMessage('email must be in valid form')
	  .toLowerCase()
];

const check_body_password = [
	body('password')
		.exists({checkFalsy: true}).withMessage('password must not be empty or falsy value')
		.bail()
		.isLength({ min: 8 }).withMessage('password must be minimum 8 characters')
		.bail()
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W\_])[A-Za-z\d\W\_]{8,}$/)
		.withMessage('password must contain at least one uppercase, one lowercase, one number and one special char.')
		.escape()
	  	.trim(),
];

const check_body_passwordConfirmation = [
	body('passwordConfirmation').custom((value, { req }) => {
		if (value !== req.body.password) {
		  throw new Error('password confirmation does not match with the password');
		}
		return true; // Indicates the success
	}),
];

////////////////////////////////////////////////////////////////////////


const loginValidationRules = [
	...check_body_email,
	body('password')
		.exists({checkFalsy: true}).withMessage('password must not be empty or falsy value')
];



const signupValidationRules = [

    ...check_body_email,
	...check_body_password,
    ...check_body_passwordConfirmation,

    // check E-mail is already in use
    body('email').custom(async (value) => {
		try {
			if (await authuserService.isEmailTaken(value)) {
				throw new Error('email is already taken.');
			} else {
				return true;
			}

		} catch (error) {
			throw error;
		}
    }),
    
];



const logoutValidationRules = [
	...check_body_refreshToken,
];



const signoutValidationRules = [
	...check_body_refreshToken,
];



const refreshTokensValidationRules = [
	...check_body_refreshToken,
];



const changePasswordValidationRules = [
	body('currentPassword')
		.isLength({ min: 8 }).withMessage('current password must be minimum 8 characters'),
	...check_body_password,
	...check_body_passwordConfirmation,
];



const forgotPasswordValidationRules = [
	...check_body_email,
];



const resetPasswordValidationRules = [
	...check_body_password,

	query('token')
      .notEmpty().withMessage('reset password token must not be empty'),
];



const verifyEmailValidationRules = [
	query('token')
      .notEmpty().withMessage('email verification token must not be empty'),
];



const toggleValidationRules = [
	...check_param_id
];



const deleteValidationRules = [
	...check_param_id
];



module.exports = { 
	loginValidationRules, 
	signupValidationRules,
	logoutValidationRules,
	signoutValidationRules,
	refreshTokensValidationRules,
	changePasswordValidationRules,
	forgotPasswordValidationRules,
	resetPasswordValidationRules,
	verifyEmailValidationRules,
	toggleValidationRules,
	deleteValidationRules
};