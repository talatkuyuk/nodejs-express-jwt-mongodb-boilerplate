const { MongoClient, Db } = require('mongodb');
const config = require('../config');
const logger = require('../core/logger');

const { userSchema } = require('../schemas/user.schema');
const { authuserSchema } = require('../schemas/authuser.schema');
const { tokenSchema } = require('../schemas/token.schema');

const uri = config.mongodb_url;
const options = {
	maxPoolSize: 10,
	serverSelectionTimeoutMS: 5000,
	connectTimeoutMS: 5000,
	socketTimeoutMS: 5000,
}

const dbName = config.mongodb_database + (config.env === 'test' ? '-test' : '');

// Create a new MongoClient
let client = new MongoClient(uri, options);
let db = new Db(client, dbName);

const connect = async function() {

	try {

		// Establish connection
		await client.connect();

		// get the database
		db = client.db(dbName);

		// test the client is live
		await db.command({ ping: 1 });

		// for testing: list all databases of the MongoClient in terminal
		// await client.db().admin().listDatabases().then((data) => console.log(data.databases));

		logger.info("Mongodb connection is established.tk.");

		//TODO: set strict rules and chek if the collection exists
		//db.createCollection("authusers", { validator: { $jsonSchema: authuserSchema } });
		//db.createCollection("users", { validator: { $jsonSchema: userSchema } });
		//db.createCollection("tokens", { validator: { $jsonSchema: tokenSchema } });
		
	} catch (error) {
		logger.error("MongoClient connection error while connecting.tk.");
		throw error;
	}
}


const getDatabase = function() {
    return db;
}


const disconnect = async function(callback) {
	try {
		await client.close();
		callback("OK");

	} catch (error) {
		logger.error("MongoClient connection error while disconnecting.tk.");
		throw error;
	}
}


module.exports = {
	connect,
	getDatabase,
	disconnect
}