const redis = require("../../src/core/redis");

const setupRedis = () => {
  beforeAll(async () => {
    await redis.connect();

    const redisClient = redis.getRedisClient();

    // await new Promise((resolve) => setImmediate(resolve));
    if (redisClient.isOpen) {
      console.log("redis is connected for the tests");
    }
  });

  afterAll(async () => {
    const redisClient = redis.getRedisClient();

    if (redisClient.isOpen) {
      await redis.disconnect();
      // await new Promise((resolve) => setImmediate(resolve));
      if (!redisClient.isOpen) {
        console.log("redis is disconnected for the tests");
      }
    }
  });
};

module.exports = {
  setupRedis,
};
