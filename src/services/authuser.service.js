const httpStatus = require('http-status');
const bcrypt = require('bcryptjs');

const ApiError = require('../utils/ApiError');

const { AuthUser } = require('../models');

const authuserDbService = require('./authuser.db.service');

const paginaryService = require('./paginary.service');

/////////////////////////  UTILS  ///////////////////////////////////////


/**
 * Check if the email is already taken
 * @param {String} email
 * @returns {Promise<Boolean>}
 */
const isEmailTaken = async function (email) {
	try {
		const authuser = await authuserDbService.getAuthUser({ email });
		return !!authuser;

	} catch (error) {
		throw error;
	}
};


/**
 * Check if the authuser exists
 * @param {String} id
 * @returns {Promise<Boolean>}
 */
 const isValidAuthUser = async function (id) {
	try {
		const authuser = await authuserDbService.getAuthUser({ id });
		return !!authuser;

	} catch (error) {
		throw error;
	}
};


/**
 * Check if the email and the id matches
 * @param {String} id
 * @param {String} email
 * @returns {Promise<Boolean>}
 */
const isPair_EmailAndId = async function (id, email) {
	try {
		const authuser = await authuserDbService.getAuthUser({ id, email });
		return !!authuser;

	} catch (error) {
		throw error;
	}
};


/////////////////////////////////////////////////////////////////////


/**
 * Enable & Disable AuthUser
 * @param {string} id
 * @returns {Promise}
 */
 const toggleAbility = async (id) => {
	try {
		const authuser = await authuserDbService.getAuthUser({ id });
		if (!authuser) throw new ApiError(httpStatus.NOT_FOUND, 'No user found');

		await authuserDbService.updateAuthUser(id, {isDisabled: !authuser.isDisabled});
  
	} catch (error) {
	  	throw error;
	}
};



/**
 * Change password
 * @param {AuthUser} authuser
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Promise}
 */
 const changePassword = async (authuser, newPassword) => {
	try {
		const password = await bcrypt.hash(newPassword, 8);
    	await authuserDbService.updateAuthUser(authuser.id, { password });

	} catch (error) {
		throw error;
	}
};



/**
 * Delete AuthUser
 * @param {Object} query
 * @returns {Promise<Object>}
 */
 const getAuthUsers = async (query) => {
	try {
		const queryFields = ['email'];
		const booleanFields = ['isEmailVerified', 'isDisabled'];
		
		return await paginaryService.paginary(query, queryFields, booleanFields, authuserDbService.getAuthUsers);
  
	} catch (error) {
	  	throw error;
	}
};



/**
 * Delete AuthUser
 * @param {string} id
 * @returns {Promise}
 */
 const deleteAuthUser = async (id) => {
	try {
		const authuser = await authuserDbService.getAuthUser({ id });
		if (!authuser) throw new ApiError(httpStatus.NOT_FOUND, 'No user found');

		await authuserDbService.deleteAuthUser(id);

		// TODO: delete user data or do it via another request
  
	} catch (error) {
	  	throw error;
	}
};



/**
 * Get AuthUser by email
 * @param {string} email
 * @returns {Promise<AuthUser?>}
 */
 const getAuthUserByEmail = async (email) => {
	try {
		const authuser = await authuserDbService.getAuthUser({ email });
		if (!authuser) throw new ApiError(httpStatus.NOT_FOUND, 'No user found');
		
		// or fake message for security, forexample when forgotPassword
		// if (!authuser) throw new ApiError(httpStatus.OK, 'An email has been sent for reseting password.');

		return authuser;
  
	} catch (error) {
	  	throw error;
	}
};




/**
 * Get AuthUser by id
 * @param {string} id
 * @returns {Promise<AuthUser?>}
 */
 const getAuthUserById = async (id) => {
	try {
		const authuser = await authuserDbService.getAuthUser({ id });
		if (!authuser) throw new ApiError(httpStatus.NOT_FOUND, 'No user found');
		
		return authuser;
  
	} catch (error) {
	  	throw error;
	}
};



/**
 * Get Deleted AuthUser by id
 * @param {string} id
 * @returns {Promise<AuthUser?>}
 */
 const getDeletedAuthUserById = async (id) => {
	try {
		const authuser = await authuserDbService.getDeletedAuthUser({id});
		if (!authuser) throw new ApiError(httpStatus.NOT_FOUND, 'No user found');

		return authuser;
  
	} catch (error) {
	  	throw error;
	}
};



module.exports = {
	toggleAbility,
	changePassword,

	getAuthUsers,
	deleteAuthUser,

	getAuthUserById,
	getAuthUserByEmail,
	getDeletedAuthUserById,

	isEmailTaken,
	isValidAuthUser,
	isPair_EmailAndId
};
