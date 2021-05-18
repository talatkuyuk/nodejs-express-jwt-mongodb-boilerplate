const httpStatus = require('http-status');
const bcrypt = require('bcryptjs');

const ApiError = require('../utils/ApiError');

//for database operations for authusers
const authuserService = require('./authuser.service');
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
 const signupWithEmailAndPassword = async (email, password) => 
 			await authuserService.createAuthUser(email, password);

			 
/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<AuthUser>}
 */
const loginWithEmailAndPassword = async (email, password) => {
  const authuser = await authuserService.getAuthUser({email});
  if (!authuser || !(await authuser.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }
  if (authuser.disabled) {
	throw new ApiError(httpStatus.UNAUTHORIZED, `You are disabled. Call the system administrator.`);
  }
  return authuser;
};


/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken) => {
	try {
		const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);

		// delete that token
		await tokenService.removeToken(refreshTokenDoc.id);

		// TODO: cancel access token
		// TODO: logout with refresh token? or access token?
		
		
	} catch (error) {
		throw error;
	}
};


/**
 * Signout from the system
 * @param {string} refreshToken
 * @returns {Promise}
 */
 const signout = async (refreshToken) => {
	try {
		const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);

		const user = refreshTokenDoc.user;
		
		// delete all tokens,
		await tokenService.removeTokens({ user });

		// TODO: cancel access token

		// delete authuser by id
		await authuserService.deleteAuthUser(id);
		
	} catch (error) {
		throw error;
	}
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<AuthUser>}
 */
const refreshAuth = async (refreshToken) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);

    const authuser = await authuserService.getAuthUser({ id: refreshTokenDoc.user });
    if (!authuser) throw new Error("User not found");

	if (authuser.disabled) {
		throw new ApiError(httpStatus.UNAUTHORIZED, `You are disabled. Call the system administrator.`);
	}
    
	await tokenService.removeToken(refreshTokenDoc.id);

    return authuser;

  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, `${error.message} and refreshing token failed`);
  }
};



/**
 * Reset password
 * @param {string} resetPasswordToken
 * @param {string} newPassword
 * @returns {Promise}
 */
const resetPassword = async (resetPasswordToken, newPassword) => {
  try {
    const resetPasswordTokenDoc = await tokenService.verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD);

    const authuser = await authuserService.getAuthUser({ id: resetPasswordTokenDoc.user });
    if (!authuser) throw new Error("User not found");

	const password = await bcrypt.hash(newPassword, 8);
    
    await authuserService.updateAuthUser(authuser.id, { password });
	await tokenService.removeTokens({ user: authuser.id, type: tokenTypes.RESET_PASSWORD });

  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, `${error.message}. Reset password failed.`);
  }
};

/**
 * Verify email
 * @param {string} verifyEmailToken
 * @returns {Promise}
 */
const verifyEmail = async (verifyEmailToken) => {
  try {
    const verifyEmailTokenDoc = await tokenService.verifyToken(verifyEmailToken, tokenTypes.VERIFY_EMAIL);

    const authuser = await authuserService.getAuthUser({ id: verifyEmailTokenDoc.user });
    if (!authuser) throw new Error("User not found");
    
    await authuserService.updateAuthUser(authuser.id, { isEmailVerified: true });
	await tokenService.removeTokens({ user: authuser.id, type: tokenTypes.VERIFY_EMAIL });

  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, `${error.message}. Email verification failed.` );
  }
};



module.exports = {
  signupWithEmailAndPassword,
  loginWithEmailAndPassword,
  logout,
  signout,
  refreshAuth,
  resetPassword,
  verifyEmail,
};
