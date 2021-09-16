const mongodb = require('../../src/core/mongodb');

const setupTestDatabase = () => {

	beforeAll(async () => {
		await mongodb.connect();
	});

	beforeEach(async () => {
		var database = mongodb.getDatabase();
		var collections = await database.listCollections().toArray();
		for (let collection of collections) {
			await database.collection(collection.name).deleteMany();
		}
	});

	afterAll(async () => {
		await mongodb.disconnect();

		// lets give sometime to all db connections closed.
		await new Promise(resolve => setTimeout(() => resolve(), 5000));

		//jest.useRealTimers();

	});

};


module.exports = setupTestDatabase;