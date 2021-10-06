const httpStatus = require('http-status');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const ApiError = require('../utils/ApiError');
const config = require('../config');
const { getRedisClient } = require('../core/redis');


//for database operations for authusers
const authuserDbService = require('./authuser.db.service');
const { AuthUser } = require('../models');

//for verifying and removing token(s)
const tokenService = require('./token.service'); 
const { tokenTypes } = require('../config/tokens');



/**
 * Signup with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<AuthUser>}
 */
const signupWithEmailAndPassword = async (email, password) => {
	try {

		const hashedPassword = await bcrypt.hash(password, 8);
		const authuserx = new AuthUser(email, hashedPassword);
		authuserx.services = { emailpassword: "registered" };

		return await authuserDbService.createAuthUser(authuserx);

	} catch (error) {
		throw error;
	}
}
 			


/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<AuthUser>}
 */
const loginWithEmailAndPassword = async (email, password) => {

	const authuser = await authuserDbService.getAuthUser({ email });

	if (!authuser) {
		throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not registered user');
	}

	if (authuser.isDisabled) {
		throw new ApiError(httpStatus.FORBIDDEN, `You are disabled, call the system administrator`);
	}

	if (!(await authuser.isPasswordMatch(password))) {
		throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
	}

	return authuser;
};



/**
 * Login with oAuth
 * @param {string} service // "google" | "facebook"
 * @param {string} id
 * @param {string} email
 * @returns {Promise<AuthUser>}
 */
const loginWith_oAuth = async (service, id, email) => {

	let authuser = await authuserDbService.get_oAuthUser(service, id, email);

	if (authuser?.isDisabled) {
		throw new ApiError(httpStatus.UNAUTHORIZED, `You are disabled. Call the system administrator.`);
	}

    if (authuser) return authuser;
    
	// new user
	const authuserx = new AuthUser(email);
	authuserx.isEmailVerified = true;
	authuserx.services = { 
		emailpassword: "not registered", 
		[`${service}`]: id   // { google: 46598364598354983 }
	};

	authuser = await authuserDbService.createAuthUser(authuserx);

	return authuser;
};



/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (authuser, accessToken, refreshToken) => {
	try {
		const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);

		// delete the refresh token family from db
		await tokenService.removeTokens({ family: refreshTokenDoc.family });

		const redisClient = getRedisClient();
		if (redisClient) {
			const jti = refreshTokenDoc.jti;

			// add access token into blacklist, which is paired with refreshtoken (key, timeout, value)
			await redisClient.setex(`blacklist_${jti}`, config.jwt.accessExpirationMinutes * 60, true);
		}
		
		if (authuser?.id.toString() !== refreshTokenDoc.user.toString()) {
			// Means that Refresh Token is stolen by authuser 
			// This control is placed here to allow refresh token family removed from db, above.
			
			if (redisClient) {
				const { jti } = jwt.verify(accessToken, config.jwt.secret);

				// add access token which is authenticated into blacklist since the authuser made violation
				await redisClient.setex(`blacklist_${jti}`, config.jwt.accessExpirationMinutes * 60, true);	
			}
			
			throw new ApiError(httpStatus.UNAUTHORIZED, `Tokens could not be matched, please re-authenticate`);
		}
		
	} catch (error) {
		throw error;
	}
};



