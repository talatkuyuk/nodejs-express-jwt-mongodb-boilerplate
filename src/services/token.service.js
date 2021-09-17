const jwt = require('jsonwebtoken');
const moment = require('moment');
const crypto = require('crypto');
const httpStatus = require('http-status');

const config = require('../config');
const redisClient = require('../utils/cache').getRedisClient();

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
 * @param {string} jti
 * @param {string} userAgent
 * @param {Moment} notValidBefore
 * @param {string} [secret]
 * @returns {string}
 */
const generateToken = (userId, expires, type, jti, userAgent, notValidBefore, secret = config.jwt.secret) => {
  const now = moment().unix();
  const payload = {
    sub: userId,
    iat: now,
    exp: expires.unix(),
	jti,
	ua: userAgent ?? "n/a",
    type,
  };
  return jwt.sign(payload, secret, { notBefore: notValidBefore ?? 0});
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

		const result = await tokenDbService.findToken({ token, type, user: payload.sub, blacklisted: false });

		const tokenDoc = Token.fromDoc(result);

		if (!tokenDoc) throw new Error(`${type} token is not valid`);
		
		return tokenDoc;
		
	} catch (error) {
		throw error;
	}
};

/**
 * Establish RTR (Refresh Token Rotation) and return token doc (or throw an error if any security problem)
 * @param {string} token
 * @param {string} userAgent
 * @returns {Promise<Token>}
 */
 const refreshTokenRotation = async (refreshToken, userAgent) => {

	// Step-1: control if that RT (Refresh Token) is in DB
	// Step-2: control if that RT is blacklisted
	// Step-3: control if that RT is valid
	// Step-3a: if it is before than notValidBefore time
	// Step-3b: if it is expired
	// Step-4: control if it comes from different user agent

	console.log(`refreshTokenRotation: start`);

	let refreshTokenDoc = null;

	try {

		// Step-1: control if that RT is in DB
		const result = await tokenDbService.findToken({ token: refreshToken, type: tokenTypes.REFRESH });

		refreshTokenDoc = Token.fromDoc(result);
		if (!refreshTokenDoc) {
			throw new ApiError(httpStatus.UNAUTHORIZED, `The refresh token is not valid`);}


		// Step-2: control if that RT is blacklisted
		if (refreshTokenDoc.blacklisted) {
			console.log(`refreshTokenRotation: ${refreshTokenDoc.id} is in blacklisted`);

			await disableFamilyRefreshToken(refreshTokenDoc);

			throw new ApiError(httpStatus.UNAUTHORIZED, `Unauthorized use of the refresh token has been detected. All credentials have been cancelled, you have to re-login to get authentication.`);
		}


		// Step-3: control if that RT is valid
		const payload = jwt.verify(refreshToken, config.jwt.secret);
		console.log(payload);


		// Step-4: control if it comes from different user agent
		if (payload.ua !== userAgent) {
			console.log(`refreshTokenRotation: userAgent is checked and failed`);

			throw new ApiError(httpStatus.UNAUTHORIZED, `Your browser/agent seems changed or updated, you have to re-login to get authentication.`);
		}

		// okey then, start rotation, update the refresh token with the { blacklisted: true }
		await tokenDbService.updateToken(refreshTokenDoc.id, { blacklisted: true });
		
		return refreshTokenDoc;
		
	} catch (error) {
		console.log(`refreshTokenRotation: in catch error`);

		if (error.name === "NotBeforeError") {
			console.log(`refreshTokenRotation: error.name is NotBeforeError`);

			// Step-3a: if it is before than notValidBefore time
			await disableFamilyRefreshToken(refreshTokenDoc);

			throw new ApiError(httpStatus.UNAUTHORIZED, `Unauthorized use of the refresh token has been detected. All credentials have been cancelled, you have to re-login to get authentication.`);

		} else if (error.name === "TokenExpiredError") {
			console.log(`refreshTokenRotation: error.name is TokenExpiredError`);

			// Step-3b: if it is expired (means it is not blacklisted and it is the last issued RT)
			deleteFamilyRefreshToken(refreshTokenDoc);

			throw new ApiError(httpStatus.UNAUTHORIZED, `The refresh token is expired. You have to re-login to get authentication.`);

		} else if (error.name === "JsonWebTokenError") {
			console.log(`refreshTokenRotation: error.name is JsonWebTokenError`);

			throw new ApiError(httpStatus.UNAUTHORIZED, `${error.name??'Error'}: ${error.message}`);

		} else {
			console.log(`refreshTokenRotation: error is something else`);

			throw new ApiError(httpStatus.UNAUTHORIZED, `${error.name??'xError'}: ${error.message}`);
		}
	}
};

