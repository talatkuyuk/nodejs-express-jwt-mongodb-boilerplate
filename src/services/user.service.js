const httpStatus = require('http-status');

const ApiError = require('../utils/ApiError');

//for database operations for users
const userDbService = require('./user.db.service');
const { User } = require('../models');

const paginaryService = require('./paginary.service');

/////////////////////////  UTILS  ///////////////////////////////////////

/**
 * Check if the user exists
 * @param {String} id
 * @returns {Promise<Boolean>}
 */
 const isValidUser = async function (id) {
	try {
		const user = await userDbService.getUser({ id });
	   	return !!user;

	} catch (error) {
	   throw error;
	}
};


/////////////////////////////////////////////////////////////////////


/**
 * Get User by id
 * @param {string} id
 * @returns {Promise<User?>}
 */
 const getUserById = async (id) => {
	try {
		const user = await userDbService.getUser({ id });
		if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'No user found');
		
		return user;
  
	} catch (error) {
		error.description || (error.description = "Get User by id failed in UserService");
	  	throw error;
	}
};



/**
 * Get Users in a paginary
 * @param {Object} query
 * @returns {Promise<Object>}
 */
 const getUsers = async (query) => {
	try {

		const fields = {
			stringFields: ['email', 'role', 'name', 'country', 'gender'],
			booleanFields: [],
		}
		
		return await paginaryService.paginary(query, fields, userDbService.getUsers);
  
	} catch (error) {
		error.description || (error.description = "Get Users in paginary failed in UserService");
	  	throw error;
	}
};



/**
 * Get Users Joined with Authusers in a paginary
 * @param {Object} query
 * @returns {Promise<Object>}
 */
 const getUsersJoined = async (query) => {
	try {

		const fieldsLeft = {
			stringFields: ['email', 'role', 'name', 'country', 'gender'],
			booleanFields: [],
		}

		const fieldsRight = {
			stringFields: [],
			booleanFields: ['isEmailVerified', 'isDisabled'],
		}
		
		return await paginaryService.paginaryForJoinQuery(query, fieldsLeft, fieldsRight, userDbService.getUsersJoined);
  
	} catch (error) {
		error.description || (error.description = "Get Users joined in paginary failed in UserService");
	  	throw error;
	}
};



/**
 * Delete User
 * @param {string} id
 * @returns {Promise}
 */
 const deleteUser = async (id) => {
	try {
		const result = await userDbService.deleteUser(id);

		if (!result)
			throw new ApiError(httpStatus.NOT_FOUND, 'No user found');
  
	} catch (error) {
		error.description || (error.description = "Delete User failed in UserService");
	  	throw error;
	}
};



/**
 * Get Deleted User by id
 * @param {string} id
 * @returns {Promise<User?>}
 */
 const getDeletedUserById = async (id) => {
	try {
		const user = await userDbService.getDeletedUser({ id });
		if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'No user found');

		return user;
  
	} catch (error) {
		error.description || (error.description = "Get deleted User by id failed in UserService");
	  	throw error;
	}
};



module.exports = {
	isValidUser,

	getUserById,
	getUsers,
	getUsersJoined,

	deleteUser,
	getDeletedUserById,
};
