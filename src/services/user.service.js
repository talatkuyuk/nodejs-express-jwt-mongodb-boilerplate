const httpStatus = require('http-status');

const ApiError = require('../utils/ApiError');
const { locateError } = require('../utils/errorUtils');
const composeFilter = require('../utils/composeFilter');
const composeSort = require('../utils/composeSort');
const { User } = require('../models');

// SERVICE DEPENDENCIES
const paginaryService = require('./paginary.service');
const userDbService = require('./user.db.service');


/////////////////////////  UTILS  ///////////////////////////////////////

/**
 * Check if the user exists
 * @param {String} id
 * @returns {Promise<Boolean>}
 */
 const isExist = async function (id) {
	try {
		const user = await userDbService.getUser({ id });
	   	return !!user;

	} catch (error) {
	   throw locateError(error, "UserService : isExist");
	}
};


/////////////////////////////////////////////////////////////////////


/**
 * Add user with the same authuser.id
 * @param {string} id
 * @param {Object} addBody
 * @returns {Promise<User>}
 */
 const addUser = async (id, addBody) => {
	try {
		const {email, role, name, gender, country} = addBody;
		const userx = new User(email, role, name, gender, country);

		const user = await userDbService.addUser(id, userx);
		
		if (!user)
			throw new ApiError(httpStatus.BAD_REQUEST, "The database could not process the request");

		return user;

	} catch (error) {
		throw locateError(error, "UserService : addUser");
	}
}

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
		throw locateError(error, "UserService : getUserById");
	}
};



/**
 * Get User by email
 * @param {string} email
 * @returns {Promise<User?>}
 */
 const getUserByEmail = async (email) => {
	try {
		const user = await userDbService.getUser({ email });
		if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'No user found');

		return user;
  
	} catch (error) {
		throw locateError(error, "UserService : getUserByEmail");
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

		const sortingFields = ['email', 'role', 'name', 'country', 'gender', 'createdAt'];
		const sort = composeSort(query, sortingFields);
		
		return await paginaryService.paginary(query, filter, sort, userDbService.getUsers);
  
	} catch (error) {
		throw locateError(error, "UserService : getUsers");
	}
};



/**
 * Update user by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<User?>}
 */
 const updateUser = async (id, updateBody) => {
	try {
		const user = await userDbService.updateUser(id, updateBody);

		if (user === null)
			throw new ApiError(httpStatus.NOT_FOUND, 'No user found');
		
		return user;
		
	} catch (error) {
	   throw locateError(error, "UserService : updateUser");
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
		throw locateError(error, "UserService : deleteUser");
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
		throw locateError(error, "UserService : getDeletedUserById");
	}
};


module.exports = {
	isExist,

	addUser,
	getUserById,
	getUserByEmail,
	getUsers,
	updateUser,
	deleteUser,
	getDeletedUserById,
};