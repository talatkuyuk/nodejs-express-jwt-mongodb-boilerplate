const mongodb = require('../core/mongodb');
const ObjectId = require('mongodb').ObjectId;

const { Token } = require('../models');
const { locateError } = require('../utils/ApiError');

/**
 * Save the token to db
 * @param {Token} tokenDoc 
 * @returns {Promise<Token?>}
 */
const addToken = async (tokenDoc) => {
	try {
		tokenDoc.user = ObjectId(tokenDoc.user);

		const db = mongodb.getDatabase();
		const result = await db.collection("tokens").insertOne(tokenDoc);

		if (result.result.ok !== 1) return null;

		console.log(`${result.insertedCount} record is created in tokens. (${result.insertedId})`);

		return Token.fromDoc(result.ops[0]); // inserted document
		
	} catch (error) {
		throw locateError(error, "TokenDbService : addToken");
	}
};



/**
 * Get the token from db
 * @param {Object} query 
 * @returns {Promise<Token>}
 */
const getToken = async (query) => {
	try {
		console.log("getToken: ", query);

		if (query.id) {
			query = { ...query, _id: ObjectId(query.id) };
			delete query.id;
		}

		query.user && (query.user = ObjectId(query.user));

		const db = mongodb.getDatabase();
		const result =  await db.collection("tokens").findOne(query);

		return Token.fromDoc(result);

	} catch (error) {
		throw locateError(error, "TokenDbService : getToken");
	}	
}



/**
 * Get the tokens from db
 * @param {Object} query 
 * @returns {Promise<Object[]>}
 */
const getTokens = async (query) => {
	try {
		console.log("getTokens: ", query);

		query.user && (query.user = ObjectId(query.user));

		const db = mongodb.getDatabase();
		const tokens = await db.collection("tokens").find(query).toArray();

		return tokens;

	} catch (error) {
		throw locateError(error, "TokenDbService : getTokens");
	}	
}



/**
 * Update the token by id in db
 * @param {string | ObjectId} id 
 * @param {Object} updateBody
 * @returns {Promise<Token>}
 */
const updateToken = async (id, updateBody) => {
	try {
		console.log("updateToken: ", id, updateBody);
	  
		const db = mongodb.getDatabase();

		const result = await db.collection("tokens").findOneAndUpdate(
		   { _id: ObjectId(id) }, 
		   { $set: {...updateBody} },
		   { returnOriginal: false }
		);

		console.log(`${result.ok} record is updated in tokens`);

		return Token.fromDoc(result.value);
		
	} catch (error) {
		throw locateError(error, "TokenDbService : updateToken");
	}
};



/**
 * Delete the token from db
 * @param {string | ObjectId} id 
 * @returns {Promise<Object>}
 */
const deleteToken = async (id) => {
	try {
		console.log("deleteToken: ", id);

		const db = mongodb.getDatabase();
		const result = await db.collection("tokens").deleteOne({_id: ObjectId(id)});

		return {isDeleted: result.result.ok === 1, deletedCount: result.deletedCount };
		
	} catch (error) {
		throw locateError(error, "TokenDbService : deleteToken");
	}
}



/**
 * Delete the tokens from db
 * @param {Object} query 
 * @returns {Promise<Object>}
 */
const deleteTokens = async (query) => {
	try {
		console.log("deleteTokens: ", query);

		query.user && (query.user = ObjectId(query.user));

		const db = mongodb.getDatabase();
		const result = await db.collection("tokens").deleteMany(query);

		return {isDeleted: result.result.ok === 1, deletedCount: result.deletedCount };
		
	} catch (error) {
		throw locateError(error, "TokenDbService : deleteTokens");
	}
}


module.exports = {
	addToken,
	getToken,
	getTokens,
	updateToken,
	deleteToken,
	deleteTokens,
};
