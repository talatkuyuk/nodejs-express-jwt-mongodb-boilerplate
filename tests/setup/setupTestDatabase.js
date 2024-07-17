const mongodb = require("../../src/core/mongodb");

const setupTestDatabase = () => {
  beforeAll(async () => {
    await mongodb.connect();
  });

  afterEach(async () => {
    const database = mongodb.getDatabase();
    const collections = await database.listCollections().toArray();
    for (const collection of collections) {
      await database.collection(collection.name).deleteMany();
    }
  });

  afterAll(async () => {
    await mongodb.disconnect(() => {
      console.log(`Mongodb connection is closed.`);
    });

    // lets give sometime to all db connections closed.
    await new Promise((resolve) =>
      setTimeout(() => {
        resolve(undefined);
      }, 7000),
    );
  });
};

module.exports = {
  setupTestDatabase,
  getTestDatabase: mongodb.getDatabase(),
};
