const jwt = require('jsonwebtoken');
const moment = require('moment');

const config = require('../config');
const { Token } = require('../models');
const { tokenTypes } = require('../config/tokens');

const tokenDbService = require('./token.db.service');


// When you do log in, send 2 tokens (Access token, Refresh token) in response to the client.
// The access token will have less expiry time and Refresh will have long expiry time.
// The client (Front end) will store access token in cookies.
// The client (Front end) will store refresh token in his local storage.
// The client will use an access token for calling APIs. But when it expires, pick the refresh token from local storage and call auth server API to get the new token.
// Your auth server will have an API exposed which will accept refresh token and checks for its validity and return a new access token.
// Once the refresh token is expired, the User will be logged out.

/**
 * Generate token
 * @param {ObjectId} userId
 * @param {Moment} expires
 * @param {string} [secret]
 * @returns {string}
 */
const generateToken = (userId, expires, type, secret = config.jwt.secret) => {
  const payload = {
    sub: userId,
    iat: moment().unix(),
    exp: expires.unix(),
    type,
  };
  return jwt.sign(payload, secret);
};


/**
 * Verify token and return token doc (or throw an error if it is not valid)
 * @param {string} token
 * @param {string} type
 * @returns {Promise<Token>}
 */
const verifyToken = async (token, type) => {
	try {
		const payload = jwt.verify(token, config.jwt.secret);

		const tokenDoc = await tokenDbService.findToken({ token, type, user: payload.sub, blacklisted: false });

		if (!tokenDoc) throw new Error(`${type} token is not valid`);
		
		return tokenDoc;
		
	} catch (error) {
		throw error;
	}
};


/**
 * Generate auth tokens
 * @param {AuthUser} user
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (user) => {
  const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  const accessToken = generateToken(user.id, accessTokenExpires, tokenTypes.ACCESS);

  const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
  const refreshToken = generateToken(user.id, refreshTokenExpires, tokenTypes.REFRESH);
  
  await tokenDbService.saveToken(refreshToken, user.id, refreshTokenExpires, tokenTypes.REFRESH);

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate(),
    },
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires.toDate(),
    },
  };
};


/**
 * Generate reset password token
 * @param {AuthUser} user
 * @returns {Promise<string>}
 */
const generateResetPasswordToken = async (user) => {
  const expires = moment().add(config.jwt.resetPasswordExpirationMinutes, 'minutes');
  const resetPasswordToken = generateToken(user.id, expires, tokenTypes.RESET_PASSWORD);

  await tokenDbService.saveToken(resetPasswordToken, user.id, expires, tokenTypes.RESET_PASSWORD);
  
  return resetPasswordToken;
};


/**
 * Generate verify email token
 * @param {AuthUser} user
 * @returns {Promise<string>}
 */
const generateVerifyEmailToken = async (user) => {
  const expires = moment().add(config.jwt.verifyEmailExpirationMinutes, 'minutes');
  const verifyEmailToken = generateToken(user.id, expires, tokenTypes.VERIFY_EMAIL);

  await tokenDbService.saveToken(verifyEmailToken, user.id, expires, tokenTypes.VERIFY_EMAIL);

  return verifyEmailToken;
};


const removeToken = async (id) => tokenDbService.removeToken(id);

const removeTokens = async (query) => tokenDbService.removeTokens(query);


module.exports = {
  verifyToken,
  generateAuthTokens,
  generateResetPasswordToken,
  generateVerifyEmailToken,
  removeToken,
  removeTokens
};
