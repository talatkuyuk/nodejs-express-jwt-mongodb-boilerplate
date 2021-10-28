const { body, param } = require('express-validator');
const { authuserService } = require('../services');


const check_param_id = [
	param("id")
		.isLength({ min: 24, max: 24 })
		.withMessage('The param id must be a 24-character number')
];


const check_body_email = [
	body('email')
	  .trim()
	  //.normalizeEmail()
      .exists({checkFalsy: true})
	  .withMessage('email must not be empty or falsy value')
	  .bail()
      .isEmail()
	  .withMessage('email must be in valid form')
	  .toLowerCase()
];


const check_body_email_isTaken = [
    body('email').custom(async (value) => {
		if (await authuserService.isEmailTaken(value)) {
			throw new Error('email is already taken');
		} else {
			return true;
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
		.withMessage('password must contain at least one uppercase, one lowercase, one number and one special char'),
];


const check_body_passwordConfirmation = [
	body('passwordConfirmation')
		.exists({checkFalsy: true}).withMessage('password confirmation must not be empty or falsy value')
		.bail()
		.custom((value, { req }) => {
			if (!Object.is(value, req.body.password)) {
				throw new Error('password confirmation does not match with the password');
			}
			return true; // Indicates the success
		}),
];


const check_body_url = [
	body('url')
		.notEmpty()
		.withMessage('You have to set callback URL')
		.isURL({require_tld: false}) // consider later on .isURL({ protocols: ['https'] })
		.withMessage('The callback URL must be valid URL')
];


module.exports = {
	check_param_id,
	check_body_email,
	check_body_email_isTaken,
	check_body_password,
	check_body_passwordConfirmation,
	check_body_url,
}