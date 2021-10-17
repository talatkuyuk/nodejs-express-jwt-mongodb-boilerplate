const httpStatus = require('http-status');
const bcrypt = require('bcryptjs');

const { ApiError, locateError } = require('../utils/ApiError');

// for redis operations
const redisService = require('./redis.service');

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

		const authuser = await authuserDbService.addAuthUser(authuserx);
		
		if (!authuser)
			throw new ApiError(httpStatus.BAD_REQUEST, "The database could not process the request");

		return authuser;

	} catch (error) {
		throw locateError(error, "AuthService : signupWithEmailAndPassword");
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
		throw locateError(error, "AuthService : loginWithEmailAndPassword");
	}
};



/**
 * Login with oAuth
 * @param {string} service // "google" | "facebook"
 * @param {string} id
 * @param {string} email
 * @returns {Promise<AuthUser>}
 */
const loginWithAuthProvider = async (provider, id, email) => {
	try {
		const authuser = await authuserDbService.getAuthUser({ email });

		if (authuser) {

			if (authuser.isDisabled)
				throw new ApiError(httpStatus.FORBIDDEN, `You are disabled, call the system administrator`);

			if (authuser.services[provider] === undefined)
				return await authuserDbService.updateAuthUser(authuser.id, { services: { ...authuser.services, [provider]: id }, isEmailVerified: true });
		}

		// if there is no authuser, then create a new one
		const authuserx = new AuthUser(email, null);
		authuserx.isEmailVerified = true;
		authuserx.services = { 
			emailpassword: "not registered",
			[provider]: id   // { google: 46598364598354983 }
		};

		return await authuserDbService.addAuthUser(authuserx);
		
	} catch (error) {
		throw locateError(error, "AuthService : loginWithAuthProvider");
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

		// put the access token's jti into the blacklist
		await redisService.put_jti_into_blacklist(jti);

		
	} catch (error) {
		throw locateError(error, "AuthService : logout");
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

		// put the access token's jti into the blacklist
		await redisService.put_jti_into_blacklist(jti);

		// delete authuser by id; no need to check id in database since he/she has passed the authorization soon ago
		await authuserDbService.deleteAuthUser(id);

		// TODO: delete user data or do it via another request
		
	} catch (error) {
		throw locateError(error, "AuthService : signout");
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
		throw new ApiError(httpStatus.FORBIDDEN, `You are disabled, call the system administrator`);

	// returns the family as well since it is going to be used while re-generating new refresh token
	return { authuser, refreshTokenFamily: family };

  } catch (error) {
	throw locateError(error, "AuthService : refreshAuth");
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

    if (!authuser) {
		throw new ApiError(httpStatus.NOT_FOUND, 'No user found');
	}

	if (authuser.isDisabled) {
		throw new ApiError(httpStatus.FORBIDDEN, `You are disabled, call the system administrator`);
	}

	const password = await bcrypt.hash(newPassword, 8);
    
    await authuserDbService.updateAuthUser(authuser.id, { 
		password, 
		services: { ...authuser.services, emailpassword: "registered" }
	});
	
	await tokenService.removeTokens({ user: authuser.id, type: tokenTypes.RESET_PASSWORD });

	return authuser;

  } catch (error) {
	throw locateError(error, "AuthService : resetPassword");
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
    
	if (!authuser) {
		throw new ApiError(httpStatus.NOT_FOUND, 'No user found');
	}

	if (authuser.isDisabled) {
		throw new ApiError(httpStatus.FORBIDDEN, `You are disabled, call the system administrator`);
	}
    
    await authuserDbService.updateAuthUser(authuser.id, { isEmailVerified: true });
	await tokenService.removeTokens({ user: authuser.id, type: tokenTypes.VERIFY_EMAIL });

	return authuser;

  } catch (error) {
	throw locateError(error, "AuthService : verifyEmail");
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
		throw locateError(error, "AuthService : handleEmailIsAlreadyVerified");
	}
};



module.exports = {
  signupWithEmailAndPassword,
  loginWithEmailAndPassword,
  loginWithAuthProvider,
  logout,
  signout,
  refreshAuth,
  resetPassword,
  verifyEmail,
  handleEmailIsAlreadyVerified,
};
