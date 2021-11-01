const mongodb = require('../core/mongodb');
const ObjectId = require('mongodb').ObjectId;

const { locateError } = require('../utils/ApiError');
const { AuthUser, User } = require('../models');

const getAuthUserJoined = async (id) => {
	try {
		const pipeline = [
			{
			   	$match: { _id: ObjectId(id) }
			},
			{ 
				$lookup: {
					from: 'users',
					localField: '_id',
					foreignField: '_id',
					as: 'details',
				}
			},
			{ $unwind: { path: "$details", preserveNullAndEmptyArrays: true } },
			{
				$project:{
					email: 1,
					password: 1,
					isEmailVerified: 1,
					isDisabled: 1,
					createdAt: 1,
					services: 1,
					user: "$details",
				}
			},
		]
	
		const db = mongodb.getDatabase();
		const authuserDocContainer = await db.collection("authusers").aggregate(pipeline).toArray();

		let authuser = null, user = null;

		authuserDocContainer && (authuser = AuthUser.fromDoc(authuserDocContainer[0]));
		authuserDocContainer && authuser && (user = User.fromDoc(authuserDocContainer[0]["user"]));

		return { authuser, user };
		
	} catch (error) {
		throw locateError(error, "JoinedDbService : getAuthUserJoined");
	}
};
/**
 * Query for authusers with left outer joined on users
 * @param {Object} filterLeft - Mongo filter for authusers
 * @param {Object} filterRight - Mongo filter for users
 * @param {Object} sort - Sort option in the format: { field1: 1, field2: -1}
 * @param {number} limit - Maximum number of results per page (default = 20)
 * @param {number} page - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
 const getAuthUsersJoined = async (filterLeft, filterRight, sort, skip, limit) => {
	try {
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
				$unwind: { path: "$details", preserveNullAndEmptyArrays: true },
			},
			{
				$project:{
					_id: 0,
					id: "$_id",
					email: 1,
					isEmailVerified: 1,
					isDisabled: 1,
					createdAt: 1,
					services: 1,
					role: "$details.role",
					name: "$details.name",
					gender: "$details.gender",
					country: "$details.country",
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
	   	return await db.collection("authusers").aggregate(pipeline).toArray();
		
	} catch (error) {
		throw locateError(error, "JoinedDbService : getAuthUsersJoined");
	}
};



/**
 * Query for users with left outer joined on authusers
 * @param {Object} filterLeft - Mongo filter for users
 * @param {Object} filterRight - Mongo filter for authusers
 * @param {Object} sort - Sort option in the format: { field1: 1, field2: -1}
 * @param {number} limit - Maximum number of results per page (default = 20)
 * @param {number} page - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
 const getUsersJoined = async (filterLeft, filterRight, sort, skip, limit) => {
	try {
		const pipeline = [
			{
			   $match: filterLeft
			},
			{ 
				$lookup: {
					from: 'authusers',
					localField: '_id',
					foreignField: '_id',
					as: 'details',
				}
			},
			{
				$unwind: { path: "$details", preserveNullAndEmptyArrays: true },
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
					isEmailVerified: "$details.isEmailVerified",
					isDisabled: "$details.isDisabled",
					services: "$details.services",
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
	   throw locateError(error, "JoinedDbService : getUsersJoined");
	}
};



module.exports = {
	getAuthUserJoined,
	getAuthUsersJoined,
	getUsersJoined,
};