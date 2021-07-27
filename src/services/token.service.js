const jwt = require('jsonwebtoken');
const moment = require('moment');
const crypto = require('crypto');
const httpStatus = require('http-status');

const config = require('../config');
const ApiError = require('../utils/ApiError');
const { Token } = require('../models');
const { tokenTypes } = require('../config/tokens');

const tokenDbService = require('./token.db.service');


// TOKEN MECHANIZM
// When log in, send 2 tokens (Access token, Refresh token) in response to the client.
// The Access Token will have less expiry time and Refresh Token will have long expiry time.
// The client (Front end) will store Access Token in cookies.
// The client (Front end) will store Refresh Token in his local storage.
// The client will use an access token for calling APIs. But when it expires, pick the refresh token from local storage and call auth server API to get the new token.
// Auth server will have an API exposed which will accept refresh token and checks for its validity and return a new access token.
// Once the refresh token is expired, the User will be logged out.

/**
 * Generate token
 * @param {ObjectId} userId
 * @param {Moment} expires
 * @param {tokenTypes} type
 * @param {string} userAgent
 * @param {string} [secret]
 * @returns {string}
 */
const generateToken = (userId, expires, type, userAgent = "n/a", secret = config.jwt.secret) => {
  const payload = {
    sub: userId,
    iat: moment().unix(),
    exp: expires.unix(),
	jti: crypto.randomBytes(16).toString('hex'),
	ua: userAgent,
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
const verifyToken = async (token, type, userAgent = "n/a") => {
	try {
		const payload = jwt.verify(token, config.jwt.secret);

		if (type === tokenTypes.REFRESH) {
			// control if the refresh token request is coming from the same useragent - for preventing mitm
			if (userAgent !== payload.ua) {
				throw new ApiError(httpStatus.UNAUTHORIZED, `Your browser/agent seems changed or updated, you have to re-login to get authentication.`);
			}
		}

		const result = await tokenDbService.findToken({ token, type, user: payload.sub, blacklisted: false });

		const tokenDoc = Token.fromDoc(result);

		if (!tokenDoc) throw new Error(`${type} token is not valid`);
		
		return tokenDoc;
		
	} catch (error) {
		throw error;
	}
};


/**
 * Generate auth tokens
 * @param {AuthUser} user
 * @param {string} userAgent
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (user, userAgent) => {
  const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  const accessToken = generateToken(user.id, accessTokenExpires, tokenTypes.ACCESS, userAgent);

  const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
  const refreshToken = generateToken(user.id, refreshTokenExpires, tokenTypes.REFRESH, userAgent);

  const tokenDoc = new Token(
	refreshToken,
	user.id,
	refreshTokenExpires.toDate(),
	tokenTypes.REFRESH
  );
  
  await tokenDbService.saveToken(tokenDoc);

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

  const tokenDoc = new Token(
	resetPasswordToken,
	user.id,
	expires.toDate(),
	tokenTypes.RESET_PASSWORD
  );

  await tokenDbService.saveToken(tokenDoc);
  
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

  const tokenDoc = new Token(
	verifyEmailToken,
	user.id,
	expires.toDate(),
	tokenTypes.VERIFY_EMAIL
  );

  await tokenDbService.saveToken(tokenDoc);

  return verifyEmailToken;
};


const removeToken = async (id) => {
	const {isDeleted, deletedCount} = await tokenDbService.removeToken(id);

	isDeleted ? console.log(`${deletedCount} token deleted.`) 
			  : console.log("No token is deleted.");
}

const removeTokens = async (query) => {
	const isDeleted = tokenDbService.removeTokens(query);
	
	isDeleted ? console.log(`${deletedCount} token(s) deleted.`) 
			  : console.log("No token is deleted.");
}


module.exports = {
  verifyToken,
  generateAuthTokens,
  generateResetPasswordToken,
  generateVerifyEmailToken,
  removeToken,
  removeTokens
};
