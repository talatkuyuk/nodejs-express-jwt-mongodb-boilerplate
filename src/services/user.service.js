const httpStatus = require('http-status');

const { ApiError, locateError } = require('../utils/ApiError');
const composeFilter = require('../utils/composeFilter');
const composeSort = require('../utils/composeSort');

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
		throw locateError(error, "UserDbService : getUserById");
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
		}
		const filter = composeFilter(query, fields);

		const sortingFields = ['email', 'role', 'name', 'country', 'gender'];
		const sort = composeSort(query, sortingFields);
		
		return await paginaryService.paginary(query, filter, sort, userDbService.getUsers);
  
	} catch (error) {
		throw locateError(error, "UserDbService : getUsers");
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
		throw locateError(error, "UserDbService : deleteUser");
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
		throw locateError(error, "UserDbService : getDeletedUserById");
	}
};



/**
 * Get the user's role
 * @param {String} id
 * @returns {Promise<String?>}
 */
 const getUserRole = async function (id) {
	try {
		const user = await userDbService.getUser({ id });

		return user?.role;

	} catch (error) {
	   throw error;
	}
};


module.exports = {
	isValidUser,

	getUserById,
	getUsers,

	deleteUser,
	getDeletedUserById,

	getUserRole,
};
