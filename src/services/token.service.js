const jwt = require('jsonwebtoken');
const moment = require('moment');
const crypto = require('crypto');
const httpStatus = require('http-status');

const config = require('../config');
const { getRedisClient } = require('../core/redis');

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
const generateToken = (userId, expires, type, jti = "n/a", userAgent = "n/a", notValidBefore = 0, secret = config.jwt.secret) => {
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

		// my decision: no need to check the useragent (ua) for refresh token since refresh token can lives during many days.

		const result = await tokenDbService.findToken({ token, type, user: payload.sub });

		// verifyToken method is used only by auth.service (logout, signout, verifyEmail, resetPassword)
		// No matter the token is blacklisted; signout and logout will be carried out, 
		// and the user's whole tokens or family refresh tokens will be removed from db.
		// Also, verifyEmail and resetPassword tokens are not blacklisted, logically. (only expires) 
		// For this reason, no need to throw an error or delete any token(s) here, if the result token is blacklisted.

		const tokenDoc = Token.fromDoc(result);

		if (!tokenDoc) throw new Error(`${type} token is not valid`);
		
		return tokenDoc;
		
	} catch (error) {

		// Even if some verification errors occurs for refresh token, it is okey here,
		// since refresh token verification is used by only signout and logout process.
		// my decision: if the refresh token is expired or used not before than, signout or logout process will proceed.
		if (type === tokenTypes.REFRESH && ["jwt not active", "jwt expired"].includes(error.message)) {
			const payload = jwt.decode(token, config.jwt.secret);
			const result = await tokenDbService.findToken({ token, type, user: payload.sub });
			const tokenDoc = Token.fromDoc(result);
			if (tokenDoc) return tokenDoc;
			throw new ApiError(httpStatus.UNAUTHORIZED, `${type} token is not valid`);
			
		} else {
			throw new ApiError(httpStatus.UNAUTHORIZED, error);
		}
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
			throw new ApiError(httpStatus.UNAUTHORIZED, `refresh token is not valid`);}


		// Step-2: control if that RT is blacklisted
		if (refreshTokenDoc.blacklisted) {
			console.log(`refreshTokenRotation: ${refreshTokenDoc.id} is in blacklisted`);

			// disable the refresh token family
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

			// Step-3a: if it is before than notValidBefore time,
			// Disable the refresh token family since someone else could use it
			await disableFamilyRefreshToken(refreshTokenDoc);

			throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized use of the refresh token has been detected. All credentials have been cancelled, you have to re-login to get authentication.");

		} else if (error.name === "TokenExpiredError") {
			console.log(`refreshTokenRotation: error.name is TokenExpiredError`);

			// Step-3b: if it is expired (means it is not blacklisted and it is the last issued RT)
			
			// Delete the refresh token family
			await removeTokens({ family: refreshTokenDoc.family });
			
			// No need to put the related access token into the cached blacklist.

			throw new ApiError(httpStatus.UNAUTHORIZED, `The refresh token is expired. You have to re-login to get authentication.`);

		} else {
			throw new ApiError(httpStatus.UNAUTHORIZED, error);
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

			// Delete the refresh token family
			await removeTokens({ family: refreshTokenDoc.family });
			
			// No need to put the related access token into the cached blacklist.

		// if there is not-blacklisted, means that the security isssue happens the first time 
		// and each refresh token should be blacklisted and so related access token should too.
		} else {
			for (tokenRecord of not_blacklisted_family_member_refresh_tokens) {
				console.log(`disableFamilyRefreshToken: in loop: ${tokenRecord._id}`);
	
				// Update each refresh token with the { blacklisted: true }
				await tokenDbService.updateToken(tokenRecord._id, { blacklisted: true });

				const redisClient = getRedisClient();
				if (redisClient) {
					// Get the related access token jti from refresh token
					const { jti } = jwt.decode(tokenRecord.token, config.jwt.secret);
		
					// put the related access token into the blacklist (key, timeout, value)
					await redisClient.setex(`blacklist_${jti}`, config.jwt.accessExpirationMinutes * 60, true)
						.then((result) => {console.log(`disableFamilyRefreshToken: redis ${result} for ${jti}`)})
						.catch((err) => {throw err});
				}
			}
		}

	} catch (error) {
		throw error;
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
};


/**
 * Generate access token
 * @param {string} userId
 * @returns {Promise<Object>}
 */
const generateAccessToken = (userId, userAgent, jti) => {
	const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  	const accessToken = generateToken(
		userId, 
		accessTokenExpires, 
		tokenTypes.ACCESS, 
		jti, 
		userAgent
	);
	return { accessToken, accessTokenExpires };
}


/**
 * Generate refresh token and save the token document to db
 * @param {string} userId
 * @returns {Promise<Object>}
 */
const generateRefreshToken = async (userId, userAgent, jti, family) => {
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
	
	await tokenDbService.saveToken(tokenDoc);

	return { refreshToken, refreshTokenExpires };
}


/**
 * Generate reset password token and save the token document to db
 * @param {string} userId
 * @returns {Promise<string>}
 */
const generateResetPasswordToken = async (userId) => {

  const expires = moment().add(config.jwt.resetPasswordExpirationMinutes, 'minutes');
  const resetPasswordToken = generateToken(userId, expires, tokenTypes.RESET_PASSWORD);

  const tokenDoc = new Token(
	resetPasswordToken,
	userId,
	expires.toDate(),
	tokenTypes.RESET_PASSWORD
  );

  await tokenDbService.saveToken(tokenDoc);
  
  return resetPasswordToken;
};


/**
 * Generate verify email token and save the token document to db
 * @param {string} userId
 * @returns {Promise<string>}
 */
const generateVerifyEmailToken = async (userId) => {

  const expires = moment().add(config.jwt.verifyEmailExpirationMinutes, 'minutes');
  const verifyEmailToken = generateToken(userId, expires, tokenTypes.VERIFY_EMAIL);

  const tokenDoc = new Token(
	verifyEmailToken,
	userId,
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
};
