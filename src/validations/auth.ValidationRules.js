const { body, query } = require('express-validator');
const authuserService = require('../services/authuser.service');


const check_body_email = [
	body('email')
	  .trim()
	  //.normalizeEmail()
      .exists({checkFalsy: true}).withMessage('email must not be empty or falsy value')
	  .bail()
      .isEmail().withMessage('email must be in valid form')
	  .toLowerCase()
];

const check_body_email_custom_isTaken = [
	// check E-mail is already in use
    body('email').custom(async (value) => {
		try {
			if (await authuserService.utils.isEmailTaken(value)) {
				throw new Error('email is already taken.');
			} else {
				return true;
			}

		} catch (error) {
			throw error;
		}
    }),
];

const check_body_password = [
	body('password')
		.exists({checkFalsy: true}).withMessage('password must not be empty or falsy value')
		.bail()
		.isLength({ min: 8 }).withMessage('password must be minimum 8 characters')
		.bail()
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W\_])[A-Za-z\d\W\_]{8,}$/)
		.withMessage('password must contain at least one uppercase, one lowercase, one number and one special char.'),
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
	...check_body_email_custom_isTaken,
	...check_body_password,
    ...check_body_passwordConfirmation,
];



const logoutValidationRules = [
	body('refreshToken')
      .notEmpty().withMessage('refresh token must not be empty')
];



const signoutValidationRules = [
	body('refreshToken')
      .notEmpty().withMessage('refresh token must not be empty')
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

	query('token')
      .notEmpty().withMessage('reset password token must not be empty'),
];



const verifyEmailValidationRules = [
	query('token')
      .notEmpty().withMessage('email verification token must not be empty'),
];



module.exports = { 
	loginValidationRules, 
	signupValidationRules,
	logoutValidationRules,
	signoutValidationRules,
	refreshTokensValidationRules,
	forgotPasswordValidationRules,
	resetPasswordValidationRules,
	verifyEmailValidationRules
};


module.exports.commonRules = {
	check_body_email,
	check_body_email_custom_isTaken,
	check_body_password,
	check_body_passwordConfirmation
}