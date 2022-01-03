const mongodb = require('../core/mongodb');
const { ObjectId, ReturnDocument } = require('mongodb');

const { Token } = require('../models');
const { locateError } = require('../utils/ApiError');

// https://github.com/mongodb/specifications/blob/master/source/crud/crud.rst#write-results
// https://mongodb.github.io/node-mongodb-native/4.2/
// https://mongodb.github.io/node-mongodb-native/3.6/reference/unified-topology/

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

		if (!result.acknowledged) return null;

		console.log(`1 record is created in tokens. (${result.insertedId})`);

		// get the inserted document back
		const tokenInserted = await db.collection("tokens").findOne({ _id: result.insertedId });

		return Token.fromDoc(tokenInserted);
		
	} catch (error) {
		throw locateError(error, "TokenDbService : addToken");
	}
};



/**
 * Get the token from db
 * @param {Object} query
 * @returns {Promise<Token?>}
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
		const tokens = await db.collection("tokens")
			.find(query)
			.project({ _id: 0, id: "$_id", token: 1, user: 1, expires: 1, type: 1, jti: 1, family: 1, blacklisted: 1,  createdAt: 1 })
			.toArray();

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
		   { returnDocument: ReturnDocument.AFTER }
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
		const result = await db.collection("tokens").deleteOne({ _id: ObjectId(id) });

		return {isDeleted: result.acknowledged, deletedCount: result.deletedCount };
		
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

		return {isDeleted: result.acknowledged, deletedCount: result.deletedCount };
		
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
