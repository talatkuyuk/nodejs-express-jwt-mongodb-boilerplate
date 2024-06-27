const redis = require("../../src/core/redis");

const setupRedis = () => {
  beforeAll(async () => {
    await redis.connect();
  });

  afterAll(async () => {
    const client = redis.getRedisClient();

    if (client.isOpen) {
      await client.flushAll();
      await client.disconnect();
    }
  });
};

module.exports = {
  setupRedis,
};
