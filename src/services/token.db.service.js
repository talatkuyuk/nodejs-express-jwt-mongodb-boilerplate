const mongodb = require('../core/mongodb');
const ObjectId = require('mongodb').ObjectId;

const { Token } = require('../models');

/**
 * Save the token to db
 * @param {Token} tokenDoc 
 * @returns {Promise<Token>}
 */
const saveToken = async (tokenDoc) => {
	try {
		tokenDoc.user = ObjectId(tokenDoc.user);

		const db = mongodb.getDatabase();
		const result = await db.collection("tokens").insertOne(tokenDoc);

		console.log(`${result.insertedCount} record is created in tokens.`);
		
	} catch (error) {
		throw error;
	}
};


const findToken = async (query) => {
	try {
		console.log("findToken: ", query);

		query.user && (query.user = ObjectId(query.user));

		const db = mongodb.getDatabase();
		const tokenDoc =  await db.collection("tokens").findOne(query);

		return tokenDoc;

	} catch (error) {
		throw error;
	}	
}


const findTokens = async (query) => {
	try {
		console.log("findTokens: ", query);

		query.user && (query.user = ObjectId(query.user));

		const db = mongodb.getDatabase();
		const tokens = await db.collection("tokens").find(query).toArray();

		return tokens;

	} catch (error) {
		throw error;
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

		const token = Token.fromDoc(result.value);
		return token;
		
	} catch (error) {
	   throw error
	}
};


const removeToken = async (id) => {
	try {
		console.log("removeToken: ", id);

		const db = mongodb.getDatabase();
		const result = await db.collection("tokens").deleteOne({_id: ObjectId(id)});

		return {isDeleted: result.result.ok === 1, deletedCount: result.deletedCount };
		
	} catch (error) {
		throw error;
	}
}

const removeTokens = async (query) => {
	try {
		console.log("removeTokens: ", query);

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
	findTokens,
	saveToken,
	updateToken,
	removeToken,
	removeTokens,
};
