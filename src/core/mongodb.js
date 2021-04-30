const MongoClient = require('mongodb').MongoClient;
const config = require('../config');
const logger = require('../core/logger');

const { userSchema } = require('../schemas/user.schema');
const { authuserSchema } = require('../schemas/authuser.schema');
const { tokenSchema } = require('../schemas/token.schema');

let client, db;

const connect = function(callback) {

	const uri = config.mongodb_url;
	const options = {
		poolSize: 10,
		useNewUrlParser: true, 
		useUnifiedTopology: true }

	// Create a new MongoClient
	client = new MongoClient(uri, options);

	// Connect the client to the server
    client.connect(function(err, cluster) {
		if (err) {
			console.log("MongoClient connection error. tk.")
			throw err;
		};

		// for testing: list all databases of the MongoClient in terminal
		// cluster.db().admin().listDatabases().then(console.log);

		// Establish connection
		db = cluster.db("apiDB");
		
		// Verify connection
		cluster.db("apiDB").command({ ping: 1 }).then(() => {
			logger.info("Mongodb connection is established.tk.");
		});

		//TODO: set strict rules and chek if the collection exists
		//db.createCollection("authusers", { validator: { $jsonSchema: authuserSchema } });
		//db.createCollection("users", { validator: { $jsonSchema: userSchema } });
		//db.createCollection("tokens", { validator: { $jsonSchema: tokenSchema } });

      	return callback( err );
    });     
}

const getDatabase = function() {
    return db;
}

const disconnect = function() {

	// TODO: revise that part, later
	if (client.isConnected) {
		return client.close(true, (err, result) => {
			if (err) throw err;
			console.log("Database is closed.tk")
			client.logout(() => {
				console.log("logged out from database.tk");
			});
		});
	} else {
		console.log("Database is already closed.")
	}
    
}
      
module.exports = {
	connect,
	getDatabase,
	disconnect
}