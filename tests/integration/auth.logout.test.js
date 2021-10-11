const request = require('supertest');
const httpStatus = require('http-status');
const jwt = require('jsonwebtoken');

const app = require('../../src/core/express');
const config = require('../../src/config');

const { authuserDbService, tokenDbService, tokenService, redisService } = require('../../src/services');
const { AuthUser } = require('../../src/models');
const { tokenTypes } = require('../../src/config/tokens');

const { setupTestDatabase } = require('../setup/setupTestDatabase');
const { setupRedis } = require('../setup/setupRedis');


setupTestDatabase();
setupRedis();


describe('POST /auth/logout', () => {

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



	describe('Failed logout', () => {

		test('should return 401 if the refresh token is blacklisted', async () => {
			// this proplem may happen the refresh token is used before than valid ONE-TIME (refresh token rotation)
			// it requires also the redis down at the moment of refresh token rotation, causing the access token in not blacklisted

			// Update the refresh token with the { blacklisted: true } in order to produce problem
			const { id } = await tokenDbService.getToken({ token: refreshToken, type: tokenTypes.REFRESH, user: authuser.id });
			await tokenDbService.updateToken(id, { blacklisted: true });

			const response = await request(app).post('/auth/logout')
												.set('Authorization', `Bearer ${accessToken}`) 
												.set('User-Agent', userAgent) 
												.send();

			expect(response.status).toBe(httpStatus.UNAUTHORIZED);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(401);
			expect(response.body).toHaveProperty("name");
			expect(response.body.message).toEqual("refresh token is in the blacklist");
			expect(response.body).toHaveProperty("description");
			expect(response.body).not.toHaveProperty("errors");
		});


		test('should return 401 if the refresh token is not found in db using the query on user and jti', async () => {
			// this proplem may happen the same refresh token is used before than valid TWO-TIMES (refresh token rotation)
			// it requires also the redis down at the moment of refresh token rotation, causing the access token in not blacklisted

			// delete the refresh token from db in order to produce problem
			await tokenDbService.deleteTokens({ token: refreshToken, user: authuser.id, type: tokenTypes.REFRESH });

			const response = await request(app).post('/auth/logout')
												.set('Authorization', `Bearer ${accessToken}`) 
												.set('User-Agent', userAgent) 
												.send();

			expect(response.status).toBe(httpStatus.UNAUTHORIZED);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(401);
			expect(response.body).toHaveProperty("name");
			expect(response.body.message).toEqual("refresh token is not valid");
			expect(response.body).toHaveProperty("description");
			expect(response.body).not.toHaveProperty("errors");
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
												
			expect(response.status).toBe(httpStatus.FORBIDDEN);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(403);
			expect(response.body).toHaveProperty("name");
			expect(response.body.message).toEqual("Access token is in the blacklist");
			expect(response.body).toHaveProperty("description");
			expect(response.body).not.toHaveProperty("errors");
		});

	});



	describe('Success logout', () => {

		test('should return 204 even if redis cache server is down during logout', async () => {
			
			console.log("Stop Redis manually");
			await new Promise(resolve => setTimeout(resolve, 10000));

			const response = await request(app).post('/auth/logout')
												.set('Authorization', `Bearer ${accessToken}`) 
												.set('User-Agent', userAgent) 
												.send();

			expect(response.status).toBe(httpStatus.NO_CONTENT);

			console.log("Restart Redis manually if it is stopped");
			await new Promise(resolve => setTimeout(resolve, 10000));
		});



		test('should return 204, remove refresh token family from db and revoke access tokens', async () => {
			
			// for further test, find authuser's refresh token from db, to get its family and jti before it is deleted
			const { jti, family } = await tokenDbService.getToken({ token: refreshToken, user: authuser.id, type: tokenTypes.REFRESH });

			const response = await request(app).post('/auth/logout')
												.set('Authorization', `Bearer ${accessToken}`) 
												.set('User-Agent', userAgent) 
												.send();

			expect(response.status).toBe(httpStatus.NO_CONTENT);

			// check the access token of the authuser is in the blacklist
			const result = await redisService.check_jti_in_blacklist(jti);
			expect(result).toBe(true);

			// check whether there is any refresh token with refresToken's family in the db 
			const data = await tokenDbService.getTokens({ family });
			expect(data.length).toBe(0);
		});
	});
})