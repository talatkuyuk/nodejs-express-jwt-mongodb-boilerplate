const { body, query } = require("express-validator");
const {
  check_param_id,
  check_param_id_custom,
  check_body_email,
  check_body_email_isTaken,
  check_body_password,
  check_body_passwordConfirmation,
} = require("./common.ValidationRules");

////////////////////////////////////////////////////////////////////////

/** @type {import('express-validator').CustomValidator} */
const once = (value) => {
  if (typeof value === "object")
    throw new Error("The parameter can only appear once in the query string");
  return true;
};

const getAuthUsers = [
  query("email").custom(once).trim().toLowerCase().optional(),

  query("isDisabled")
    .custom(once)
    .trim()
    .toLowerCase()
    .isBoolean()
    .withMessage("The query param 'isDisabled' must be boolean value")
    .optional(),

  query("isEmailVerified")
    .custom(once)
    .trim()
    .toLowerCase()
    .isBoolean()
    .withMessage("The query param 'isEmailVerified' must be boolean value")
    .optional(),

  query("page")
    .custom(once)
    .trim()
    .isNumeric()
    .withMessage("The query param 'page' must be numeric value")
    .optional(),

  query("size")
    .custom(once)
    .trim()
    .isNumeric()
    .withMessage("The query param 'size' must be numeric value")
    .bail()
    .isInt({ min: 1, max: 50 })
    .withMessage("The query param 'size' can be between 1-50")
    .optional(),

  query("sort")
    .custom(once)
    .trim()
    .matches(/^[a-zA-Z/./|\s]+$/i)
    .withMessage("The query param 'sort' can contains a-zA-Z letters . dot and | pipedelimeter")
    .optional(),
];

const getAuthUser = [...check_param_id_custom];

const addAuthUser = [
  ...check_body_email,
  ...check_body_email_isTaken,
  ...check_body_password,
  ...check_body_passwordConfirmation,

  body()
    .custom((_body, { req }) => {
      const validKeys = ["email", "password", "passwordConfirmation"];
      return Object.keys(req.body).every((key) => validKeys.includes(key));
    })
    .withMessage("Any extra parameter is not allowed"),
];

const changePassword = [
  ...check_body_password,
  ...check_body_passwordConfirmation,

  body("currentPassword")
    .exists({ checkFalsy: true })
    .withMessage("must not be empty")
    .bail()
    .custom(async (value, { req }) => {
      try {
        if (await req.authuser.isPasswordMatch(value)) return true; // indicates validation is success: the id is valid
        throw new Error("incorrect current password");
      } catch (error) {
        throw error;
      }
    }),
];

const toggleAbility = [...check_param_id];

const toggleVerification = [...check_param_id];

const unlinkProvider = [
  ...check_param_id,

  query("provider")
    .notEmpty()
    .withMessage("query param 'provider' is missing")
    .bail()
    .isIn(["emailpassword", "google", "facebook"])
    .withMessage("The query param 'provider' should be an auth provider"),
];

const deleteAuthUser = [...check_param_id];

module.exports = {
  addAuthUser,
  getAuthUser,
  getAuthUsers,
  changePassword,
  toggleAbility,
  toggleVerification,
  unlinkProvider,
  deleteAuthUser,
};
