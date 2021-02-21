const { body } = require('express-validator')

const loginValidationRules = () => {
  return [
    // username must be an email
    body('username', 'username must be an email').isEmail(),

    // password must be at least 5 chars long
    body('password', 'password must be minimum 5 characters').isLength({ min: 5 }),
  ]
}

const signupValidationRules = () => {
  return [
    // username must not be empty and must be an email
    body('username')
      .notEmpty().withMessage('username must not be empty')
      .isEmail().withMessage('username must be an email'),

    // password must be at least 5 chars long
    body('password').isLength({ min: 5 }),

    // passwordConfirmation must matched with password
    body('passwordConfirmation').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
  
      // Indicates the success of this synchronous custom validator
      return true;
    }),

    // check E-mail already in use
    body('email').custom(value => {
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
  ]
}

module.exports = { loginValidationRules, signupValidationRules };