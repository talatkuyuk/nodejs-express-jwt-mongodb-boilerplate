const mongodb = require('../core/mongodb');
const ObjectId = require('mongodb').ObjectId;

const { Token } = require('../models');

/**
 * Save a token
 * @param {string} token
 * @param {ObjectId} userId
 * @param {Moment} expires
 * @param {string} type
 * @param {boolean} [blacklisted]
 * @returns {Promise<Token>}
 */
const saveToken = async (token, user, expires, type, blacklisted = false) => {
	try {
		const tokenDoc = new Token(
			token,
			ObjectId(user),
			expires.toDate(),
			type,
			blacklisted,
		);
	
		const db = mongodb.getDatabase();
		await db.collection("tokens").insertOne(tokenDoc);
		return tokenDoc;
		
	} catch (error) {
		throw error;
	}
};


const findToken = async (query) => {
	try {
		const db = mongodb.getDatabase();
		query.user && (query.user = ObjectId(query.user));
		return await db.collection("tokens").findOne(query);

	} catch (error) {
		throw error;
	}
	
}

const removeToken = async (id) => {
	try {
		const db = mongodb.getDatabase();
		return await db.collection("tokens").deleteOne({_id: ObjectId(id)});
		
	} catch (error) {
		throw error;
	}
}

const removeTokens = async (query) => {
	try {
		const db = mongodb.getDatabase();
		query.user && (query.user = ObjectId(query.user));
		return await db.collection("tokens").deleteMany(query);
		
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
