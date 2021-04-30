const httpStatus = require('http-status');
const bcrypt = require('bcryptjs');
const ObjectId = require('mongodb').ObjectId;

const tokenService = require('./token.service');
const userService = require('./user.service');
const authuserService = require('./authuser.service');

const ApiError = require('../utils/ApiError');
const { tokenTypes } = require('../config/tokens');
const { User } = require('../models');

/**
 * Signup with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
 const signupWithEmailAndPassword = async (email, password) => {
	try {
		if (await authuserService.isEmailTaken(email)) {
			throw new ApiError(httpStatus.BAD_REQUEST, 'Email is already taken.');
		}
		
		const hashedPassword = await bcrypt.hash(password, 8);
		const user = await authuserService.createAuthUser(email, hashedPassword);
		await userService.createUser(user.id, user.email);

		return user;

	} catch (error) {
		throw error;
	}
};

/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const loginWithEmailAndPassword = async (email, password) => {
  const user = await authuserService.getAuthUserByEmail(email);
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }
  if (user.disabled) {
	throw new ApiError(httpStatus.UNAUTHORIZED, `You are disabled. Call the system administrator.`);
  }
  return user;
};

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken) => {
	try {
		const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
		if (!refreshTokenDoc) throw new Error('refresh token is not valid');

		//TODO: cancel access token
		//TODO: logout with refresh token? or access token?
		
		await tokenService.removeToken(refreshTokenDoc._id);
		
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
		if (!refreshTokenDoc) throw new Error('refresh token is not valid');

		const userId = refreshTokenDoc.user;
		
		//delete all tokens,
		await tokenService.removeTokens({ user: userId});

		//TODO: cancel access token

		//delete user by id and get the deleted user info
		const deletedUser = await userService.deleteUserById(userId);

		//delete authuser by id
		await authuserService.deleteAuthUserById(userId);
		
		//add the user to deletedusers
		await userService.addUserToDeletedUsers(deletedUser);
		
	} catch (error) {
		throw error;
	}
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
	if (!refreshTokenDoc) throw new Error("refresh token is not valid");

    const user = await authuserService.getAuthUserById(refreshTokenDoc.user);
    if (!user) throw new Error("User not found");
    
	await tokenService.removeToken(refreshTokenDoc._id);
    return tokenService.generateAuthTokens(user);

  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, `${error.message} and refreshing token failed`);
  }
};


/**
 * Change password
 * @param {User} user
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Promise}
 */
const changePassword = async (user, currentPassword, newPassword) => {
	try {
		if (!(await user.isPasswordMatch(currentPassword))) {
			throw new ApiError(httpStatus.BAD_REQUEST, 'Incorrect password');
		}

		const password = await bcrypt.hash(newPassword, 8);
    	await authuserService.updateAuthUserById(user.id, { password });

	} catch (error) {
		throw error;
	}
}

/**
 * Reset password
 * @param {string} resetPasswordToken
 * @param {string} newPassword
 * @returns {Promise}
 */
const resetPassword = async (resetPasswordToken, newPassword) => {
  try {
    const resetPasswordTokenDoc = await tokenService.verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD);
	if (!resetPasswordTokenDoc) throw new Error("reset password token is not valid");

    const user = await authuserService.getAuthUserById(resetPasswordTokenDoc.user);
    if (!user) throw new Error("User not found");

	const password = await bcrypt.hash(newPassword, 8);
    
    await authuserService.updateAuthUserById(user.id, { password });
	await tokenService.removeTokens({ user: ObjectId(user.id), type: tokenTypes.RESET_PASSWORD });

  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, `${error.message} and reset password failed`);
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
	if (!verifyEmailTokenDoc) throw new Error("email verification token is not valid");

    const user = await authuserService.getAuthUserById(verifyEmailTokenDoc.user);
    if (!user) throw new Error("User not found");
    
    await authuserService.updateAuthUserById(user.id, { isEmailVerified: true });
	await tokenService.removeTokens({ user: ObjectId(user.id), type: tokenTypes.VERIFY_EMAIL });

  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, `${error.message} and email verification failed` );
  }
};

module.exports = {
  signupWithEmailAndPassword,
  loginWithEmailAndPassword,
  logout,
  signout,
  refreshAuth,
  changePassword,
  resetPassword,
  verifyEmail,
};
