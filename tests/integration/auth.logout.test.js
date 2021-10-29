const request = require('supertest');
const httpStatus = require('http-status');
const shell = require('shelljs'); // in order to shotdown and restart redis to test behavior

const app = require('../../src/core/express');
const config = require('../../src/config');

const { tokenDbService, redisService } = require('../../src/services');

const { tokenTypes } = require('../../src/config/tokens');

const TestUtil = require('../testutil/TestUtil');

const { setupTestDatabase } = require('../setup/setupTestDatabase');
const { setupRedis } = require('../setup/setupRedis');


setupTestDatabase();
setupRedis();


describe('POST /auth/logout', () => {

	const userAgent = "from-jest-test";
	let accessToken, refreshToken, authuserId;
	let refreshTokenId, refreshTokenJti, refreshTokenFamily;

	beforeEach(async () => {
		const { authuser, tokens } = await TestUtil.createAuthUser("talat@google.com", "Pass1word!", userAgent);

		authuserId = authuser.id;
		accessToken = tokens.access.token;
		refreshToken = tokens.refresh.token;
		refreshTokenId = tokens.refresh.id;
		refreshTokenJti = tokens.refresh.jti;
		refreshTokenFamily = tokens.refresh.family;
	});


	describe('Failed logout', () => {

		test('should return 401 if the refresh token is blacklisted', async () => {
			// this proplem may happen the refresh token is used before than valid ONE-TIME (refresh token rotation)
			// it requires also the redis down at the moment of refresh token rotation, causing the access token in not blacklisted

			// Update the refresh token with the { blacklisted: true } in order to produce problem
			await tokenDbService.updateToken(refreshTokenId, { blacklisted: true });

			const response = await request(app).post('/auth/logout')
												.set('Authorization', `Bearer ${accessToken}`) 
												.set('User-Agent', userAgent) 
												.send();

			TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
			expect(response.body.name).toEqual("ApiError");
			expect(response.body.message).toEqual("refresh token is in the blacklist");
		});


		test('should return 401 if the refresh token is not found in db using the query on user and jti', async () => {
			// this proplem may happen the same refresh token is used before than valid TWO-TIMES (refresh token rotation)
			// it requires also the redis down at the moment of refresh token rotation, causing the access token in not blacklisted

			// delete the refresh token from db in order to produce problem
			await tokenDbService.deleteTokens({ token: refreshToken, user: authuserId, type: tokenTypes.REFRESH });

			const response = await request(app).post('/auth/logout')
												.set('Authorization', `Bearer ${accessToken}`) 
												.set('User-Agent', userAgent) 
												.send();

			TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
			expect(response.body.name).toEqual("ApiError");
			expect(response.body.message).toEqual("refresh token is not valid");
		});


		test('should return 403 in case the refresh token is used before than valid', async () => {

			// use /auth/refresh-tokens before than valid in order to produce problem
			await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', userAgent) 
												.send({ refreshToken });

			const response = await request(app).post('/auth/logout')
												.set('Authorization', `Bearer ${accessToken}`) 
												.set('User-Agent', userAgent) 
												.send();
										
			TestUtil.errorExpectations(response, httpStatus.FORBIDDEN);
			expect(response.body.name).toEqual("ApiError");
			expect(response.body.message).toEqual("Access token is in the blacklist");
		});

	});



	describe('Success logout', () => {

		jest.setTimeout(50000);

		test('should return 204 even if redis cache server is down during logout', async () => {
			console.log("Redis is getting closed intentionally for the test...");
			shell.exec('npm run redis:stop');
			await new Promise(resolve => setTimeout(resolve, 10000));

			const response = await request(app).post('/auth/logout')
												.set('Authorization', `Bearer ${accessToken}`) 
												.set('User-Agent', userAgent) 
												.send();

			if (config.raiseErrorWhenRedisDown) {
				TestUtil.errorExpectations(response, httpStatus.INTERNAL_SERVER_ERROR);
				expect(response.body.name).toEqual("ApiError");
				expect(response.body.message).toEqual(`We've encountered a server internal problem (Redis)`);

			} else {
				expect(response.status).toBe(httpStatus.NO_CONTENT);
			}

			console.log("Redis is getting re-started intentionally for the test...");
			shell.exec('npm run redis:restart');
			await new Promise(resolve => setTimeout(resolve, 10000));
		});



		test('should return 204, remove refresh token family from db and revoke access tokens', async () => {
			const response = await request(app).post('/auth/logout')
												.set('Authorization', `Bearer ${accessToken}`) 
												.set('User-Agent', userAgent) 
												.send();

			expect(response.status).toBe(httpStatus.NO_CONTENT);

			// check the access token of the authuser is in the blacklist
			const result = await redisService.check_jti_in_blacklist(refreshTokenJti);
			expect(result).toBe(true);

			// check whether there is any refresh token with refresToken's family in the db 
			const data = await tokenDbService.getTokens({ family: refreshTokenFamily });
			expect(data.length).toBe(0);
		});
	});
})