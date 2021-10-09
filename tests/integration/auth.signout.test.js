const request = require('supertest');
const httpStatus = require('http-status');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = require('../../src/core/express');
const config = require('../../src/config');

const { authuserDbService, tokenDbService, tokenService, redisService } = require('../../src/services');
const { AuthUser } = require('../../src/models');
const { tokenTypes } = require('../../src/config/tokens');

const { setupTestDatabase } = require('../setup/setupTestDatabase');
const { setupRedis } = require('../setup/setupRedis');


setupTestDatabase();
setupRedis();


describe('POST /auth/signout', () => {

	jest.setTimeout(50000);

	let accessToken, refreshToken;
	let authuser, tokens;
	const userAgent = "from-jest-test";

	beforeEach(async () => {
		const authUserInstance = AuthUser.fromObject({
			email: 'talat@google.com',
			password: 'HashedPass1word.HashedString.HashedPass1word'
		});

		authuser = await authuserDbService.addAuthUser(authUserInstance);
		tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);

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
				user: authuser.id,
				type: tokenTypes.VERIFY_EMAIL,
				expires: "no-matter-for-this-test",
				family: "no-matter-for-this-test",
				blacklisted: false
			});

			const response = await request(app).post('/auth/signout')
												.set('Authorization', `Bearer ${accessToken}`) 
												.set('User-Agent', userAgent) 
												.send();

			expect(response.status).toBe(httpStatus.NO_CONTENT);

			// check the access token of the authuser is in the blacklist
			const { jti } = jwt.decode(accessToken, config.jwt.secret);
			const result = await redisService.check_jti_in_blacklist(jti);
			expect(result).toBe(true);

			// check the authuser's whole tokens and are removed from db
			const data = await tokenDbService.getTokens({ user: authuser.id });
			expect(data.length).toBe(0);

			// check the authuser is removed from authuser collection in db
			const data1 = await authuserDbService.getAuthUser({ _id: authuser.id });
			expect(data1).toBeNull();

			// check the authuser is moved to deleted authuser collection in db
			const data2 = await authuserDbService.getDeletedAuthUser({ _id: authuser.id });
			expect(data2).not.toBeNull();
			expect(data2.deletedAt).not.toBeNull();
		});
	});
})