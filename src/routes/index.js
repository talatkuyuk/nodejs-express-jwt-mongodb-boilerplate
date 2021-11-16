const express = require('express');
const router = express.Router();
//const router = express.Router({ strict: true });

const httpStatus = require('http-status');
const asyncHandler = require('express-async-handler')

const authRoute = require('./auth.route');
const authuserRoute = require('./authuser.route');
const userRoute = require('./user.route');
const joinedRoute = require('./joined.route');
const docsRoute = require('./docs.route');

const mongodb = require('../core/mongodb');
const redis = require('../core/redis');
const config = require('../config');
const { locateError } = require('../utils/ApiError');



// for testing purpose in development environment
router.get('/list', asyncHandler( async (req, res) => {
	try {
		if (config.env === "development") {
			var database = mongodb.getDatabase();
			const response = {};

			const collections = await database.listCollections({}).toArray();

			for (const collection of collections) {
				const result = await database.collection(collection.name).find({}).toArray();
				response[collection.name] = result;
			}

			res.status(httpStatus.OK).json(response);
		} else 
			res.status(httpStatus.OK).json("OK");
		
	} catch (error) {
		throw locateError(error, "RouteIndex : getList");
	}
}));



// for testing purpose in development environment
router.get('/console', (req, res) => {
	try {
		if (config.env === "development") {
			var database = mongodb.getDatabase();
			const collection = "authusers";
		
			// get the first document matched with query
			const query = { email: new RegExp('[^tk]', 'i') };
			database.collection(collection).findOne(query, function(err, doc) {
				if (err) throw err;
				console.log("Query result for the email contains tk : ", doc?.email);
			});
		
			// get the first document
			database.collection(collection).findOne().then(console.log);
		
			// get all documents
			var cursor = database.collection(collection).find();
			cursor.each(function(err, item) {
				if (err) throw err;
				if (item == null) return; // If null, the cursor is end
				console.log(item);
			});
		}
		res.status(httpStatus.OK).json("OK");

	} catch (error) {
		throw locateError(error, "RouteIndex : getConsole");
	}
});



// see the mongodb and redis client status
router.get('/status', asyncHandler( async (req, res) => {

	var database = mongodb.getDatabase();
	var cache = redis.getRedisClient();

	let mongoStatus, redisStatus, environment, port;

	try {
		environment = process.env.NODE_ENV || config.env;
		port = process.env.PORT || req.headers.host.split(':')[1];

		redisStatus = cache?.connected ? "OK" : "DOWN";

		const result = await database.admin().ping();
		mongoStatus = result.ok === 1 ? "OK" : "DOWN";

		res.json({ environment, port, mongoStatus, redisStatus });
		
	} catch (error) {
		res.json({ environment, port, mongoStatus: "DOWN", redisStatus });

		//throw locateError(error, "RouteIndex : getStatus");
		console.log(locateError(error, "RouteIndex : getStatus"));
	}
}));



router.use('/docs', docsRoute);
router.use('/auth', authRoute);
router.use('/authusers', authuserRoute);
router.use('/users', userRoute);
router.use('/joined', joinedRoute);



module.exports = router;