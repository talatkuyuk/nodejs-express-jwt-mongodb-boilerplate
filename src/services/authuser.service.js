const mongodb = require('../core/mongodb');
const ObjectId = require('mongodb').ObjectId;

const { AuthUser } = require('../models');


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
 * Check if the authuser exists
 * @param {String} id
 * @returns {Promise<Boolean>}
 */
 const isValidUser = async function (id) {
	var db = mongodb.getDatabase();
	const authuser = await db.collection("authusers").findOne({ _id: ObjectId(id) });
	return !!authuser;
};


/**
 * Check if the email and the id matches
 * @param {String} id
 * @param {String} email
 * @returns {Promise<Boolean>}
 */
const isPair_EmailAndId = async function (id, email) {
	var db = mongodb.getDatabase();
	const authuser = await db.collection("authusers").findOne({_id: ObjectId(id), email });
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
const updateAuthUser = async (id, updateBody) => {
	try {
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
 * @returns {Promise<AuthUser?>}
 */
const deleteAuthUser = async (id) => {
	try {
		const db = mongodb.getDatabase();
		const result = await db.collection("authusers").findOneAndDelete({_id: ObjectId(id)});

		if (result.ok === 1) {
			console.log(`The authuser ${id} is deleted in authusers`);
			
			const authuser = AuthUser.fromDoc(result.value);

			await toDeletedAuthUsers(authuser);

			return authuser;

		} else {
			console.log(`The authuser is not deleted.`);

			return null;
		}
		
	} catch (error) {
		throw error;
	}
};

/**
 * Add the deleted authuser to the deletedauthusers
 * @param {AuthUser} deletedAuthUser
 * @returns {Promise}
 */
 const toDeletedAuthUsers = async (deletedAuthUser) => {
	try {
		const db = mongodb.getDatabase();

		deletedAuthUser["_id"] = deletedAuthUser.id;
		delete deletedAuthUser.id;
		deletedAuthUser["deletedAt"] = Date.now();

		const result = await db.collection("deletedauthusers").insertOne(deletedAuthUser);
		console.log(`${result.insertedCount} record is created in deletedauthusers.`)
		
	} catch (error) {
		throw error;
	}
};

module.exports = {
  createAuthUser,
  getAuthUserById,
  getAuthUserByEmail,
  updateAuthUser,
  deleteAuthUser,
  isEmailTaken,
  isValidUser,
  isPair_EmailAndId
};