/**
 * Disable the family of the RT [security problem in RTR (Refresh Token Rotation)] and throw an error 
 * @param {Token} refreshTokenDoc
 * @returns {Promise<void>}
 */
const disableFamilyRefreshToken = async (refreshTokenDoc) => {

	try {
		console.log(`disableFamilyRefreshToken: ${refreshTokenDoc.id} family: ${refreshTokenDoc.family}`);

		// Get refresh token descandents not in the blacklist
		const not_blacklisted_family_member_refresh_tokens = await tokenDbService.findTokens({ 
			family: refreshTokenDoc.family, 
			blacklisted: false 
		});

		const size = not_blacklisted_family_member_refresh_tokens?.length ?? 0;
		console.log(`disableFamilyRefreshToken: not-blacklisted-family-size: ${size}`);

		// if no not-blacklisted, means that whole family was disabled before, 
		// and now, whole family should be deleted
		if (size === 0) {
			await deleteFamilyRefreshToken(refreshTokenDoc);

		// if there is not-blacklisted, means that the security isssue happens the first time 
		// and each refresh token should be blacklisted and so related access token should too.
		} else {
			for (tokenRecord of not_blacklisted_family_member_refresh_tokens) {
				console.log(`disableFamilyRefreshToken: in loop: ${tokenRecord._id}`);
	
				// Update each refresh token with the { blacklisted: true }
				await tokenDbService.updateToken(tokenRecord._id, { blacklisted: true });
			
				// Get the related access token jti from refresh token
				const { jti } = jwt.decode(tokenRecord.token, config.jwt.secret);
	
				// put the related access token into the blacklist (key, timeout, value)
				await redisClient.setex(`blacklist_${jti}`, config.jwt.accessExpirationMinutes * 60, true)
					.then((result) => {console.log(`disableFamilyRefreshToken: redis ${result} for ${jti}`)})
					.catch((err) => {throw err});
			}
		}

	} catch (error) {
		throw error;
	}
}


/**
 * Delete the family of the RT and throw an error 
 * @param {Token} refreshTokenDoc
 * @returns {Promise<void>}
 */
 const deleteFamilyRefreshToken = async (refreshTokenDoc) => {

	console.log(`deleteFamilyRefreshToken: ${refreshTokenDoc.id} family: ${refreshTokenDoc.family}`);

	// Delete the refresh token family
	await tokenDbService.removeTokens({ family: refreshTokenDoc.family });
	
	// No need to put the related access token into the cached blacklist.
}


/**
 * Generate auth tokens
 * @param {AuthUser} user
 * @param {string} userAgent
 * @param {string} family
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (user, userAgent, family) => {

  // we will give the same jti to both to make connection between
  const jti = crypto.randomBytes(16).toString('hex');

  const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  const accessToken = generateToken(user.id, accessTokenExpires, tokenTypes.ACCESS, jti, userAgent);

  // not valid before is 60
  const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
  const refreshToken = generateToken(user.id, refreshTokenExpires, tokenTypes.REFRESH, jti, userAgent, config.jwt.accessExpirationMinutes * 60);

  const tokenDoc = new Token(
	refreshToken,
	user.id,
	refreshTokenExpires.toDate(),
	tokenTypes.REFRESH,
	(family ?? `${user.id}-${jti}`)
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

  const jti = crypto.randomBytes(16).toString('hex');

  const expires = moment().add(config.jwt.resetPasswordExpirationMinutes, 'minutes');
  const resetPasswordToken = generateToken(user.id, expires, tokenTypes.RESET_PASSWORD, jti);

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

  const jti = crypto.randomBytes(16).toString('hex');

  const expires = moment().add(config.jwt.verifyEmailExpirationMinutes, 'minutes');
  const verifyEmailToken = generateToken(user.id, expires, tokenTypes.VERIFY_EMAIL, jti);

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
	const {isDeleted, deletedCount} = await tokenDbService.removeTokens(query);
	
	isDeleted ? console.log(`${deletedCount} token(s) deleted.`) 
			  : console.log("No token is deleted.");
}


module.exports = {
  verifyToken,
  refreshTokenRotation,
  generateAuthTokens,
  generateResetPasswordToken,
  generateVerifyEmailToken,
  removeToken,
  removeTokens
};
