const request = require('supertest');
const httpStatus = require('http-status');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');


const testData = require('../data/testdata');
const { getRedisClient } = require('../../src/core/redis');

const app = require('../../src/core/express');
const { authuserService, tokenService, tokenDbService } = require('../../src/services');
const { AuthUser, Token } = require('../../src/models');
const config = require('../../src/config');
const { tokenTypes } = require('../../src/config/tokens');

const { setupTestDatabase } = require('../setup/setupTestDatabase');
const { setupRedis } = require('../setup/setupRedis');
const { token } = require('morgan');


setupTestDatabase();
setupRedis();


describe('POST /auth/refresh-tokens', () => {

	jest.setTimeout(50000);

	const userAgent = "from-jest-test";

	describe('Refresh Token Validation Errors', () => {

		test('should return 422 Validation Error if refresh token is not in the request body', async () => {

			const response = await request(app).post('/auth/refresh-tokens').send({});

			expect(response.status).toBe(httpStatus.UNPROCESSABLE_ENTITY);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(422);
			expect(response.body.message).toEqual("Validation Error");
			expect(Object.keys(response.body.errors).length).toBe(1);
			expect(response.body.errors.refreshToken).toEqual(["refresh token must not be empty"]); 
		});

	});


	describe('Failed Refresh Token Rotation', () => {

		let accessToken, refreshToken;
		let authuser, tokens;
		
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


		test('should return 401 if refresh token is not in the db', async () => {

			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', userAgent) 
												.send({ refreshToken: testData.REFRESH_TOKEN_VALID });

			expect(response.status).toBe(httpStatus.UNAUTHORIZED);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(401);
			expect(response.body.message).toEqual("The refresh token is not valid");
			expect(response.body.errors).toBeUndefined();
		});

		
		test('should return 401 and disable family if refresh token is blacklisted (if first time violation)', async () => {

			// find the refresh token in db to get id
			const refrehTokenDoc = await tokenDbService.findToken({ token: refreshToken, type: tokenTypes.REFRESH, user: authuser.id });

			// Update the refresh token with the { blacklisted: true }
			await tokenDbService.updateToken(refrehTokenDoc._id, { blacklisted: true });

			// add two refresh tokens into db for the user and with the same family, keep one as not blacklisted
			// to make further expect is more reasonable related with disable family tokens.
			await tokenDbService.saveToken({
				token: testData.REFRESH_TOKEN_VALID,
				user: authuser.id,
				type: tokenTypes.REFRESH,
				expires: "mo-matter-for-test",
				family: refrehTokenDoc.family,
				blacklisted: false
			});

			await tokenDbService.saveToken({
				token: testData.REFRESH_TOKEN_EXPIRED,
				user: authuser.id,
				type: tokenTypes.REFRESH,
				expires: "mo-matter-for-test",
				family: refrehTokenDoc.family,
				blacklisted: true
			});

			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', userAgent) 
												.send({ refreshToken });

			expect(response.status).toBe(httpStatus.UNAUTHORIZED);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(401);
			expect(response.body.message).toEqual("Unauthorized use of the refresh token has been detected. All credentials have been cancelled, you have to re-login to get authentication.");
			expect(response.body.errors).toBeUndefined();

			// check the whole refresh token's family are in db // up to now, 3 refresh tokens are added
			const data = await tokenDbService.findTokens({ family: refrehTokenDoc.family });
			expect(data.length).toBe(3);

			// check the all refresh tokens that belong the family are blacklisted
			const control = data.every( token => token.blacklisted );
			expect(control).toBe(true);

			// check the refresh token {blacklisted: false} one above is added into blacklist cache
			const redisClient = getRedisClient();
			if (redisClient.connected) {
				const { jti } = jwt.decode(testData.REFRESH_TOKEN_VALID, config.jwt.secret);

				const data = await redisClient.get(`blacklist_${jti}`);
				expect(data).toBeDefined();
			};
		});


		test('should return 401 and delete family if refresh token is blacklisted (if second time violation)', async () => {

			// find the refresh token in db to get id
			const refrehTokenDoc = await tokenDbService.findToken({ token: refreshToken, type: tokenTypes.REFRESH, user: authuser.id });

			// Update the refresh token with the { blacklisted: true }
			await tokenDbService.updateToken(refrehTokenDoc._id, { blacklisted: true });

			// add two refresh tokens into db for the user and with the same family, keep all as blacklisted
			// to make further expect is more reasonable related with delete family tokens.
			await tokenDbService.saveToken({
				token: testData.REFRESH_TOKEN_VALID,
				user: authuser.id,
				type: tokenTypes.REFRESH,
				expires: "mo-matter-for-test",
				family: refrehTokenDoc.family,
				blacklisted: true
			});

			await tokenDbService.saveToken({
				token: testData.REFRESH_TOKEN_EXPIRED,
				user: authuser.id,
				type: tokenTypes.REFRESH,
				expires: "mo-matter-for-test",
				family: refrehTokenDoc.family,
				blacklisted: true
			});

			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', userAgent) 
												.send({ refreshToken });

			expect(response.status).toBe(httpStatus.UNAUTHORIZED);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(401);
			expect(response.body.message).toEqual("Unauthorized use of the refresh token has been detected. All credentials have been cancelled, you have to re-login to get authentication.");
			expect(response.body.errors).toBeUndefined();

			// check the whole refresh token's family are removed from db // up to now, 3 refresh tokens are added
			const data = await tokenDbService.findTokens({ family: refrehTokenDoc.family });
			expect(data.length).toBe(0);
		});


		test('should return 401 if refresh token is expired', async () => {

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

			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', userAgent) 
												.send({ refreshToken });

			expect(response.status).toBe(httpStatus.UNAUTHORIZED);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(401);
			expect(response.body.message).toEqual("The refresh token is expired. You have to re-login to get authentication.");
			expect(response.body.errors).toBeUndefined();
		});


		test('should return 401 if refresh token is used before "not before than" value', async () => {

			// if the refresh token generated newly is send, "not before than" situation happens.
			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', userAgent)
												.send({ refreshToken });

			expect(response.status).toBe(httpStatus.UNAUTHORIZED);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(401);
			expect(response.body.message).toEqual("Unauthorized use of the refresh token has been detected. All credentials have been cancelled, you have to re-login to get authentication.");
			expect(response.body.errors).toBeUndefined();

			// no need to check family is removed or blacklisted here since this control is handled in the above tests
			// (means that disableFamilyRefreshToken in Token Service is tested, it is fine.)
		});
	});




	describe('Failed refresh process after Refresh Token Rotation', () => {

		let authuser, refreshToken;
		
		beforeEach(async () => {
			// add an authuser into db
			const authUserInstance = AuthUser.fromObject({
				email: 'talat@google.com',
				password: 'HashedPass1word.HashedString.HashedPass1word'
			});

			authuser = await authuserService.createAuthUser(authUserInstance);

			// create for that authuser refreshtoken (not expired but "not valid before" is 0 in order not to be trapped)
			const jti = crypto.randomBytes(16).toString('hex');
			refreshToken = tokenService.generateToken(authuser.id, moment().add(5, 'minutes'), tokenTypes.REFRESH, jti, userAgent, 0);

			// save that refresh token into db
			await tokenDbService.saveToken({
				token: refreshToken,
				user: authuser.id,
				type: tokenTypes.REFRESH,
				expires: "mo-matter-for-test",
				family: "mo-matter-for-test",
				blacklisted: false
			});
		});

		test('should return 401 if userAgent of refresh token is different from request userAgent', async () => {
			
			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', "something-different-userAgent") 
												.send({ refreshToken });

			expect(response.status).toBe(httpStatus.UNAUTHORIZED);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(401);
			expect(response.body.message).toEqual("Your browser/agent seems changed or updated, you have to re-login to get authentication.");
			expect(response.body.errors).toBeUndefined();
		});


		test('should return 401 if any authuser could not found', async () => {

			// just to delete the authuser to see the result as not found user.
			await authuserService.deleteAuthUser(authuser.id);

			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', userAgent) 
												.send({ refreshToken });

			expect(response.status).toBe(httpStatus.UNAUTHORIZED);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(401);
			expect(response.body.message).toEqual("User not found");
			expect(response.body.errors).toBeUndefined();
		});


		test('should return 401 if the authuser is disabled', async () => {
			// just to update the authuser to see the result as the user is disabled.
			await authuserService.updateAuthUser(authuser.id, { isDisabled: true });

			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', userAgent) 
												.send({ refreshToken });

			expect(response.status).toBe(httpStatus.UNAUTHORIZED);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(401);
			expect(response.body.message).toEqual("You are disabled. Call the system administrator.");
			expect(response.body.errors).toBeUndefined();
		});
	});




	describe('Success refresh token response', () => {

		test('should return status 201 and valid tokens in json form', async () => {

			// add an authuser into db
			const authUserInstance = AuthUser.fromObject({
				email: 'talat@google.com',
				password: 'HashedPass1word.HashedString.HashedPass1word'
			});

			authuser = await authuserService.createAuthUser(authUserInstance);

			// create for that authuser refreshtoken (not expired but "not valid before" is 0 in order not to be trapped)
			const jti = crypto.randomBytes(16).toString('hex');
			const refreshToken = tokenService.generateToken(authuser.id, moment().add(5, 'minutes'), tokenTypes.REFRESH, jti, userAgent, 0);

			// save that refresh token into db
			await tokenDbService.saveToken({
				token: refreshToken,
				user: authuser.id,
				type: tokenTypes.REFRESH,
				expires: "mo-matter-for-test",
				family: "mo-matter-for-test",
				blacklisted: false
			})

			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', userAgent) 
												.send({ refreshToken });

			expect(response.status).toBe(httpStatus.OK);
			expect(response.body).toEqual({
					"access": {
					  "token": expect.any(String),
					  "expires": expect.any(String), // ex. "2021-10-17T09:49:26.735Z"
					},
					"refresh": {
					  "token": expect.any(String),
					  "expires": expect.any(String), 
					},
				});
		});
	});


})