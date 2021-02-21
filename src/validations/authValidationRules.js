const { body } = require('express-validator')

const loginValidationRules = [

  body('username', 'username must be an email').isEmail(),

  body('password', 'password must be minimum 5 characters').isLength({ min: 5 }),

];


const signupValidationRules = [

    body('username')
      .notEmpty().withMessage('username must not be empty')
      .isEmail().withMessage('username must be an email'),

    body('password').isLength({ min: 5 }),

    // passwordConfirmation must matched with password
    body('passwordConfirmation').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true; // Indicates the success
    }),

    // check E-mail already in use
    body('email').custom( (value) => {
      try {
        return User.findUserByEmail(value).then(user => {
          if (user) {
            return Promise.reject('E-mail already in use');
          }
        });
      } catch (error) {
        // TODO: handle MongoDB errors
        throw new Error(`Database Error ( ${error} )`);
      }
    }),
    
];


module.exports = { loginValidationRules, signupValidationRules };