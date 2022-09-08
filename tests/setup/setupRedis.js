const redis = require("../../src/core/redis");

const setupRedis = () => {
  beforeAll(async () => {
    await redis.connect();
  });

  afterAll(async () => {
    await redis.disconnect((result) => {
      console.log(`setupRedis: Redis client quit with ${result}`);
    });
  });
};

module.exports = {
  setupRedis,
};
