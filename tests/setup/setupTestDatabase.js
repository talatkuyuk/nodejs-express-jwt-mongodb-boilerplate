const mongodb = require('../../src/core/mongodb');

let database;

const setupTestDatabase = () => {

	beforeAll(async () => {
		await mongodb.connect();
	});


	afterEach(async () => {
		database = mongodb.getDatabase();
		var collections = await database.listCollections().toArray();
		for (let collection of collections) {
			await database.collection(collection.name).deleteMany();
		}
	});

	
	afterAll(async () => {
		await mongodb.disconnect((result) => {
			console.log(`Mongodb connection is closed with ${result}`);
		});

		// lets give sometime to all db connections closed.
		await new Promise(resolve => setTimeout(() => resolve(), 7000));
	});
};

const getTestDatabase = () => database;

module.exports = {
	setupTestDatabase, 
	getTestDatabase
};