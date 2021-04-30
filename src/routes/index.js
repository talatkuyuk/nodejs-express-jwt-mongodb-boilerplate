const express = require('express');

const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const docsRoute = require('./docs.route');

const config = require('../config');
const mongodb = require('../core/mongodb');

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


function listAllCollections(database) {
	database.listCollections({}).toArray(function(err, collections) {
        if (err) throw err;
        collections.forEach(function(collection) {
            console.log(collection.name);
        });
    });
}

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

router.get('/', (req, res) => {

	var db = mongodb.getDatabase();

	listAllCollections(db);
	getOneDocumentInCollection(db, "users");
	listAllDocumentsInCollection(db, "users");

});




router.get('/status', (req, res) => res.send('OK'));

router.use('/auth', authRoute);
router.use('/user', userRoute);

/* istanbul ignore next */
if (config.env === 'development') {
    router.use('/docs', docsRoute);
}

module.exports = router;