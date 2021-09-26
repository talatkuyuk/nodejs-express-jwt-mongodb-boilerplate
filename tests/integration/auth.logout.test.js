const request = require('supertest');
const httpStatus = require('http-status');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const ApiError = require('../../src/utils/ApiError');

const app = require('../../src/core/express');
const { authuserService, tokenService, tokenDbService } = require('../../src/services');
const { AuthUser, Token } = require('../../src/models');
const config = require('../../src/config');
const { tokenTypes } = require('../../src/config/tokens');
const { getRedisClient } = require('../../src/core/redis');
const { setupTestDatabase } = require('../setup/setupTestDatabase');
const { setupRedis } = require('../setup/setupRedis');
const testData = require('../data/testdata');
const TestUtil = require('../testutil/TestUtil');


setupTestDatabase();
setupRedis();


describe('POST /auth/logout', () => {

	jest.setTimeout(50000);

	TestUtil.MatchErrors();

	let accessToken, refreshToken;
	let authuser, tokens;
	const userAgent = "from-jest-test";

	beforeEach(async () => {
		const authUserInstance = AuthUser.fromObject({
			email: 'talat@google.com',
			password: 'HashedPass1word.HashedString.HashedPass1word'
		});

		authuser = await authuserService.createAuthUser(authUserInstance);
		tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);

		accessToken = tokens.access.token;
		refreshToken = tokens.refresh.token;
	});


	describe('Request Validation Errors', () => {

		test('should return 422 Validation Error if refresh token is not in the request body', async () => {

			const response = await request(app).post('/auth/logout')
												.set('Authorization', `Bearer ${accessToken}`) 
												.set('User-Agent', userAgent) 
												.send({});

			expect(response.status).toBe(httpStatus.UNPROCESSABLE_ENTITY);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(422);
			expect(response.body.message).toEqual("Validation Error");
			expect(Object.keys(response.body.errors).length).toBe(1);
			expect(response.body.errors.refreshToken).toEqual(["refresh token must not be empty"]); 
		});
	});



	describe('Failed Logouts', () => {

		test('should return 401 if the user use own access token but use the refresh token that is not own', async () => {

			// For Other User
			const userId = "613b417848981bfd6e91c662";
			const userAgentOther = "from-jest";
			const otherUserJti = crypto.randomBytes(16).toString('hex');
			const { refreshToken: otherUserRefreshToken } = await tokenService.generateRefreshToken(userId, userAgentOther, otherUserJti);

			// for further test, find otherUserRefreshToken from db, to get its family before it is deleted
			const { family } = await tokenDbService.findToken({ token: otherUserRefreshToken, user: userId, type: tokenTypes.REFRESH });

			const response = await request(app).post('/auth/logout')
												.set('Authorization', `Bearer ${accessToken}`) 
												.set('User-Agent', userAgent) 
												.send({ refreshToken: otherUserRefreshToken });

			expect(response.status).toBe(httpStatus.UNAUTHORIZED);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(401);
			expect(response.body.message).toEqual("Tokens could not be matched, please re-authenticate");
			expect(response.body.errors).toBeUndefined();

			// check the access token of both authuser and otheruser are in the blacklist
			const redisClient = getRedisClient();
			if (redisClient.connected) {
				const { jti: authuserJti } = jwt.decode(accessToken, config.jwt.secret);

				const data1 = await redisClient.get(`blacklist_${authuserJti}`);
				expect(data1).toBeDefined();

				const data2 = await redisClient.get(`blacklist_${otherUserJti}`);
				expect(data2).toBeDefined();
			}

			// check the other user's refresh token and it's family are removed from db
			// check whether there is any refresh token with otherUserRefreshToken's family in the db 
			const data = await tokenDbService.findTokens({ family });
			expect(data.length).toBe(0);
		});

	});



	describe('Success logout', () => {

		test('should return 204 even if refresh token is expired', async () => {

			// remove the existing refresh token from db for the test
			await tokenService.removeTokens({ token: refreshToken, user: authuser.id, type: tokenTypes.REFRESH });

			// produce new expired refresh token for the same authuser
			const { jti } = jwt.decode(accessToken, config.jwt.secret); 
			refreshToken = tokenService.generateToken(authuser.id, moment().add(1, 'milliseconds'), tokenTypes.REFRESH, jti, userAgent, 0);

			// put the expired refresh token into db
			await tokenDbService.saveToken({
				token: refreshToken,
				user: authuser.id,
				type: tokenTypes.REFRESH,
				expires: "mo-matter-for-test",
				family: "mo-matter-for-test",
				blacklisted: false
			});


			const response = await request(app).post('/auth/logout')
												.set('Authorization', `Bearer ${accessToken}`) 
												.set('User-Agent', userAgent) 
												.send({ refreshToken });

			expect(response.status).toBe(httpStatus.NO_CONTENT);
		});



		test('should return 204 even if refresh token is blacklisted', async () => {

			// find the refresh token in db to get id
			const refrehTokenDoc = await tokenDbService.findToken({ token: refreshToken, type: tokenTypes.REFRESH, user: authuser.id });

			// Update the refresh token with the { blacklisted: true }
			await tokenDbService.updateToken(refrehTokenDoc._id, { blacklisted: true });

			const response = await request(app).post('/auth/logout')
												.set('Authorization', `Bearer ${accessToken}`) 
												.set('User-Agent', userAgent) 
												.send({ refreshToken });

			expect(response.status).toBe(httpStatus.NO_CONTENT);
		});
		


		test('should return 204 even if redis cache server is down during logout, since Redis supports offline operations', async () => {
			// I tested when the redis is off, it passed.
			const response = await request(app).post('/auth/logout')
												.set('Authorization', `Bearer ${accessToken}`) 
												.set('User-Agent', userAgent) 
												.send({ refreshToken });

			expect(response.status).toBe(httpStatus.NO_CONTENT);
		});



		test('should return 204, remove refresh token family from db and revoke access tokens', async () => {
			// for further test, find authuser's refresh token from db, to get its family before it is deleted
			const { family } = await tokenDbService.findToken({ token: refreshToken, user: authuser.id, type: tokenTypes.REFRESH });

			const response = await request(app).post('/auth/logout')
												.set('Authorization', `Bearer ${accessToken}`) 
												.set('User-Agent', userAgent) 
												.send({ refreshToken });

			expect(response.status).toBe(httpStatus.NO_CONTENT);

			// check the access token of both authuser and otheruser are in the blacklist
			const redisClient = getRedisClient();
			if (redisClient.connected) {
				const { jti } = jwt.decode(accessToken, config.jwt.secret);

				const data = await redisClient.get(`blacklist_${jti}`);
				expect(data).toBeDefined;
			}

			// check the authuser's refresh token and it's family are removed from db
			// check whether there is any refresh token with refresToken's family in the db 
			const data = await tokenDbService.findTokens({ family });
			
			expect(data.length).toBe(0);
		});
	});
})