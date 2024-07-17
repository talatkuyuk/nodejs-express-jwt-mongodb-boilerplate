const { body, query } = require("express-validator");
const {
  check_body_email,
  check_body_password,
  check_body_passwordConfirmation,
} = require("./common.ValidationRules");

const loginValidationRules = [
  ...check_body_email,

  body("password").exists({ checkFalsy: true }).withMessage("must not be empty"),

  body()
    .custom((_body, { req }) => {
      const validKeys = ["email", "password"];
      return Object.keys(req.body).every((key) => validKeys.includes(key));
    })
    .withMessage("Any extra parameter is not allowed"),
];

const signupValidationRules = [
  ...check_body_email,
  // ...check_body_email_isTaken, // cancelled and this control is moved to the auth service
  ...check_body_password,
  ...check_body_passwordConfirmation,

  body()
    .custom((_body, { req }) => {
      const validKeys = ["email", "password", "passwordConfirmation"];
      return Object.keys(req.body).every((key) => validKeys.includes(key));
    })
    .withMessage("Any extra parameter is not allowed"),
];

const refreshTokensValidationRules = [
  body("refreshToken").notEmpty().withMessage("refresh token must not be empty"),
];

const forgotPasswordValidationRules = [...check_body_email];

const resetPasswordValidationRules = [
  ...check_body_password,
  ...check_body_passwordConfirmation,

  body("token").notEmpty().withMessage("token is missing"),
];

const verifyEmailValidationRules = [body("token").notEmpty().withMessage("token is missing")];

const googleValidationRules = [
  query("method")
    .notEmpty()
    .withMessage("query param 'method' is missing")
    .bail()
    .isIn(["token", "code"])
    .withMessage("The query param 'method' could be only 'token' or 'code'"),
];

const verifySignupValidationRules = [body("token").notEmpty().withMessage("token is missing")];

const unlinkProviderValidationRules = [
  query("provider")
    .notEmpty()
    .withMessage("query param 'provider' is missing")
    .bail()
    .isIn(["emailpassword", "google", "facebook"])
    .withMessage("The query param 'provider' should be an auth provider"),
];

module.exports = {
  loginValidationRules,
  signupValidationRules,
  refreshTokensValidationRules,
  forgotPasswordValidationRules,
  resetPasswordValidationRules,
  verifyEmailValidationRules,
  googleValidationRules,
  verifySignupValidationRules,
  unlinkProviderValidationRules,
};
