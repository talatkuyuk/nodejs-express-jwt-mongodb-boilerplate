const redisClient = require('../../src/utils/cache').getRedisClient();

const setupRedis = () => {

	afterAll(async () => {
		redisClient.quit();
	});

	
};

module.exports = {
	setupRedis,
};