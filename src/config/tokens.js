/**
 * @typedef {Object} TokenTypes
 * @property {"access"} ACCESS
 * @property {"refresh"} REFRESH
 * @property {"reset-password"} RESET_PASSWORD
 * @property {"verify-email"} VERIFY_EMAIL
 * @property {"verify-signup"} VERIFY_SIGNUP
 *
 * @typedef {TokenTypes[keyof TokenTypes]} TokenType
 */

/** @type {TokenTypes} */
const tokenTypes = {
  ACCESS: "access",
  REFRESH: "refresh",
  RESET_PASSWORD: "reset-password",
  VERIFY_EMAIL: "verify-email",
  VERIFY_SIGNUP: "verify-signup",
};

module.exports = {
  tokenTypes,
};
