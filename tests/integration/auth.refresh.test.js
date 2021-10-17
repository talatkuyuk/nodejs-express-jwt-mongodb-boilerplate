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

const testData = require('../data/testdata');

const { setupTestDatabase } = require('../setup/setupTestDatabase');
const { setupRedis } = require('../setup/setupRedis');


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
			expect(response.body.name).toEqual("ValidationError");
			expect(response.body.message).toEqual("The request could not be validated");
			expect(response.body).not.toHaveProperty("description");
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

			authuser = await authuserDbService.addAuthUser(authUserInstance);
			tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);

			accessToken = tokens.access.token;
			refreshToken = tokens.refresh.token;
		});

		function commonExpectations(response, status) {
			expect(response.status).toBe(status);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(status);
			expect(response.body).toHaveProperty("description");
			expect(response.body).not.toHaveProperty("errors");
		}


		test('should return 401 if refresh token is not in the db', async () => {

			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', userAgent) 
												.send({ refreshToken: testData.REFRESH_TOKEN_VALID });

			commonExpectations(response, httpStatus.UNAUTHORIZED);
			expect(response.body.name).toEqual("ApiError");
			expect(response.body.message).toEqual("refresh token is not valid");
		});

		
		test('should return 401 and disable family if refresh token is blacklisted (first time violation)', async () => {

			// find the refresh token in db to get id
			const refrehTokenDoc = await tokenDbService.getToken({ token: refreshToken, type: tokenTypes.REFRESH, user: authuser.id });

			// Update the refresh token with the { blacklisted: true }
			await tokenService.updateTokenAsBlacklisted(refrehTokenDoc.id);

			// add two refresh tokens into db for the user and with the same family, keep them not blacklisted
			// to make further expect is more reasonable related with disable below family tokens, and store both jti into cache as blacklisted
			await tokenDbService.addToken({
				token: testData.REFRESH_TOKEN_VALID,
				user: authuser.id,
				type: tokenTypes.REFRESH,
				expires: "no-matter-for-the-test",
				jti: "i-am-supposed-to-be-blacklisted",
				family: refrehTokenDoc.family,
				blacklisted: false
			});

			await tokenDbService.addToken({
				token: testData.REFRESH_TOKEN_EXPIRED,
				user: authuser.id,
				type: tokenTypes.REFRESH,
				expires: "no-matter-for-the-test",
				jti: "i-am-supposed-to-be-blacklisted-too",
				family: refrehTokenDoc.family,
				blacklisted: false
			});

			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', userAgent) 
												.send({ refreshToken });

			commonExpectations(response, httpStatus.UNAUTHORIZED);
			expect(response.body.name).toEqual("ApiError");
			expect(response.body.message).toEqual("Unauthorized usage of refresh token has been detected");

			// check the whole refresh token's family are in db // up to now, 3 refresh tokens would be added above
			const data = await tokenDbService.getTokens({ family: refrehTokenDoc.family });
			expect(data.length).toBe(3);

			// check the all refresh tokens that belong to the family are blacklisted
			const control = data.every( token => token.blacklisted );
			expect(control).toBe(true);

			// check the first refresh token above is added into blacklist cache
			const result1 = await redisService.check_jti_in_blacklist("i-am-supposed-to-be-blacklisted");
			expect(result1).toBe(true);

			// check the second refresh token above is added into blacklist cache as well
			const result2 = await redisService.check_jti_in_blacklist("i-am-supposed-to-be-blacklisted-too");
			expect(result2).toBe(true);
		});


		test('should return 401 and delete family if refresh token is blacklisted (second time violation)', async () => {

			// find the refresh token in db to get id
			const refrehTokenDoc = await tokenDbService.getToken({ token: refreshToken, type: tokenTypes.REFRESH, user: authuser.id });

			// Update the refresh token with the { blacklisted: true }
			await tokenService.updateTokenAsBlacklisted(refrehTokenDoc.id);

			// add two refresh tokens into db for the user and with the same family, but set all as blacklisted for this time
			// to make further expect is more reasonable related with delete family tokens.
			await tokenDbService.addToken({
				token: testData.REFRESH_TOKEN_VALID,
				user: authuser.id,
				type: tokenTypes.REFRESH,
				expires: "no-matter-for-the-test",
				jti: "no-matter-for-the-test",
				family: refrehTokenDoc.family,
				blacklisted: true
			});

			await tokenDbService.addToken({
				token: testData.REFRESH_TOKEN_EXPIRED,
				user: authuser.id,
				type: tokenTypes.REFRESH,
				expires: "no-matter-for-the-test",
				jti: "no-matter-for-the-test",
				family: refrehTokenDoc.family,
				blacklisted: true
			});

			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', userAgent) 
												.send({ refreshToken });

			commonExpectations(response, httpStatus.UNAUTHORIZED);
			expect(response.body.name).toEqual("ApiError");
			expect(response.body.message).toEqual("Unauthorized usage of refresh token has been detected");

			// check the whole refresh token's family are removed from db // up to now, 3 refresh tokens would be added above
			const data = await tokenDbService.getTokens({ family: refrehTokenDoc.family });
			expect(data.length).toBe(0);

			// no need to check cache, since access tokens' jtis are already in the blacklist, see the test above
		});


		test('should return 401 if refresh token is expired', async () => {

			// remove the existing refresh token from db for the test
			await tokenService.removeTokens({ token: refreshToken, user: authuser.id, type: tokenTypes.REFRESH });

			// produce new expired refresh token for the same authuser
			const { jti } = jwt.decode(accessToken, config.jwt.secret); 
			refreshToken = tokenService.generateToken(authuser.id, moment().add(1, 'milliseconds'), tokenTypes.REFRESH, jti, userAgent, 0);

			// put the expired refresh token into db
			await tokenDbService.addToken({
				token: refreshToken,
				user: authuser.id,
				type: tokenTypes.REFRESH,
				expires: "no-matter-for-the-test",
				jti: "no-matter-for-the-test",
				family: "i-am-supposed-to-be-deleted",
				blacklisted: false
			});

			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', userAgent) 
												.send({ refreshToken });

			commonExpectations(response, httpStatus.UNAUTHORIZED);
			expect(response.body.name).toEqual("ApiError");
			expect(response.body.message).toEqual("The refresh token is expired. You have to re-login to get authentication.");

			// check the whole refresh token's family are removed from db
			const data = await tokenDbService.getTokens({ family: "i-am-supposed-to-be-deleted" });
			expect(data.length).toBe(0);
		});


		test('should return 401 if refresh token is used before "not before than" value', async () => {

			// if the refresh token that is generated newly, "not before than" situation happens.
			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', userAgent)
												.send({ refreshToken });

			commonExpectations(response, httpStatus.UNAUTHORIZED);
			expect(response.body.name).toEqual("ApiError");
			expect(response.body.message).toEqual("Unauthorized usage of refresh token has been detected");

			// no need to check family of the refresh token is removed or blacklisted here since this control is handled in the above tests
			// (means that disableFamilyRefreshToken in Token Service is tested, it is fine.)

			// check the authuser's access token is added into blacklist cache
			const { jti } = jwt.decode(accessToken, config.jwt.secret);
			const result = await redisService.check_jti_in_blacklist(jti);
			expect(result).toBe(true);
		});
	});




	describe('Failed refresh process after Refresh Token JWT Verification', () => {

		let authuser, refreshToken;
		
		beforeEach(async () => {
			
			const authUserInstance = AuthUser.fromObject({
				email: 'talat@google.com',
				password: 'HashedPass1word.HashedString.HashedPass1word'
			});

			// add an authuser into db
			authuser = await authuserDbService.addAuthUser(authUserInstance);

			// create for that authuser refreshtoken (not expired but "not valid before" is 0 in order not to be trapped)
			const jti = crypto.randomBytes(16).toString('hex');
			refreshToken = tokenService.generateToken(authuser.id, moment().add(5, 'minutes'), tokenTypes.REFRESH, jti, userAgent, 0);

			// save that refresh token into db
			await tokenDbService.addToken({
				token: refreshToken,
				user: authuser.id,
				type: tokenTypes.REFRESH,
				expires: "no-matter-for-the-test",
				jti: "no-matter-for-the-test",
				family: "no-matter-for-the-test",
				blacklisted: false
			});
		});

		function commonExpectations(response, status) {
			expect(response.status).toBe(status);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(status);
			expect(response.body).toHaveProperty("description");
			expect(response.body).not.toHaveProperty("errors");
		}


		test('should return 401 if userAgent of refresh token is different from request userAgent', async () => {
			
			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', "something-different-userAgent") 
												.send({ refreshToken });

			commonExpectations(response, httpStatus.UNAUTHORIZED);
			expect(response.body.name).toEqual("ApiError");
			expect(response.body.message).toEqual("Your browser/agent seems changed or updated, you have to re-login to get authentication.");
		});


		test('should return 404 if any authuser could not found', async () => {

			// just to delete the authuser to see the result as not found user.
			await authuserDbService.deleteAuthUser(authuser.id);

			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', userAgent) 
												.send({ refreshToken });

			commonExpectations(response, httpStatus.NOT_FOUND);
			expect(response.body.name).toEqual("ApiError");
			expect(response.body.message).toEqual("No user found");
		});


		test('should return 403 if the authuser is disabled', async () => {
			// just to update the authuser to see the result as the user is disabled.
			await authuserDbService.updateAuthUser(authuser.id, { isDisabled: true });

			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', userAgent) 
												.send({ refreshToken });

			commonExpectations(response, httpStatus.FORBIDDEN);
			expect(response.body.name).toEqual("ApiError");
			expect(response.body.message).toEqual("You are disabled, call the system administrator");
		});
	});




	describe('Success refresh token response', () => {

		test('should return status 201; and return valid tokens in json form', async () => {

			// add an authuser into db
			const authUserInstance = AuthUser.fromObject({
				email: 'talat@google.com',
				password: 'HashedPass1word.HashedString.HashedPass1word'
			});

			authuser = await authuserDbService.addAuthUser(authUserInstance);

			// create for that authuser refreshtoken (not expired but "not valid before" is 0 in order not to be trapped)
			const jti = crypto.randomBytes(16).toString('hex');
			const refreshToken = tokenService.generateToken(authuser.id, moment().add(5, 'minutes'), tokenTypes.REFRESH, jti, userAgent, 0);

			// save that refresh token into db
			await tokenDbService.addToken({
				token: refreshToken,
				user: authuser.id,
				type: tokenTypes.REFRESH,
				expires: "no-matter-for-the-test",
				jti: "no-matter-for-the-test",
				family: "no-matter-for-the-test",
				blacklisted: false
			})

			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', userAgent) 
												.send({ refreshToken });

			expect(response.status).toBe(httpStatus.OK);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));

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