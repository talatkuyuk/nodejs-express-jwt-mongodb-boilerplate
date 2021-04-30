const httpStatus = require('http-status');
const bcrypt = require('bcryptjs');

const { User } = require('../models');

const mongodb = require('../core/mongodb');
const ObjectId = require('mongodb').ObjectId;
const ApiError = require('../utils/ApiError');

/**
 * Check if the user exists
 * @param {String} id
 * @returns {Promise<Boolean>}
 */
 const isValidUser = async function (id) {
	var db = mongodb.getDatabase();
	const user = await db.collection("authusers").findOne({ _id: ObjectId(id) });
	return !!user;
};

/**
 * Check if the email is already taken
 * @param {String} email
 * @returns {Promise<Boolean>}
 */
const isEmailTaken = async function (email) {
	var db = mongodb.getDatabase();
	const user = await db.collection("authusers").findOne({ email });
	return !!user;
};

/**
 * Check if the email is already taken except that user
 * @param {String} email
 * @param {String} excludeUserId
 * @returns {Promise<Boolean>}
 */
const isEmailTakenOf = async function (email, excludeUserId) {
	var db = mongodb.getDatabase();
	const user = await db.collection("authusers").findOne({ email, _id: { $ne: ObjectId(excludeUserId) } });
	return !!user;
};

/**
 * Create a authuser
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const createAuthUser = async (email, password) => {
	try {

		const db = mongodb.getDatabase();

		const user = new User(email, password);
		const result = await db.collection("authusers").insertOne(user);
		user.transformId(result.insertedId);

		console.log(`${result.insertedCount} record is created in authusers.`)
		
		return user;

	} catch (error) {
		throw error;
	}
};

/**
 * Query for users
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryUsers = async (filter, options) => {
  const users = await User.paginate(filter, options);
  return users;
};

/**
 * Get authuser by id
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
const getAuthUserById = async (id) => {
	try {
		const db = mongodb.getDatabase();
		const doc = await db.collection("authusers").findOne({_id: ObjectId(id)});
		return User.fromDoc(doc);
		
	} catch (error) {
		throw error
	}
};

/**
 * Get authuser by email
 * @param {string} email
 * @returns {Promise<User>}
 */
const getAuthUserByEmail = async (email) => {
	try {
		const db = mongodb.getDatabase();
		const doc = await db.collection("authusers").findOne({email});
		return User.fromDoc(doc);
		
	} catch (error) {
		throw error
	}
};

/**
 * Update authuser by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const updateAuthUserById = async (id, updateBody) => {
  
  if (updateBody.email && (await isEmailTakenOf(updateBody.email, id))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  console.log(updateBody);

  const db = mongodb.getDatabase();
  const result = await db.collection("authusers").updateOne({_id: ObjectId(id)}, { $set: {...updateBody, updatedAt: Date.now()} });

  console.log(`${result.modifiedCount} record is updated in authusers`);
  
  let user = await getAuthUserById(id);
  return user;
};

/**
 * Delete authuser by id
 * @param {ObjectId} id
 * @returns {Promise}
 */
const deleteAuthUserById = async (id) => {
	try {
		const db = mongodb.getDatabase();
		const result = await db.collection("authusers").deleteOne({_id: ObjectId(id)});
		console.log(`${result.deletedCount} record is deleted in authusers`);
		
	} catch (error) {
		throw error;
	}
};

module.exports = {
  createAuthUser,
  getAuthUserById,
  getAuthUserByEmail,
  updateAuthUserById,
  deleteAuthUserById,
  isEmailTaken,
  isValidUser
};
