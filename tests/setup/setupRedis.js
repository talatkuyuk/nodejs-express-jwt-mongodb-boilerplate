const redis = require('../../src/core/redis');

const setupRedis = () => {

	beforeAll(async () => {
		await redis.establisConnection();
	});

	afterAll(async () => {
		redis.getRedisClient().quit();
	});
};

module.exports = {
	setupRedis,
};