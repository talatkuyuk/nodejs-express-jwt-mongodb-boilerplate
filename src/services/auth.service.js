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

		return await authuserDbService.addAuthUser(authuserx);

	} catch (error) {
		error.description || (error.description = "Signup with Email-Password failed in AuthService");
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
	try {
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

	} catch (error) {
		error.description || (error.description = "Login with Email-Password failed in AuthService");
		throw error;
	}
};



/**
 * Login with oAuth
 * @param {string} service // "google" | "facebook"
 * @param {string} id
 * @param {string} email
 * @returns {Promise<AuthUser>}
 */
const loginWith_oAuth = async (service, id, email) => {
	try {
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

		authuser = await authuserDbService.addAuthUser(authuserx);

		return authuser;
		
	} catch (error) {
		error.description || (error.description = "Login with oAuth failed in AuthService");
		throw error;
	}
};



/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (id, jti) => {
	try {
		// delete the refresh token family from db
		await tokenService.findTokenAndRemoveFamily({ user: id, jti }, "family");

		// add access token into blacklist, which is paired with refreshtoken (key, timeout, value)
		const redisClient = getRedisClient();
		if (redisClient) {
			await redisClient.setex(`blacklist_${jti}`, config.jwt.accessExpirationMinutes * 60, true);
		}
		
	} catch (error) {
		error.description || (error.description = "Logout failed in AuthService");
		throw error;
	}
};



/**
 * Signout from the system
 * @param {string} refreshToken
 * @returns {Promise}
 */
 const signout = async (id, jti) => {
	try {
		// delete the whole tokens of the user from db
		await tokenService.findTokenAndRemoveFamily({ user: id, jti }, "user");

		// add access token into blacklist, which is paired with refreshtoken (key, timeout, value)
		const redisClient = getRedisClient();
		if (redisClient) {
			await redisClient.setex(`blacklist_${jti}`, config.jwt.accessExpirationMinutes * 60, true);		
		}

		// delete authuser by id; no need to check id in database since he/she has passed the authorization soon ago
		await authuserDbService.deleteAuthUser(id);

		// TODO: delete user data or do it via another request
		
	} catch (error) {
		error.description || (error.description = "Signout failed in AuthService");
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
	// ensure the refresh token blacklisted during RTR and get back the document
	const { user: id, family } = await tokenService.refreshTokenRotation(refreshToken, userAgent);

	const authuser = await authuserDbService.getAuthUser({ id });

	if (!authuser) 
		throw new ApiError(httpStatus.NOT_FOUND, 'No user found');

	if (authuser.isDisabled)
		throw new ApiError(httpStatus.FORBIDDEN, `You are disabled. Call the system administrator.`);

	// returns the family as well since it is going to be used while re-generating new refresh token
	return { authuser, refreshTokenFamily: family };

  } catch (error) {
	error.description || (error.description = "Refresh Auth Tokens failed in AuthService");
	throw error;
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
    error.description || (error.description = "Reset Password failed in AuthService");
	throw error;
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
	error.description || (error.description = "Email Verification failed in AuthService");
	throw error;
  }
};


/**
 * Check if the authuser's email is already verified
 * @param {boolean} isEmailVerified
 * @returns {any}
 */
 const handleEmailIsAlreadyVerified = function (isEmailVerified) {
	if (isEmailVerified) {
		const error = new ApiError(httpStatus.BAD_REQUEST, "Email is already verified");
		error.description || (error.description = "Email Is Already Verified happened in AuthService");
		throw error;
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
  handleEmailIsAlreadyVerified,
};
