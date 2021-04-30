const httpStatus = require('http-status');
const bcrypt = require('bcryptjs');

const { User } = require('../models');

const mongodb = require('../core/mongodb');
const ObjectId = require('mongodb').ObjectId;


/**
 * Create a user with the same id of the authuser
 * @param {ObjectId} id
 * @param {string} email
 * @returns {Promise}
 */
const createUser = async (id, email) => {
	try {
		const db = mongodb.getDatabase();
		const result = await db.collection("users").insertOne({_id: id, email});
		console.log(`${result.insertedCount} record is created in users.`)
		
	} catch (error) {
		throw error;
	}
};

/**
 * Get user by id
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
 const getUserById = async (id) => {
	try {
		const db = mongodb.getDatabase();

		const authuserDoc = await db.collection("authusers").findOne({_id: ObjectId(id)});
		if(!authuserDoc) throw Error("user not found");
		const user = User.fromDoc(authuserDoc);

		const userDoc = await db.collection("users").findOne({_id: ObjectId(id)});
		if(!userDoc) throw Error("user not found");
		user.extendWith(userDoc);

		return user;
		
	} catch (error) {
		throw error
	}
};

/**
 * Update user by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
 const updateUserById = async (id, updateBody) => {
	 try {
		 console.log(updateBody);
	   
		 const db = mongodb.getDatabase();
		 const result = await db.collection("users").updateOne({_id: ObjectId(id)}, { $set: {...updateBody, updatedAt: Date.now()} });
	   
		 console.log(`${result.modifiedCount} record is updated in users`);
		 
		 const user = await getUserById(id);
		 return user;
		 
	 } catch (error) {
		throw error
	 }

};


/**
 * Delete user by id
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
 const deleteUserById = async (id) => {
	try {
		const user = await getUserById(id);
		const db = mongodb.getDatabase();
		const result = await db.collection("users").deleteOne({_id: ObjectId(id)});
		console.log(`${result.deletedCount} record is deleted in users`);
		return user; // in order to add it to deletedusers
		
	} catch (error) {
		throw error;
	}
};


/**
 * Add the deleted user to the deleteusers
 * @param {ObjectId} id
 * @param {string} email
 * @returns {Promise}
 */
 const addUserToDeletedUsers = async (deletedUser) => {
	try {
		const db = mongodb.getDatabase();

		deletedUser["_id"] = deletedUser.id;
		delete deletedUser.id;
		deletedUser["deletedAt"] = Date.now();

		const result = await db.collection("deletedusers").insertOne(deletedUser);
		console.log(`${result.insertedCount} record is created in deletedusers.`)
		
	} catch (error) {
		throw error;
	}
};


module.exports = {
	createUser,
	getUserById,
	updateUserById,
	deleteUserById,
	addUserToDeletedUsers
};