/**
 * Signout from the system
 * @param {string} refreshToken
 * @returns {Promise}
 */
 const signout = async (authuser, accessToken, refreshToken) => {
	try {
		const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
		
		// delete all tokens of the user
		await tokenService.removeTokens({ user: refreshTokenDoc.user });

		const redisClient = getRedisClient();
		if (redisClient) {
			const jti = refreshTokenDoc.jti;

			// add access token into blacklist, which is paired with refreshtoken (key, timeout, value)
			await redisClient.setex(`blacklist_${jti}`, config.jwt.accessExpirationMinutes * 60, true);		
		}

		if (authuser.id.toString() !== refreshTokenDoc.user.toString()) {
			// Means that Refresh Token is stolen by authuser 
			// This control is placed here to allow refresh token family removed from db, above.
			
			if (redisClient) {
				const { jti } = jwt.verify(accessToken, config.jwt.secret);

				// add access token which is authenticated into blacklist since the authuser made violation
				await redisClient.setex(`blacklist_${jti}`, config.jwt.accessExpirationMinutes * 60, true);	
			}
			
			throw new ApiError(httpStatus.UNAUTHORIZED, `Tokens could not be matched, please re-authenticate to signout from system`);
		}

		// delete authuser by id 
		//TODO: consider again whether is necessey to check isDeleted, since it passed before authorization
		const isDeleted = await authuserDbService.deleteAuthUser(authuser.id);
		if (!isDeleted)
			throw new ApiError(httpStatus.NOT_FOUND, 'No user found');

		// TODO: delete user data or do it via another request
		
	} catch (error) {
		throw error;
	}
};



/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @param {string} userAgent
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken, userAgent) => {
  try {
	const refreshTokenDoc = await tokenService.refreshTokenRotation(refreshToken, userAgent);

	const authuser = await authuserDbService.getAuthUser({ id: refreshTokenDoc.user });
	if (!authuser) throw new ApiError(httpStatus.NOT_FOUND, 'No user found');

	if (authuser.isDisabled) {
		throw new ApiError(httpStatus.FORBIDDEN, `You are disabled. Call the system administrator.`);
	}

	return { authuser, refreshTokenFamily: refreshTokenDoc.family };

  } catch (error) {
	if (error instanceof ApiError)
		throw error
	else
		throw new ApiError(httpStatus.UNAUTHORIZED, error); // Refresh tokens failed.
  }
};



/**
 * Reset password
 * @param {string} resetPasswordToken
 * @param {string} newPassword
 * @returns {Promise<AuthUser>}
 */
const resetPassword = async (resetPasswordToken, newPassword) => {
  try {
    const resetPasswordTokenDoc = await tokenService.verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD);

    const authuser = await authuserDbService.getAuthUser({ id: resetPasswordTokenDoc.user });
    if (!authuser) throw new ApiError(httpStatus.NOT_FOUND, 'No user found');

	const password = await bcrypt.hash(newPassword, 8);
    
    await authuserDbService.updateAuthUser(authuser.id, { 
		password, 
		services: { ...authuser.services, emailpassword: "registered" }
	});
	
	await tokenService.removeTokens({ user: authuser.id, type: tokenTypes.RESET_PASSWORD });

	return authuser;

  } catch (error) {
    if (error instanceof ApiError)
	  		throw error
		else
			throw new ApiError(httpStatus.UNAUTHORIZED, error); // Reset password failed.
  }
};



/**
 * Verify email
 * @param {string} verifyEmailToken
 * @returns {Promise<AuthUser>}
 */
const verifyEmail = async (verifyEmailToken) => {
  try {
    const verifyEmailTokenDoc = await tokenService.verifyToken(verifyEmailToken, tokenTypes.VERIFY_EMAIL);

    const authuser = await authuserDbService.getAuthUser({ id: verifyEmailTokenDoc.user });
    if (!authuser) throw new ApiError(httpStatus.NOT_FOUND, 'No user found');
    
    await authuserDbService.updateAuthUser(authuser.id, { isEmailVerified: true });
	await tokenService.removeTokens({ user: authuser.id, type: tokenTypes.VERIFY_EMAIL });

	return authuser;

  } catch (error) {
		if (error instanceof ApiError)
	  		throw error
		else
			throw new ApiError(httpStatus.UNAUTHORIZED, error); // Email verification failed.
  }
};



module.exports = {
  signupWithEmailAndPassword,
  loginWithEmailAndPassword,
  loginWith_oAuth,
  logout,
  signout,
  refreshAuth,
  resetPassword,
  verifyEmail,
};
