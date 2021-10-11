const jwt = require('jsonwebtoken');
const moment = require('moment');
const crypto = require('crypto');
const httpStatus = require('http-status');

const config = require('../config');

const { ApiError, locateError } = require('../utils/ApiError');
const { Token } = require('../models');
const { tokenTypes } = require('../config/tokens');

const tokenDbService = require('./token.db.service');
const redisService = require('./redis.service');


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
const generateToken = (userId, expires, type, jti = "n/a", userAgent = "n/a", notValidBefore = 0, secret = config.jwt.secret) => {
	try {
		const now = moment().unix();
		const payload = {
			sub: userId,
			iat: now,
			exp: expires.unix(),
			jti,
			ua: userAgent,
			type,
		};
		return jwt.sign(payload, secret, { notBefore: notValidBefore });

	} catch (error) {
		throw locateError(error, "TokenService : generateToken");
	}
};


/**
 * Verify token and return token document (or throw an error if it is not valid)
 * is used only by auth.service (verifyEmail, resetPassword)
 * @param {string} token
 * @param {string} type
 * @returns {Promise<Token>}
 */
const verifyToken = async (token, type) => {
	try {
		const payload = jwt.verify(token, config.jwt.secret);

		const tokenDoc = await tokenDbService.getToken({ token, type, user: payload.sub });

		if (!tokenDoc)
			throw new ApiError(httpStatus.UNAUTHORIZED, `${type} token is not valid`);

		if (tokenDoc.blacklisted)
			throw new ApiError(httpStatus.UNAUTHORIZED, `${type} token is in the blacklist`);

		return tokenDoc;

	} catch (error) {
		throw locateError(error, "TokenService : verifyToken");
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

	// reachable from both try-catch blocks
	let refreshTokenDoc = null;

	try {

		// Step-1: control if that RT is in DB
		refreshTokenDoc = await tokenDbService.getToken({ token: refreshToken, type: tokenTypes.REFRESH });

		if (!refreshTokenDoc)
			throw new ApiError(httpStatus.UNAUTHORIZED, "refresh token is not valid");


		// Step-2: control if that RT is blacklisted
		if (refreshTokenDoc.blacklisted) {
			console.log(`refreshTokenRotation: ${refreshTokenDoc.id} is in blacklisted`);

			// disable the refresh token family
			await disableFamilyRefreshToken(refreshTokenDoc);

			throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized usage of refresh token has been detected.");
		}


		// Step-3: control if that RT is valid
		const payload = jwt.verify(refreshToken, config.jwt.secret);
		console.log(payload);


		// Step-4: control if it comes from different user agent
		if (payload.ua !== userAgent) {
			console.log(`refreshTokenRotation: userAgent is checked and failed`);

			throw new ApiError(httpStatus.UNAUTHORIZED, `Your browser/agent seems changed or updated, you have to re-login to get authentication.`);
		}

		// okey then, success refresh token rotation happened; update the refresh token with the { blacklisted: true }
		await tokenDbService.updateToken(refreshTokenDoc.id, { blacklisted: true });
		
		return refreshTokenDoc;
		
	} catch (error) {
		console.log(`refreshTokenRotation: in catch error`);

		if (error.name === "NotBeforeError") {
			console.log(`refreshTokenRotation: error.name is NotBeforeError`);

			// Step-3a: if it is before than notValidBefore time,
			// Disable the refresh token family since someone else could use it
			await disableFamilyRefreshToken(refreshTokenDoc);

			error = new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized usage of refresh token has been detected.");
		} 
		
		if (error.name === "TokenExpiredError") {
			console.log(`refreshTokenRotation: error.name is TokenExpiredError`);

			// Step-3b: if it is expired (means it is not blacklisted and it is the last issued RT)
			
			// Delete the refresh token family
			await removeTokens({ family: refreshTokenDoc.family });
			
			// No need to put the related access token into the cached blacklist.

			error = new ApiError(httpStatus.UNAUTHORIZED, `The refresh token is expired. You have to re-login to get authentication.`);
		}

		throw locateError(error, "TokenService : refreshTokenRotation");
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
		const not_blacklisted_family_member_refresh_tokens = await tokenDbService.getTokens({ 
			family: refreshTokenDoc.family, 
			blacklisted: false 
		});

		const size = not_blacklisted_family_member_refresh_tokens?.length ?? 0;
		console.log(`disableFamilyRefreshToken: not-blacklisted-family-size: ${size}`);

		// if no not-blacklisted, means that whole family was disabled before, 
		// and now, whole family should be deleted because the second bad usage happens
		if (size === 0) {

			// Delete the refresh token family
			await removeTokens({ family: refreshTokenDoc.family });
			
			// No need to put the related access token into the cached blacklist, since it was done before

		// if there is not-blacklisted, means that the security isssue happens the first time 
		// and each refresh token should be blacklisted and so related access token should too.
		} else {
			for (tokenRecord of not_blacklisted_family_member_refresh_tokens) {
				console.log(`disableFamilyRefreshToken: in loop: ${tokenRecord._id}`);
	
				// Update each refresh token with the { blacklisted: true }
				await tokenDbService.updateToken(tokenRecord._id, { blacklisted: true });

				// put the related access token's jti into the blacklist
				await redisService.put_jti_into_blacklist(tokenRecord.jti);
			}
		}

	} catch (error) {
		throw locateError(error, "TokenService : disableFamilyRefreshToken");
	}
}


/**
 * Generate auth tokens
 * @param {string} userId
 * @param {string} userAgent
 * @param {string} family
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (userId, userAgent, family) => {
	try {
		// we will give the same jti to both (access & refresh) to make connection between
		const jti = crypto.randomBytes(16).toString('hex');

		const { accessToken, accessTokenExpires } = generateAccessToken(userId, userAgent, jti);

		const { refreshToken, refreshTokenExpires } = await generateRefreshToken(userId, userAgent, jti, family);

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

	} catch (error) {
		throw locateError(error, "TokenService : generateAuthTokens");
	}
};


/**
 * Generate access token
 * @param {string} userId
 * @returns {Promise<Object>}
 */
const generateAccessToken = (userId, userAgent, jti) => {
	try {
		const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
		const accessToken = generateToken(
			userId, 
			accessTokenExpires, 
			tokenTypes.ACCESS, 
			jti, 
			userAgent
		);
		return { accessToken, accessTokenExpires };

	} catch (error) {
		throw locateError(error, "TokenService : generateAccessToken");
	}
}


/**
 * Generate refresh token and save the token document to db
 * @param {string} userId
 * @returns {Promise<Object>}
 */
const generateRefreshToken = async (userId, userAgent, jti, family) => {
	try {
		const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
		const refreshToken = generateToken(
			userId, 
			refreshTokenExpires, 
			tokenTypes.REFRESH, 
			jti, 
			userAgent, 
			config.jwt.accessExpirationMinutes * 60,  // not valid before is 60
		);

		const tokenDoc = new Token(
			refreshToken,
			userId,
			refreshTokenExpires.toDate(),
			tokenTypes.REFRESH,
			jti,
			(family ?? `${userId}-${jti}`)
		);
		
		await tokenDbService.addToken(tokenDoc);

		return { refreshToken, refreshTokenExpires };

	} catch (error) {
		throw locateError(error, "TokenService : generateRefreshToken");
	}
}


/**
 * Generate reset password token and save the token document to db
 * @param {string} userId
 * @returns {Promise<string>}
 */
const generateResetPasswordToken = async (userId) => {
	try {
		const expires = moment().add(config.jwt.resetPasswordExpirationMinutes, 'minutes');
		const resetPasswordToken = generateToken(userId, expires, tokenTypes.RESET_PASSWORD);

		const tokenDoc = new Token(
			resetPasswordToken,
			userId,
			expires.toDate(),
			tokenTypes.RESET_PASSWORD
		);

		await tokenDbService.addToken(tokenDoc);
		
		return resetPasswordToken;

	} catch (error) {
		throw locateError(error, "TokenService : generateResetPasswordToken");
	}
};


/**
 * Generate verify email token and save the token document to db
 * @param {string} userId
 * @returns {Promise<string>}
 */
const generateVerifyEmailToken = async (userId) => {
	try {
		const expires = moment().add(config.jwt.verifyEmailExpirationMinutes, 'minutes');
		const verifyEmailToken = generateToken(userId, expires, tokenTypes.VERIFY_EMAIL);

		const tokenDoc = new Token(
			verifyEmailToken,
			userId,
			expires.toDate(),
			tokenTypes.VERIFY_EMAIL
		);

		await tokenDbService.addToken(tokenDoc);

		return verifyEmailToken;

	} catch (error) {
		throw locateError(error, "TokenService : generateVerifyEmailToken");
	}
};


/**
 * Remove the token with the id and issue report
 * @param {string} id
 * @returns {Promise}
 */
const removeToken = async (id) => {
	try {
		const {isDeleted, deletedCount} = await tokenDbService.deleteToken(id);

		isDeleted ? console.log(`${deletedCount} token deleted.`) 
				  : console.log("No token is deleted.");

	} catch (error) {
		throw locateError(error, "TokenService : removeToken");
	}
}


/**
 * Remove tokens that queried and issue report
 * @param {Object} query
 * @returns {Promise}
 */
const removeTokens = async (query) => {
	try {
		const {isDeleted, deletedCount} = await tokenDbService.deleteTokens(query);
	
		isDeleted ? console.log(`${deletedCount} token(s) deleted.`) 
				  : console.log("No token deleted.");

	} catch (error) {
		throw locateError(error, "TokenService : removeTokens");
	}
}


/**
 * Find the token and remove family's token or user's tokens according to command option
 * @param {Object} query
 * @param {string} command
 * @returns {Promise}
 */
const findTokenAndRemoveFamily = async (query, command) => {
	try {
		const tokenDoc = await tokenDbService.getToken(query);

		// normally a refresh token can be deleted in only refresh token rotation, 
		// any bad usage of refresh token can cause it be deleted
		// TODO: make an analyze here how this situation happen
		if (!tokenDoc)
			throw new ApiError(httpStatus.UNAUTHORIZED, "refresh token is not valid");

		// normally a refresh token can be blacklisted in only refresh token rotation, 
		// during the refresh token rotation, access token that paired with refresh token is also blacklisted in cache
		// So, the user who requests the logout can not reach here, but wait !!!
		// what if the redis down during refresh token rotation that causes the refresh token jti is not blacklisted
		// TODO: make a decision here: continue the process and get the user logged out or raise an error
		if (tokenDoc.blacklisted)
			throw new ApiError(httpStatus.UNAUTHORIZED, "refresh token is in the blacklist");

		if (command === "family") 
			await removeTokens({ family: tokenDoc.family });
		
		if (command === "user") 
			await removeTokens({ user: tokenDoc.user });

	} catch (error) {
		throw locateError(error, "TokenService : findTokenAndRemoveFamily");
	}
}


module.exports = {
	generateToken,
	verifyToken,
	refreshTokenRotation,
	generateAuthTokens,
	generateAccessToken,
	generateRefreshToken,
	generateResetPasswordToken,
	generateVerifyEmailToken,
	removeToken,
	removeTokens,
	findTokenAndRemoveFamily,
};
