const request = require('supertest');
const httpStatus = require('http-status');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const httpMocks = require('node-mocks-http');
const ApiError = require('../../src/utils/ApiError');
const {serializeError} = require('serialize-error');
const { auth } = require('../../src/middlewares/auth');
const testData = require('../setup-data/testData');
const redisClient = require('../../src/utils/cache').getRedisClient();
const app = require('../../src/core/express');
const authuserService = require('../../src/services/authuser.service');
const tokenService = require('../../src/services/token.service');
const { AuthUser, Token } = require('../../src/models');
const config = require('../../src/config');
const { tokenTypes } = require('../../src/config/tokens');

const { setupTestDatabase } = require('../setup-data/setupTestDatabase');
const { setupRedis } = require('../setup-data/setupRedis');


setupTestDatabase();
setupRedis();


describe('Auth Middleware', () => {

	jest.setTimeout(50000);

	expect.extend({
		toBeMatchedWithError(received, expected) {
			// Error objects are weird, so need to use serialize-error package.
			const { name: rName, message: rMessage, statusCode: rCode } = serializeError(received);
			const { name: eName, message: eMessage, statusCode: eCode } = serializeError(expected);

			const check = (r, e) => r === e || console.log(`Expected: ${e}\nReceived: ${r}`);

			const passName = check(rName, eName);
			const passMessage = check(rMessage, eMessage);
			const passCode = check(rCode, eCode);
			
			return { pass: passName && passMessage && passCode };
		},
	});

	// function params: (Object, Error)
	const commonHeaderTestProcess = async (requestHeader, expectedError) => {
		const req = httpMocks.createRequest(requestHeader);
		const res = httpMocks.createResponse();
		const next = jest.fn();

		await auth()(req, res, next);
		
		expect(next).toHaveBeenCalledWith(expect.any(ApiError));
		expect(next).toHaveBeenCalledWith(expect.toBeMatchedWithError(expectedError));
	}

	describe('Request Header and Access Token Errors', () => {

		test('should return ApiError with code 401, if Authorization Header is absent', async () => {
			const requestHeader = null;
			const expectedError = new ApiError(httpStatus.UNAUTHORIZED, "TokenError: No auth token");
			await commonHeaderTestProcess(requestHeader, expectedError);
		});


		test('should return ApiError with code 401, if Authorization Header is bad formed without Bearer', async () => {
			const requestHeader = { headers: { Authorization: `${testData.TOKEN_VALID_BUT_EXPIRED}` }};
			const expectedError  = new ApiError(httpStatus.UNAUTHORIZED, "TokenError: No auth token");
			await commonHeaderTestProcess(requestHeader, expectedError);
		});


		test('should return ApiError with code 401, if Authorization Header is bad formed mistyping Baerer', async () => {
			const requestHeader = { headers: { Authorization: `Baerer ${testData.TOKEN_VALID_BUT_EXPIRED}` }};
			const expectedError  = new ApiError(httpStatus.UNAUTHORIZED, "TokenError: No auth token");
			await commonHeaderTestProcess(requestHeader, expectedError);
		});


		test('should return ApiError with code 401, if Authorization Header is bad formed with no space between Bearer and Token', async () => {
			const requestHeader = { headers: { Authorization: `Bearer${testData.TOKEN_VALID_BUT_EXPIRED}` }};
			const expectedError  = new ApiError(httpStatus.UNAUTHORIZED, "TokenError: No auth token");
			await commonHeaderTestProcess(requestHeader, expectedError);
		});


		test('should return ApiError with code 401, if access token is not in the Authorization Header', async () => {
			const requestHeader = { headers: { Authorization: `Bearer ` }};
			const expectedError  = new ApiError(httpStatus.UNAUTHORIZED, "TokenError: No auth token");
			await commonHeaderTestProcess(requestHeader, expectedError);
		});


		test('should return ApiError with code 401, if access token is expired', async () => {
			const requestHeader = { headers: { Authorization: `Bearer ${testData.TOKEN_VALID_BUT_EXPIRED}` }};
			const expectedError  = new ApiError(httpStatus.UNAUTHORIZED, "TokenError: jwt expired");
			await commonHeaderTestProcess(requestHeader, expectedError);
		});


		test('should return ApiError with code 401, if access token has invalid signature', async () => {
			const requestHeader = { headers: { Authorization: `Bearer ${testData.TOKEN_WITH_INVALID_SIGNATURE}` }};
			const expectedError  = new ApiError(httpStatus.UNAUTHORIZED, "TokenError: invalid signature");
			await commonHeaderTestProcess(requestHeader, expectedError);
		});
	});



	describe('Failed Authorizations', () => {

		test('should return ApiError with code 401, if access token does not refer any user', async () => {
			const authUserInstance = AuthUser.fromObject({
				email: 'talat@google.com',
				password: 'HashedPass1word.HashedString.HashedPass1word'
			});

			const userAgent = "from-jest-test";
				
			const authuser = await authuserService.createAuthUser(authUserInstance);
			const tokens = await tokenService.generateAuthTokens(authuser, userAgent);

			await authuserService.deleteAuthUser(authuser.id);

			const request = { headers: { Authorization: `Bearer ${tokens.access.token}` }, useragent: { source: userAgent }};
			const expectedError  = new ApiError(httpStatus.UNAUTHORIZED, "ApiError: Access token does not refer any user");
			commonHeaderTestProcess(request, expectedError);
		});


		test('should return ApiError with code 401, if refresh token is used as access token', async () => {
			const authUserInstance = AuthUser.fromObject({
				email: 'talat@google.com',
				password: 'HashedPass1word.HashedString.HashedPass1word'
			});

			const userAgent = "from-jest-test";
				
			const authuser = await authuserService.createAuthUser(authUserInstance);
			const tokens = await tokenService.generateAuthTokens(authuser, userAgent);

			const request = { headers: { Authorization: `Bearer ${tokens.refresh.token}` }, useragent: { source: userAgent }};
			const expectedError  = new ApiError(httpStatus.UNAUTHORIZED, "TokenError: jwt not active"); // since Refresh Token is used before "not valid before"
			commonHeaderTestProcess(request, expectedError);
		});


		test('should return ApiError with code 401, if verify email token is used as access token', async () => {
			const authUserInstance = AuthUser.fromObject({
				email: 'talat@google.com',
				password: 'HashedPass1word.HashedString.HashedPass1word'
			});

			const userAgent = "from-jest-test";
				
			const authuser = await authuserService.createAuthUser(authUserInstance);
			const verifyEmailToken = await tokenService.generateVerifyEmailToken(authuser);

			const request = { headers: { Authorization: `Bearer ${verifyEmailToken}` }, useragent: { source: userAgent }};
			const expectedError  = new ApiError(httpStatus.UNAUTHORIZED, "TokenError: Invalid token type");
			commonHeaderTestProcess(request, expectedError);
		});


		test('should return ApiError with code 401, if other user\'s access token is used', async () => {
			// This means that it is stolen, the only prevention is to check the useragent which is embedded in the access token
			const authUserInstance2 = AuthUser.fromObject({
				email: 'kuyuk@google.com',
				password: 'HashedPass1word.HashedString.HashedPass1word'
			});

			const userAgent1 = "from-jest-test";
			const userAgent2 = "from-google-chrome";

			const authuser2 = await authuserService.createAuthUser(authUserInstance2);
			const tokens2 = await tokenService.generateAuthTokens(authuser2, userAgent2);

			// authuser1 tries to use authuser2's access token but using different user agent
			const request = { headers: { Authorization: `Bearer ${tokens2.access.token}` }, useragent: { source: userAgent1 }};
			const expectedError  = new ApiError(httpStatus.UNAUTHORIZED, "ApiError: Your browser/agent seems changed or updated, you have to re-login to get authentication");
			commonHeaderTestProcess(request, expectedError);
		});


		test('should return ApiError with code 401, if access token is generated with an invalid secret', async () => {
			const authUserInstance = AuthUser.fromObject({
				email: 'talat@google.com',
				password: 'HashedPass1word.HashedString.HashedPass1word'
			});

			const userAgent = "from-jest-test";
				
			const authuser = await authuserService.createAuthUser(authUserInstance);
			const accessToken = await tokenService.generateToken(authuser.id, moment().add(5, 'minutes'), tokenTypes.ACCESS, "jti", userAgent, 0, "INVALID-SECRET");

			const request = { headers: { Authorization: `Bearer ${accessToken}` }, useragent: { source: userAgent }};
			const expectedError  = new ApiError(httpStatus.UNAUTHORIZED, "TokenError: invalid signature");
			commonHeaderTestProcess(request, expectedError);
		});


		test('should return ApiError with code 403, if the user is disabled', async () => {
			const authUserInstance = AuthUser.fromObject({
				email: 'talat@google.com',
				password: 'HashedPass1word.HashedString.HashedPass1word',
				isDisabled: true
			});

			const userAgent = "from-jest-test";
				
			const authuser = await authuserService.createAuthUser(authUserInstance);
			const tokens = await tokenService.generateAuthTokens(authuser, userAgent);

			const request = { headers: { Authorization: `Bearer ${tokens.access.token}` }, useragent: { source: userAgent }};
			const expectedError  = new ApiError(httpStatus.FORBIDDEN, "ApiError: You are disabled. Call the system administrator");
			commonHeaderTestProcess(request, expectedError);
		});


		test('should return ApiError with code 403, if access token is in the blacklist', async () => {
			const authUserInstance = AuthUser.fromObject({
				email: 'talat@google.com',
				password: 'HashedPass1word.HashedString.HashedPass1word',
			});

			const userAgent = "from-jest-test";
				
			const authuser = await authuserService.createAuthUser(authUserInstance);
			const tokens = await tokenService.generateAuthTokens(authuser, userAgent);

			const { jti } = jwt.decode(tokens.access.token, config.jwt.secret);

			redisClient.setex(`blacklist_${jti}`, 1 * 60, true);

			const request = { headers: { Authorization: `Bearer ${tokens.access.token}` }, useragent: { source: userAgent }};
			const expectedError  = new ApiError(httpStatus.FORBIDDEN, "ApiError: The token is in the blacklist");
			commonHeaderTestProcess(request, expectedError);
		});


		test('should return ApiError with code 500, if redis cache server is down while checking blacklist', async () => {
			console.log("Test: What happens when Redis is down started");
			console.log("Stop Redis manually");
			await new Promise(resolve => setTimeout(resolve, 10000));

			const authUserInstance = AuthUser.fromObject({
				email: 'talat@google.com',
				password: 'HashedPass1word.HashedString.HashedPass1word',
			});

			const userAgent = "from-jest-test";
				
			const authuser = await authuserService.createAuthUser(authUserInstance);
			const tokens = await tokenService.generateAuthTokens(authuser, userAgent);

			await new Promise(resolve => setTimeout(resolve, 2000));
				
			const request = { headers: { Authorization: `Bearer ${tokens.access.token}` }, useragent: { source: userAgent }};
			const expectedError  = new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "ApiError: We've encountered a server internal problem (Redis)");
			commonHeaderTestProcess(request, expectedError);
		});
	});


	describe('Success Authorization', () => {
		
		test('should continue next middleware with user is attached to the request', async () => {
			console.log("Test: Success Authorization started");
			console.log("Restart Redis manually");
			await new Promise(resolve => setTimeout(resolve, 10000));

			const authUserInstance = AuthUser.fromObject({
				email: 'talat@google.com',
				password: 'HashedPass1word.HashedString.HashedPass1word'
			});

			const userAgent = "from-jest-test";
				
			const authuser = await authuserService.createAuthUser(authUserInstance);
			const tokens = await tokenService.generateAuthTokens(authuser, userAgent);
			
			const request = { headers: { Authorization: `Bearer ${tokens.access.token}` }, useragent: { source: userAgent }};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			await auth()(req, res, next);
			
			expect(next).toHaveBeenCalledWith();
			expect(req.user.id).toEqual(authuser.id);

		});
	});
})