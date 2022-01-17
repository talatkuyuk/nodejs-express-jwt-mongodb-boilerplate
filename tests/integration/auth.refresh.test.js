const request = require('supertest');
const httpStatus = require('http-status');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = require('../../src/core/express');
const config = require('../../src/config');

const { authuserDbService, tokenDbService, tokenService, redisService } = require('../../src/services');
const { tokenTypes } = require('../../src/config/tokens');

const TestUtil = require('../testutils/TestUtil');
const testData = require('../testutils/testdata');

const { setupTestDatabase } = require('../setup/setupTestDatabase');
const { setupRedis } = require('../setup/setupRedis');


setupTestDatabase();
setupRedis();


describe('POST /auth/refresh-tokens', () => {

	describe('Refresh Token Validation Errors', () => {

		test('should return 422 Validation Error if refresh token is not in the request body', async () => {
			const response = await request(app).post('/auth/refresh-tokens').send({});

			TestUtil.validationErrorExpectations(response);
			expect(Object.keys(response.body.error.errors).length).toBe(1);
			expect(response.body.error.errors.refreshToken).toEqual(["refresh token must not be empty"]); 
		});
	});


	describe('Failed Refresh Token Rotation', () => {

		const userAgent = "from-jest-test";
		let accessToken, refreshToken, authuserId;
		let refreshTokenId, refreshTokenFamily;

		beforeEach(async () => {
			const { authuser, tokens } = await TestUtil.createAuthUser("talat@google.com", "Pass1word!", userAgent);

			authuserId = authuser.id;
			accessToken = tokens.access.token;
			refreshToken = tokens.refresh.token;
			refreshTokenId = tokens.refresh.id;
			refreshTokenFamily = tokens.refresh.family;
		});


		test('should return 401 if refresh token is not in the db', async () => {
			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', userAgent) 
												.send({ refreshToken: testData.REFRESH_TOKEN_VALID });

			TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
			expect(response.body.error.name).toEqual("ApiError");
			expect(response.body.error.message).toEqual("refresh token is not valid");
		});

		
		test('should return 401 and disable family if refresh token is blacklisted (first time violation)', async () => {
			// Update the refresh token with the { blacklisted: true }
			await tokenService.updateTokenAsBlacklisted(refreshTokenId);

			// add two refresh tokens into db for the user and with the same family, keep them not blacklisted
			// to make further expect is more reasonable related with disable below family tokens, and store both jti into cache as blacklisted
			await tokenDbService.addToken({
				token: testData.REFRESH_TOKEN_VALID,
				user: authuserId,
				type: tokenTypes.REFRESH,
				expires: "no-matter-for-the-test",
				jti: "i-am-supposed-to-be-blacklisted",
				family: refreshTokenFamily,
				blacklisted: false
			});

			await tokenDbService.addToken({
				token: testData.REFRESH_TOKEN_EXPIRED,
				user: authuserId,
				type: tokenTypes.REFRESH,
				expires: "no-matter-for-the-test",
				jti: "i-am-supposed-to-be-blacklisted-too",
				family: refreshTokenFamily,
				blacklisted: false
			});

			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', userAgent) 
												.send({ refreshToken });

			TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
			expect(response.body.error.name).toEqual("ApiError");
			expect(response.body.error.message).toEqual("Unauthorized usage of refresh token has been detected");

			// check the whole refresh token's family are in db // up to now, 3 refresh tokens would be added above
			const data = await tokenDbService.getTokens({ family: refreshTokenFamily });
			expect(data.length).toBe(3);

			// check the all refresh tokens that belong to the family are blacklisted
			const control = data.every( token => token.blacklisted );
			expect(control).toBe(true);

			// check the first refresh token above is added into blacklist cache
			const result1 = await redisService.check_in_blacklist("i-am-supposed-to-be-blacklisted");
			expect(result1).toBe(true);

			// check the second refresh token above is added into blacklist cache as well
			const result2 = await redisService.check_in_blacklist("i-am-supposed-to-be-blacklisted-too");
			expect(result2).toBe(true);
		});


		test('should return 401 and delete family if refresh token is blacklisted (second time violation)', async () => {
			// Update the refresh token with the { blacklisted: true }
			await tokenService.updateTokenAsBlacklisted(refreshTokenId);

			// add two refresh tokens into db for the user and with the same family, but set all as blacklisted for this time
			// to make further expect is more reasonable related with delete family tokens.
			await tokenDbService.addToken({
				token: testData.REFRESH_TOKEN_VALID,
				user: authuserId,
				type: tokenTypes.REFRESH,
				expires: "no-matter-for-the-test",
				jti: "no-matter-for-the-test",
				family: refreshTokenFamily,
				blacklisted: true
			});

			await tokenDbService.addToken({
				token: testData.REFRESH_TOKEN_EXPIRED,
				user: authuserId,
				type: tokenTypes.REFRESH,
				expires: "no-matter-for-the-test",
				jti: "no-matter-for-the-test",
				family: refreshTokenFamily,
				blacklisted: true
			});

			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', userAgent) 
												.send({ refreshToken });

			TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
			expect(response.body.error.name).toEqual("ApiError");
			expect(response.body.error.message).toEqual("Unauthorized usage of refresh token has been detected");

			// check the whole refresh token's family are removed from db // up to now, 3 refresh tokens would be added above
			const data = await tokenDbService.getTokens({ family: refreshTokenFamily });
			expect(data.length).toBe(0);

			// no need to check cache, since access tokens' jtis are already in the blacklist, see the test above
		});


		test('should return 401 if refresh token is expired', async () => {
			// remove the existing refresh token from db for the test
			await tokenService.removeTokens({ token: refreshToken, user: authuserId, type: tokenTypes.REFRESH });

			// produce new expired refresh token for the same authuser
			const { jti } = jwt.decode(accessToken, config.jwt.secret); 
			refreshToken = tokenService.generateToken(authuserId, moment().add(1, 'milliseconds'), tokenTypes.REFRESH, jti, userAgent, 0);

			// put the expired refresh token into db
			await tokenDbService.addToken({
				token: refreshToken,
				user: authuserId,
				type: tokenTypes.REFRESH,
				expires: "no-matter-for-the-test",
				jti: "no-matter-for-the-test",
				family: "i-am-supposed-to-be-deleted",
				blacklisted: false
			});

			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', userAgent) 
												.send({ refreshToken });

			TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
			expect(response.body.error.name).toEqual("ApiError");
			expect(response.body.error.message).toEqual("The refresh token is expired. You have to re-login to get authentication.");

			// check the whole refresh token's family are removed from db
			const data = await tokenDbService.getTokens({ family: "i-am-supposed-to-be-deleted" });
			expect(data.length).toBe(0);
		});


		test('should return 401 if refresh token is used before "not before than" value', async () => {
			// if the refresh token that is generated newly, "not before than" situation happens.
			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', userAgent)
												.send({ refreshToken });

			TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
			expect(response.body.error.name).toEqual("ApiError");
			expect(response.body.error.message).toEqual("Unauthorized usage of refresh token has been detected");

			// no need to check family of the refresh token is removed or blacklisted here since this control is handled in the above tests
			// (means that disableFamilyRefreshToken in Token Service is tested, it is fine.)

			// check the authuser's access token is added into blacklist cache
			const { jti } = jwt.decode(accessToken, config.jwt.secret);
			const result = await redisService.check_in_blacklist(jti);
			expect(result).toBe(true);
		});
	});




	describe('Failed refresh process after Refresh Token JWT Verification', () => {

		const userAgent = "from-jest-test";
		let refreshToken, authuserId;

		beforeEach(async () => {
			const { authuser } = await TestUtil.createAuthUser("talat@google.com", "Pass1word!", userAgent);

			authuserId = authuser.id;

			// create a new refreshtoken for that authuser (not expired but "not valid before" is 0 in order not to be trapped)
			const jti = crypto.randomBytes(16).toString('hex');
			refreshToken = tokenService.generateToken(authuserId, moment().add(5, 'minutes'), tokenTypes.REFRESH, jti, userAgent, 0);

			// save that refresh token into db
			await tokenDbService.addToken({
				token: refreshToken,
				user: authuserId,
				type: tokenTypes.REFRESH,
				expires: "no-matter-for-the-test",
				jti: "no-matter-for-the-test",
				family: "no-matter-for-the-test",
				blacklisted: false
			});
		});


		test('should return 401 if userAgent of refresh token is different from request userAgent', async () => {
			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', "something-different-userAgent") 
												.send({ refreshToken });

			TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
			expect(response.body.error.name).toEqual("ApiError");
			expect(response.body.error.message).toEqual("Your browser/agent seems changed or updated, you have to re-login.");
		});


		test('should return 404 if any authuser could not found', async () => {
			// just to delete the authuser to see the result as not found user.
			await authuserDbService.deleteAuthUser(authuserId);

			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', userAgent) 
												.send({ refreshToken });

			TestUtil.errorExpectations(response, httpStatus.NOT_FOUND);
			expect(response.body.error.name).toEqual("ApiError");
			expect(response.body.error.message).toEqual("No user found");
		});


		test('should return 403 if the authuser is disabled', async () => {
			// just to update the authuser to see the result as the user is disabled.
			await authuserDbService.updateAuthUser(authuserId, { isDisabled: true });

			const response = await request(app).post('/auth/refresh-tokens')
												.set('User-Agent', userAgent) 
												.send({ refreshToken });

			TestUtil.errorExpectations(response, httpStatus.FORBIDDEN);
			expect(response.body.error.name).toEqual("ApiError");
			expect(response.body.error.message).toEqual("You are disabled, call the system administrator");
		});
	});




	describe('Success refresh token response', () => {

		const userAgent = "from-jest-test";

		test('should return status 201; and return valid tokens in json form', async () => {
			const { authuser } = await TestUtil.createAuthUser("talat@google.com", "Pass1word!", userAgent);

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
				success: true,
				data: {
					tokens: TestUtil.ExpectedTokens
				}
			});
		});
	});

})