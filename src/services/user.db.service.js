const mongodb = require('../core/mongodb');
const ObjectId = require('mongodb').ObjectId;

const { User } = require('../models');
const { locateError } = require('../utils/ApiError');


/**
 * Add an user into db
 * @param {String} id
 * @param {User} user
 * @returns {Promise<User?>}
 */
 const addUser = async (id, user) => {
	try {
		const db = mongodb.getDatabase();
		const result = await db.collection("users").insertOne({
			_id: ObjectId(id), 
			...user
		});

		if (result.result.ok !== 1) return null;

		console.log(`${result.insertedCount} record is created in users. (${result.insertedId})`);

		return User.fromDoc(result.ops[0]); // inserted document
		
	} catch (error) {
		throw locateError(error, "UserDbService : addUser");
	}
};




/**
 * Get user
 * @param {Object} query
 * @returns {Promise<User>}
 */
 const getUser = async (query) => {
	try {
		if (query.id) {
			query = { ...query, _id: ObjectId(query.id) };
			delete query.id;
		}

		const db = mongodb.getDatabase();
		const doc = await db.collection("users").findOne(query);

		return User.fromDoc(doc);
		
	} catch (error) {
		throw locateError(error, "UserDbService : getUser");
	}
};




/**
 * Query for users
 * @param {Object} filter - Mongo filter for users
 * @param {Object} sort - Sort option in the format: { field1: 1, field2: -1}
 * @param {number} limit - Maximum number of results per page (default = 20)
 * @param {number} page - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
 const getUsers = async (filter, sort, skip, limit) => {
	try {
		const pipeline = [
			{
			   $match: filter
			},
			{
				$project:{
					_id: 0,
					id: "$_id",
					email: 1,
					role: 1,
					name: 1,
					gender: 1,
					country: 1,
					createdAt: 1,
				}
			},
			{
			   $sort: sort
			},
			{
			   $facet:{
					users: [
						{ 
							$skip: skip 
						}, 
						{ 
							$limit: limit
						}
					],
					total: [
						{
							$count: 'count'
						}
					]
				}
			}
		]

		const db = mongodb.getDatabase();
	   	return await db.collection("users").aggregate(pipeline).toArray();
		
	} catch (error) {
		throw locateError(error, "UserDbService : getUsers");
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
		 console.log("updateUser: ", updateBody);
	   
		 const db = mongodb.getDatabase();
		 const result = await db.collection("users").findOneAndUpdate(
			{ _id: ObjectId(id) },
			{ $set: {...updateBody, updatedAt: Date.now()} },
			{ returnDocument: "after" }
		 );

		 const count = result.value == null ? 0 : 1;
		 console.log(`${count} record is updated in users`);

		 return User.fromDoc(result.value);
		 
	 } catch (error) {
		throw locateError(error, "UserDbService : updateUser");
	 }
};




/**
 * Delete user by id
 * @param {ObjectId} id
 * @returns {Promise<boolean>}
 */
 const deleteUser = async (id) => {
	try {
		console.log("deleteUser: ", id);

		const db = mongodb.getDatabase();
		const result = await db.collection("users").findOneAndDelete({ _id: ObjectId(id) });

		if (result.ok !== 1) return false;
		if (result.value === null) return false;

		console.log(`deleteUser: The user ${id} is deleted in users`);
	
		const user = User.fromDoc(result.value);

		const result2 = await toDeletedUsers(user);
		if (result2 == null) {
			// do not raise error but log the issue
			console.log(`deleteUser: The user ${id} could not added into deletetedusers`);
		}

		return true;

	} catch (error) {
		throw locateError(error, "UserDbService : deleteUser");
	}
};




/**
 * Add the deleted user to the deletedusers
 * @param {User} deletedUser
 * @returns {Promise<User?>}
 */
 const toDeletedUsers = async (deletedUser) => {
	try {
		console.log("toDeletedAuthUsers: ", deletedUser.id);

		deletedUser["_id"] = ObjectId(deletedUser.id);
		delete deletedUser.id;
		deletedUser["deletedAt"] = Date.now();

		const db = mongodb.getDatabase();
		const result = await db.collection("deletedusers").insertOne(deletedUser);

		if (result.result.ok !== 1) return null;
		
		console.log(`${result.insertedCount} record is created in deletedusers. ${result.insertedId}`);

		return result.ops[0]; // deleted User
		
	} catch (error) {
		throw locateError(error, "UserDbService : toDeletedUsers");
	}
};



/**
 * Get deleted user
 * @param {Object} query
 * @returns {Promise<User?>}
 */
 const getDeletedUser = async (query) => {
	try {
		console.log("getDeletedUser: ", query);

		if (query.id) {
			query = { ...query, _id: ObjectId(query.id) };
			delete query.id;
		}

		const db = mongodb.getDatabase();
		const doc = await db.collection("deletedusers").findOne(query);

		return User.fromDoc(doc);
		
	} catch (error) {
		throw locateError(error, "UserDbService : getDeletedUser");
	}
};



module.exports = {
	addUser,
	getUser,
	getUsers,
	updateUser,
	deleteUser,
	getDeletedUser,
};