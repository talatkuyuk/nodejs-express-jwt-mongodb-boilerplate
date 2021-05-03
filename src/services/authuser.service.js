const httpStatus = require('http-status');
const bcrypt = require('bcryptjs');

const { AuthUser } = require('../models');

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
	const authuser = await db.collection("authusers").findOne({ _id: ObjectId(id) });
	return !!authuser;
};

/**
 * Check if the email is already taken
 * @param {String} email
 * @returns {Promise<Boolean>}
 */
const isEmailTaken = async function (email) {
	var db = mongodb.getDatabase();
	const authuser = await db.collection("authusers").findOne({ email });
	return !!authuser;
};

/**
 * Check if the email is already taken except that user
 * @param {String} email
 * @param {String} excludeUserId
 * @returns {Promise<Boolean>}
 */
const isEmailTakenOf = async function (email, excludeUserId) {
	var db = mongodb.getDatabase();
	const authuser = await db.collection("authusers").findOne({ email, _id: { $ne: ObjectId(excludeUserId) } });
	return !!authuser;
};

/**
 * Create a authuser
 * @param {string} email
 * @param {string} password
 * @returns {Promise<AuthUser>}
 */
const createAuthUser = async (email, password) => {
	try {
		const authuser = new AuthUser(email, password);

		const db = mongodb.getDatabase();
		const result = await db.collection("authusers").insertOne(authuser);
		
		authuser.transformId(result.insertedId);

		console.log(`${result.insertedCount} record is created in authusers.`)
		
		return authuser;

	} catch (error) {
		throw error;
	}
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

		return AuthUser.fromDoc(doc);
		
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

		return AuthUser.fromDoc(doc);
		
	} catch (error) {
		throw error
	}
};

/**
 * Update authuser by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<AuthUser>}
 */
const updateAuthUserById = async (id, updateBody) => {
	try {
		if (updateBody.email && (await isEmailTakenOf(updateBody.email, id))) {
		  throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
		}
	  
		console.log(updateBody);
	  
		const db = mongodb.getDatabase();
	  
		const result = await db.collection("authusers").findOneAndUpdate(
		  { _id: ObjectId(id) },
		  { $set: {...updateBody, updatedAt: Date.now()} },
		  { returnOriginal: false }
		);
	  
		console.log(`${result.ok} record is updated in users`);
	  
		const authuser = AuthUser.fromDoc(result.value);
		return authuser;
		
	} catch (error) {
		throw error
	}
  
};

/**
 * Delete authuser by id
 * @param {ObjectId} id
 * @returns {Promise}
 */
const deleteAuthUserById = async (id) => {
	try {
		const db = mongodb.getDatabase();
		const result = await db.collection("authusers").findOneAndDelete({_id: ObjectId(id)});

		console.log(`${result.ok} record is deleted in authusers`);

		return AuthUser.fromDoc(result.value);
		
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
