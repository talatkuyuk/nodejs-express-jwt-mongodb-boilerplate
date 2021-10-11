const composeFilter = require('../utils/composeFilter');
const { locateError } = require('../utils/ApiError');

const joinedDbService = require('./joined.db.service');
const paginaryService = require('./paginary.service');


// I created this service for joined queries for admin users, but actually it is not necessary.
// My concept aims normally to seperate authuser and authentication feature from user and related processes

/**
 * Get AuthUsers Joined with Users in a paginary
 * @param {Object} query
 * @returns {Promise<Object>}
 */
 const getAuthUsersJoined = async (query) => {
	try {
		const fieldsLeft = {
			stringFields: ['email'],
			booleanFields: ['isEmailVerified', 'isDisabled'],
		}

		const fieldsRight = {
			stringFields: ['role', 'name', 'country', 'gender'],
			booleanFields: [],
		}

		const filterLeft = composeFilter(query, fieldsLeft);
		const filterRight = composeFilter(query, fieldsRight);
		
		return await paginaryService.paginaryForJoinQuery(query, filterLeft, filterRight, joinedDbService.getAuthUsersJoined);
  
	} catch (error) {
		throw locateError(error, "JoinedService : getAuthUsersJoined");
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

		const filterLeft = composeFilter(query, fieldsLeft);
		const filterRight = composeFilter(query, fieldsRight);
		
		return await paginaryService.paginaryForJoinQuery(query, filterLeft, filterRight, joinedDbService.getUsersJoined);
  
	} catch (error) {
		throw locateError(error, "JoinedService : getUsersJoined");
	}
};



module.exports = {
	getAuthUsersJoined,
	getUsersJoined,
};