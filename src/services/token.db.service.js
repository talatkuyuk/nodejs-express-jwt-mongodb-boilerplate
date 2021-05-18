const mongodb = require('../core/mongodb');
const ObjectId = require('mongodb').ObjectId;

const { Token } = require('../models');

/**
 * Save the token to db
 * @param {Token} tokenDoc 
		* {string} token,
		* {ObjectId} user,
		* {Moment} expires,
		* {string} type,
		* {boolean} blacklisted = false,
		* createdAt = Date.now()
 * @returns {Promise<Token>}
 */
const saveToken = async (tokenDoc) => {
	try {
		tokenDoc.user = ObjectId(tokenDoc.user);

		const db = mongodb.getDatabase();
		await db.collection("tokens").insertOne(tokenDoc);
		
		return tokenDoc;
		
	} catch (error) {
		throw error;
	}
};


const findToken = async (query) => {
	try {
		query.user && (query.user = ObjectId(query.user));

		const db = mongodb.getDatabase();
		return await db.collection("tokens").findOne(query);

	} catch (error) {
		throw error;
	}
	
}

const removeToken = async (id) => {
	try {
		const db = mongodb.getDatabase();
		const result = await db.collection("tokens").deleteOne({_id: ObjectId(id)});

		return {isDeleted: result.result.ok === 1, deletedCount: result.deletedCount };
		
	} catch (error) {
		throw error;
	}
}

const removeTokens = async (query) => {
	try {
		query.user && (query.user = ObjectId(query.user));

		const db = mongodb.getDatabase();
		const result = await db.collection("tokens").deleteMany(query);

		return {isDeleted: result.result.ok === 1, deletedCount: result.deletedCount };
		
	} catch (error) {
		throw error;
	}
}


module.exports = {
	findToken,
	saveToken,
	removeToken,
	removeTokens,
};
