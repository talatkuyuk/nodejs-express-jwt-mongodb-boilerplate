const express = require('express');
const httpStatus = require('http-status');
const asyncHandler = require('express-async-handler')

const authRoute = require('./auth.route');
const authuserRoute = require('./authuser.route');
const userRoute = require('./user.route');
const docsRoute = require('./docs.route');

const config = require('../config');
const mongodb = require('../core/mongodb');
const redis = require('../core/redis');

const router = express.Router();



function getOneDocumentInCollection(database, collection) {

	// get a document matched with query
	const query = { email: new RegExp(".*" + "tk" + ".*") };
	database.collection(collection).findOne(query, function(err, doc) {
		if (err) throw err;
		console.log("query result: ", doc?.email);
	});

	// Getting the first document
	database.collection(collection).findOne().then(console.log);
}


const listAllCollections = asyncHandler((req, res, next) => {
	var database = mongodb.getDatabase();
	database.listCollections({}).toArray(function(err, collections) {
		let result = "collections: ";
        if (err) throw err;
        collections.forEach(function(collection) {
			result += ` ${collection.name}`
        });
		console.log(result);
		res.status(httpStatus.OK).send(result);
    });
});


function listAllDocumentsInCollection(database, collection) {
	var cursor = database.collection(collection).find();

	cursor.each(function(err, item) {
		if (err) throw err;
		if (item == null) return; // If null, the cursor is end
		console.log(item);
	});

	database.collection(collection).find({}).toArray(function(err, result) {
		if (err) throw err;
		console.log("getting all documents in a collection as array");
		console.log(result);
	});
}


router.get('/', listAllCollections);


router.get('/list', (req, res) => {

	var db = mongodb.getDatabase();
	
	getOneDocumentInCollection(db, "users");
	listAllDocumentsInCollection(db, "users");

});

router.get('/status', asyncHandler( async (req, res) => {

	var database = mongodb.getDatabase();
	var cache = redis.getRedisClient();

	let mongoStatus, redisStatus;

	try {

		redisStatus = cache?.connected ? "OK" : "DOWN";

		const result = await database.admin().ping();
		mongoStatus = result.ok === 1 ? "OK" : "DOWN";

		res.json({ mongoStatus, redisStatus });
		
	} catch (error) {
		res.json({ mongoStatus: "DOWN", redisStatus });
		// throw error;
	}
}));


router.use('/auth', authRoute);
router.use('/authuser', authuserRoute);
router.use('/user', userRoute);

/* istanbul ignore next */
if (config.env === 'development') {
    router.use('/docs', docsRoute);
}

module.exports = router;