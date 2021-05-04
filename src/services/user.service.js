const { User } = require('../models');

const mongodb = require('../core/mongodb');
const ObjectId = require('mongodb').ObjectId;


/**
 * Query for users
 * @param {Object} filterLeft - Mongo filter for authusers
 * @param {Object} filterRight - Mongo filter for users
 * @param {Object} sort - Sort option in the format: { field1: 1, field2: -1}
 * @param {number} limit - Maximum number of results per page (default = 20)
 * @param {number} page - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
 const queryUsers = async (filterLeft, filterRight, sort, skip, limit) => {
	 try {
		 const db = mongodb.getDatabase();
	 
		 const pipeline = [
			 {
				$match: filterLeft
			 },
			 { 
				 $lookup: {
					 from: 'users',
					 localField: '_id',
					 foreignField: '_id',
					 as: 'details',
				 }
			 },
			 {
				$unwind: "$details"
			 },
			 {
				 $project:{
					 email: "$details.email",
					 isEmailVerified: 1,
					 disabled: 1,
					 role: "$details.role",
					 name: "$details.name",
					 gender: "$details.gender",
					 country: "$details.country",
					 createdAt: 1,
				 }
			 },
			 {
				$match: filterRight
			 },
			 {
				$sort: sort
			 },
			 {
				$facet:{
					users: [{ $skip: skip }, { $limit: limit}],
					totalCount: [
						{
							$count: 'count'
						}
					]
			  	}
			 }
		 ]
	 
		return await db.collection("authusers").aggregate(pipeline).toArray();
		 
	 } catch (error) {
		 throw error;
	 }
};

/**
 * Create a user with the same id of the authuser
 * @param {AuthUser} authuser
 * @returns {Promise}
 */
const createUser = async (authuser) => {
	try {
		const {id, email, createdAt} = authuser;

		const db = mongodb.getDatabase();
		const result = await db.collection("users").insertOne({_id: id, email, role: "user", createdAt});

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
		const doc = await db.collection("users").findOne({_id: ObjectId(id)});

		return User.fromDoc(doc);
		
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

		 const result = await db.collection("users").findOneAndUpdate(
			{ _id: ObjectId(id) },
			{ $set: {...updateBody, updatedAt: Date.now()} },
			{ returnOriginal: false }
		 );

		 console.log(`${result.ok} record is updated in users`);

		 const user = User.fromDoc(result.value);
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
		const db = mongodb.getDatabase();
		const result = await db.collection("users").findOneAndDelete({_id: ObjectId(id)});

		console.log(`${result.ok} record is deleted in users`);

		return User.fromDoc(result.value);
		
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
	queryUsers,
	createUser,
	getUserById,
	updateUserById,
	deleteUserById,
	addUserToDeletedUsers,
};