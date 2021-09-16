const MongoClient = require('mongodb').MongoClient;
const config = require('../config');
const logger = require('../core/logger');

const { userSchema } = require('../schemas/user.schema');
const { authuserSchema } = require('../schemas/authuser.schema');
const { tokenSchema } = require('../schemas/token.schema');

let client, db;

const connect = function() {

	const uri = config.mongodb_url;
	const options = {
		poolSize: 10,
		useNewUrlParser: true, 
		useUnifiedTopology: true }

	// Create a new MongoClient
	client = new MongoClient(uri, options);


	return new Promise(function (resolve, reject) {
		client.connect(function(err, cluster) {
			if (err) {
				console.log("MongoClient connection error. tk.")
				reject(err);
			};
	
			// for testing: list all databases of the MongoClient in terminal
			// cluster.db().admin().listDatabases().then(console.log);
	
			// Establish connection
			const dbName = "apiDB" + (config.env === 'test' ? '-test' : '');
			db = cluster.db(dbName);
			
			// Verify connection
			cluster.db(dbName).command({ ping: 1 })
				.then(() => {
					logger.info("Mongodb connection is established.tk.");
					resolve();
				})
				.catch((err) => {
					logger.info("Mongodb connection has a problem.tk.");
					reject(err);
				});
	
			//TODO: set strict rules and chek if the collection exists
			//db.createCollection("authusers", { validator: { $jsonSchema: authuserSchema } });
			//db.createCollection("users", { validator: { $jsonSchema: userSchema } });
			//db.createCollection("tokens", { validator: { $jsonSchema: tokenSchema } });

		}); 
	});
        
}

const getDatabase = function() {
    return db;
}

const disconnect = function() {

	return new Promise(function (resolve, reject) {
		if (client.isConnected) {
			client.close(true, (err, result) => {
				if (err) throw reject(err);
				logger.info("Mongodb connection is closed.tk");
				resolve();
			});
		} else {
			console.log("Mongodb is already disconnected.tk");
			resolve();
		}
	});
}
      
module.exports = {
	connect,
	getDatabase,
	disconnect
}