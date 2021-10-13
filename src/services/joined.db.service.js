const mongodb = require('../core/mongodb');
const ObjectId = require('mongodb').ObjectId;

const { locateError } = require('../utils/ApiError');
const { AuthUser } = require('../models');

const getAuthUserWithRole = async (id) => {
	try {
		const db = mongodb.getDatabase();
	
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
			{
				$project:{
					email: 1,
					isEmailVerified: 1,
					isDisabled: 1,
					createdAt: 1,
					services: 1,
					role: { $arrayElemAt: [ "$details.role", 0 ] },
				}
			},
		]
	
		const authuserDocContainer = await db.collection("authusers").aggregate(pipeline).toArray();
	   	return AuthUser.fromDoc(authuserDocContainer[0]);
		
	} catch (error) {
		throw locateError(error, "JoinedDbService : getAuthUserWithRole");
	}
};
/**
 * Query for authusers joined with users
 * @param {Object} filterLeft - Mongo filter for authusers
 * @param {Object} filterRight - Mongo filter for users
 * @param {Object} sort - Sort option in the format: { field1: 1, field2: -1}
 * @param {number} limit - Maximum number of results per page (default = 20)
 * @param {number} page - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
 const getAuthUsersJoined = async (filterLeft, filterRight, sort, skip, limit) => {
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
					_id: 0,
					id: "$_id",
					email: 1,
					isEmailVerified: 1,
					isDisabled: 1,
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
	
	   return await db.collection("authusers").aggregate(pipeline).toArray();
		
	} catch (error) {
		throw locateError(error, "JoinedDbService : getAuthUsersJoined");
	}
};



/**
 * Query for users joined with authusers
 * @param {Object} filterLeft - Mongo filter for users
 * @param {Object} filterRight - Mongo filter for authusers
 * @param {Object} sort - Sort option in the format: { field1: 1, field2: -1}
 * @param {number} limit - Maximum number of results per page (default = 20)
 * @param {number} page - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
 const getUsersJoined = async (filterLeft, filterRight, sort, skip, limit) => {
	try {
		const db = mongodb.getDatabase();
	
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
			   $unwind: "$details"
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
					isEmailVerified: "$details.isEmailVerified",
					isDisabled: "$details.isDisabled",
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
	
	   return await db.collection("users").aggregate(pipeline).toArray();
		
	} catch (error) {
	   throw locateError(error, "JoinedDbService : getUsersJoined");
	}
};



module.exports = {
	getAuthUserWithRole,
	getAuthUsersJoined,
	getUsersJoined,
};