const request = require('supertest');
const httpStatus = require('http-status');
const jwt = require('jsonwebtoken');

const app = require('../../src/core/express');
const config = require('../../src/config');

const { authuserDbService, tokenDbService, redisService } = require('../../src/services');
const { tokenTypes } = require('../../src/config/tokens');

const TestUtil = require('../testutils/TestUtil');

const { setupTestDatabase } = require('../setup/setupTestDatabase');
const { setupRedis } = require('../setup/setupRedis');


setupTestDatabase();
setupRedis();


describe('POST /auth/signout', () => {

	const userAgent = "from-jest-test";
	let accessToken, refreshToken, authuserId;

	beforeEach(async () => {
		const { authuser, tokens } = await TestUtil.createAuthUser("talat@google.com", "Pass1word!", userAgent);

		authuserId = authuser.id;
		accessToken = tokens.access.token;
		refreshToken = tokens.refresh.token;
	});

	// Since the process of signout is the same with logout mostly, especially considering failures; 
	// It is enough here to test only success signout 

	describe('Success signout', () => {

		test('should return 204, remove refresh token of the authuser from db and revoke access tokens', async () => {

			// add a token into db for the user, to make further expect is more reasonable related with removal the user's whole tokens.
			await tokenDbService.addToken({
				token: "no-matter-for-this-test",
				user: authuserId,
				type: tokenTypes.VERIFY_EMAIL,
				expires: "no-matter-for-this-test",
				family: "no-matter-for-this-test",
				blacklisted: false
			});

			const response = await request(app).post('/auth/signout')
												.set('Authorization', `Bearer ${accessToken}`) 
												.set('User-Agent', userAgent) 
												.send();

			expect(response.status).toBe(httpStatus.OK);
			expect(response.body.success).toBe(true);

			// check the access token of the authuser is in the blacklist
			const { jti } = jwt.decode(accessToken, config.jwt.secret);
			const result = await redisService.check_in_blacklist(jti);
			expect(result).toBe(true);

			// check the authuser's whole tokens and are removed from db
			const data = await tokenDbService.getTokens({ user: authuserId });
			expect(data.length).toBe(0);

			// check the authuser is removed from authuser collection in db
			const data1 = await authuserDbService.getAuthUser({ id: authuserId });
			expect(data1).toBeNull();

			// check the authuser is moved to deleted authuser collection in db
			const data2 = await authuserDbService.getDeletedAuthUser({ id: authuserId });
			expect(data2).not.toBeNull();
			expect(data2.deletedAt).not.toBeNull();
		});
	});
})