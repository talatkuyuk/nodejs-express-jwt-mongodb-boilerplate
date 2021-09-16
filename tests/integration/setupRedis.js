const { getRedisClient } = require('../../src/utils/cache');

const setupRedis = () => {

	afterAll(async () => {
		getRedisClient().quit();
	});
	
};

module.exports = setupRedis;