const jwt = require('jsonwebtoken');
const moment = require('moment');
const httpStatus = require('http-status');
const ObjectId = require('mongodb').ObjectId;

const config = require('../config');
const mongodb = require('../core/mongodb');
const authuserService = require('./authuser.service');
const { Token } = require('../models');
const ApiError = require('../utils/ApiError');
const { tokenTypes } = require('../config/tokens');


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
 * Save a token
 * @param {string} token
 * @param {ObjectId} userId
 * @param {Moment} expires
 * @param {string} type
 * @param {boolean} [blacklisted]
 * @returns {Promise<Token>}
 */
const saveToken = async (token, userId, expires, type, blacklisted = false) => {
	try {
		const tokenDoc = new Token(
			token,
			userId,
			expires.toDate(),
			type,
			blacklisted,
		);
	
		const db = mongodb.getDatabase();
		await db.collection("tokens").insertOne(tokenDoc);
		return tokenDoc;
		
	} catch (error) {
		throw error;
	}
};


const findToken = async (query) => {
	try {
		const db = mongodb.getDatabase();
		return await db.collection("tokens").findOne(query);

	} catch (error) {
		throw error;
	}
	
}

const removeToken = async (id) => {
	try {
		const db = mongodb.getDatabase();
		return await db.collection("tokens").deleteOne({_id: id});
		
	} catch (error) {
		throw error;
	}
}

const removeTokens = async (query) => {
	try {
		const db = mongodb.getDatabase();
		return await db.collection("tokens").deleteMany(query);
		
	} catch (error) {
		throw error;
	}
}

/**
 * Verify token and return token doc (or throw an error if it is not valid)
 * @param {string} token
 * @param {string} type
 * @returns {Promise<Token>}
 */
const verifyToken = async (token, type) => {
	try {
		const payload = jwt.verify(token, config.jwt.secret);
		const tokenDoc = await findToken({ token, type, user: ObjectId(payload.sub), blacklisted: false });
		if (!tokenDoc) throw new Error('Token not found');
		
		return tokenDoc;
		
	} catch (error) {
		throw error;
	}
};

/**
 * Generate auth tokens
 * @param {User} user
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (user) => {
  const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  const accessToken = generateToken(user.id, accessTokenExpires, tokenTypes.ACCESS);

  const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
  const refreshToken = generateToken(user.id, refreshTokenExpires, tokenTypes.REFRESH);
  
  await saveToken(refreshToken, user.id, refreshTokenExpires, tokenTypes.REFRESH);

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
 * @param {string} email
 * @returns {Promise<string>}
 */
const generateResetPasswordToken = async (email) => {
  const user = await authuserService.getUserByEmail(email);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No users found with this email');
  }
  const expires = moment().add(config.jwt.resetPasswordExpirationMinutes, 'minutes');
  const resetPasswordToken = generateToken(user.id, expires, tokenTypes.RESET_PASSWORD);
  await saveToken(resetPasswordToken, user.id, expires, tokenTypes.RESET_PASSWORD);
  return resetPasswordToken;
};

/**
 * Generate verify email token
 * @param {string} email
 * @returns {Promise<string>}
 */
const generateVerifyEmailToken = async (user) => {
  const expires = moment().add(config.jwt.verifyEmailExpirationMinutes, 'minutes');
  const verifyEmailToken = generateToken(user.id, expires, tokenTypes.VERIFY_EMAIL);
  await saveToken(verifyEmailToken, user.id, expires, tokenTypes.VERIFY_EMAIL);
  return verifyEmailToken;
};

module.exports = {
  verifyToken,
  removeToken,
  removeTokens,
  generateAuthTokens,
  generateResetPasswordToken,
  generateVerifyEmailToken,
};
