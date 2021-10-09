const httpStatus = require('http-status');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const httpMocks = require('node-mocks-http');

// without these two lines which are actually not necessary the test stucks, I don't know the reason
const request = require('supertest');
const app = require('../../src/core/express');

const config = require('../../src/config');
const ApiError = require('../../src/utils/ApiError');
const { auth } = require('../../src/middlewares/auth');

const { authuserDbService, userDbService, tokenService, redisService } = require('../../src/services');
const { AuthUser } = require('../../src/models');
const { tokenTypes } = require('../../src/config/tokens');

const TestUtil = require('../testutil/TestUtil');
const testData = require('../data/testdata');

const { setupTestDatabase } = require('../setup/setupTestDatabase');
const { setupRedis } = require('../setup/setupRedis');


setupTestDatabase();
setupRedis();


describe('Auth Middleware', () => {

	jest.setTimeout(50000);

	TestUtil.MatchErrors();

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

		test('should throw ApiError with code 401, if Authorization Header is absent', async () => {
			const requestHeader = null;
			const expectedError = new ApiError(httpStatus.UNAUTHORIZED, "TokenError: No auth token");
			await commonHeaderTestProcess(requestHeader, expectedError);
		});


		test('should throw ApiError with code 401, if Authorization Header is bad formed without Bearer', async () => {
			const requestHeader = { headers: { Authorization: `${testData.ACCESS_TOKEN_EXPIRED}` }};
			const expectedError  = new ApiError(httpStatus.UNAUTHORIZED, "TokenError: No auth token");
			await commonHeaderTestProcess(requestHeader, expectedError);
		});


		test('should throw ApiError with code 401, if Authorization Header is bad formed mistyping Baerer', async () => {
			const requestHeader = { headers: { Authorization: `Baerer ${testData.ACCESS_TOKEN_EXPIRED}` }};
			const expectedError  = new ApiError(httpStatus.UNAUTHORIZED, "TokenError: No auth token");
			await commonHeaderTestProcess(requestHeader, expectedError);
		});


		test('should throw ApiError with code 401, if Authorization Header is bad formed with no space between Bearer and Token', async () => {
			const requestHeader = { headers: { Authorization: `Bearer${testData.ACCESS_TOKEN_EXPIRED}` }};
			const expectedError  = new ApiError(httpStatus.UNAUTHORIZED, "TokenError: No auth token");
			await commonHeaderTestProcess(requestHeader, expectedError);
		});


		test('should throw ApiError with code 401, if access token is not in the Authorization Header', async () => {
			const requestHeader = { headers: { Authorization: `Bearer ` }};
			const expectedError  = new ApiError(httpStatus.UNAUTHORIZED, "TokenError: No auth token");
			await commonHeaderTestProcess(requestHeader, expectedError);
		});


		test('should throw ApiError with code 401, if access token is expired', async () => {
			const requestHeader = { headers: { Authorization: `Bearer ${testData.ACCESS_TOKEN_EXPIRED}` }};
			const expectedError  = new ApiError(httpStatus.UNAUTHORIZED, "TokenError: jwt expired");
			await commonHeaderTestProcess(requestHeader, expectedError);
		});


		test('should throw ApiError with code 401, if access token has invalid signature', async () => {
			const requestHeader = { headers: { Authorization: `Bearer ${testData.ACCESS_TOKEN_WITH_INVALID_SIGNATURE}` }};
			const expectedError  = new ApiError(httpStatus.UNAUTHORIZED, "TokenError: invalid signature");
			await commonHeaderTestProcess(requestHeader, expectedError);
		});

		test('should throw ApiError with code 401, if access token is malformed (Undefined)', async () => {
			const requestHeader = { headers: { Authorization: `Bearer ${testData.ACCESS_TOKEN_UNDEFINED}` }};
			const expectedError  = new ApiError(httpStatus.UNAUTHORIZED, "TokenError: jwt malformed");
			await commonHeaderTestProcess(requestHeader, expectedError);
		});
	});



	describe('Failed Authentications', () => {

		test('should throw ApiError with code 401, if access token does not refer any user', async () => {
			const authUserInstance = AuthUser.fromObject({
				email: 'talat@google.com',
				password: 'HashedPass1word.HashedString.HashedPass1word'
			});

			const userAgent = "from-jest-test";
				
			const authuser = await authuserDbService.addAuthUser(authUserInstance);
			const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);

			await authuserDbService.deleteAuthUser(authuser.id);

			const requestHeader = { headers: { Authorization: `Bearer ${tokens.access.token}` }, useragent: { source: userAgent }};
			const expectedError  = new ApiError(httpStatus.UNAUTHORIZED, "ApiError: Access token does not refer any user");
			await commonHeaderTestProcess(requestHeader, expectedError);
		});


		test('should throw ApiError with code 401, if refresh token is used as access token', async () => {
			const authUserInstance = AuthUser.fromObject({
				email: 'talat@google.com',
				password: 'HashedPass1word.HashedString.HashedPass1word'
			});

			const userAgent = "from-jest-test";
				
			const authuser = await authuserDbService.addAuthUser(authUserInstance);
			const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);

			const requestHeader = { headers: { Authorization: `Bearer ${tokens.refresh.token}` }, useragent: { source: userAgent }};
			const expectedError  = new ApiError(httpStatus.UNAUTHORIZED, "TokenError: jwt not active"); // since Refresh Token is used before "not valid before"
			await commonHeaderTestProcess(requestHeader, expectedError);
		});


		test('should throw ApiError with code 401, if verify email token is used as access token', async () => {
			const authUserInstance = AuthUser.fromObject({
				email: 'talat@google.com',
				password: 'HashedPass1word.HashedString.HashedPass1word'
			});

			const userAgent = "from-jest-test";
				
			const authuser = await authuserDbService.addAuthUser(authUserInstance);
			const verifyEmailToken = await tokenService.generateVerifyEmailToken(authuser.id);

			const requestHeader = { headers: { Authorization: `Bearer ${verifyEmailToken}` }, useragent: { source: userAgent }};
			const expectedError  = new ApiError(httpStatus.UNAUTHORIZED, "TokenError: Invalid token type");
			await commonHeaderTestProcess(requestHeader, expectedError);
		});


		test('should throw ApiError with code 401, if other user\'s access token is used', async () => {
			// This means that it is stolen, the only prevention is to check the useragent which is embedded in the access token
			const authUserInstance2 = AuthUser.fromObject({
				email: 'kuyuk@google.com',
				password: 'HashedPass1word.HashedString.HashedPass1word'
			});

			const userAgent1 = "from-jest-test";
			const userAgent2 = "from-google-chrome";

			const authuser2 = await authuserDbService.addAuthUser(authUserInstance2);
			const tokens2 = await tokenService.generateAuthTokens(authuser2.id, userAgent2);

			// authuser1 tries to use authuser2's access token but using different user agent
			const requestHeader = { headers: { Authorization: `Bearer ${tokens2.access.token}` }, useragent: { source: userAgent1 }};
			const expectedError  = new ApiError(httpStatus.UNAUTHORIZED, "ApiError: Your browser/agent seems changed or updated, you have to re-login to get authentication");
			await commonHeaderTestProcess(requestHeader, expectedError);
		});


		test('should throw ApiError with code 401, if access token is generated with an invalid secret', async () => {
			const authUserInstance = AuthUser.fromObject({
				email: 'talat@google.com',
				password: 'HashedPass1word.HashedString.HashedPass1word'
			});

			const userAgent = "from-jest-test";
				
			const authuser = await authuserDbService.addAuthUser(authUserInstance);
			const accessToken = tokenService.generateToken(authuser.id, moment().add(5, 'minutes'), tokenTypes.ACCESS, "jti", userAgent, 0, "INVALID-SECRET");

			const requestHeader = { headers: { Authorization: `Bearer ${accessToken}` }, useragent: { source: userAgent }};
			const expectedError  = new ApiError(httpStatus.UNAUTHORIZED, "TokenError: invalid signature");
			await commonHeaderTestProcess(requestHeader, expectedError);
		});


		test('should throw ApiError with code 403, if the user is disabled', async () => {
			const authUserInstance = AuthUser.fromObject({
				email: 'talat@google.com',
				password: 'HashedPass1word.HashedString.HashedPass1word',
				isDisabled: true
			});

			const userAgent = "from-jest-test";
				
			const authuser = await authuserDbService.addAuthUser(authUserInstance);
			const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);

			const requestHeader = { headers: { Authorization: `Bearer ${tokens.access.token}` }, useragent: { source: userAgent }};
			const expectedError  = new ApiError(httpStatus.FORBIDDEN, "ApiError: You are disabled, call the system administrator");
			await commonHeaderTestProcess(requestHeader, expectedError);
		});


		test('should throw ApiError with code 403, if access token is in the blacklist', async () => {
			const authUserInstance = AuthUser.fromObject({
				email: 'talat@google.com',
				password: 'HashedPass1word.HashedString.HashedPass1word',
			});

			const userAgent = "from-jest-test";
				
			const authuser = await authuserDbService.addAuthUser(authUserInstance);
			const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);

			const { jti } = jwt.decode(tokens.access.token, config.jwt.secret);
			await redisService.put_jti_into_blacklist(jti);

			const requestHeader = { headers: { Authorization: `Bearer ${tokens.access.token}` }, useragent: { source: userAgent }};
			const expectedError  = new ApiError(httpStatus.FORBIDDEN, "ApiError: Access token is in the blacklist");
			await commonHeaderTestProcess(requestHeader, expectedError);
		});


		test('should throw ApiError with code 500, if redis cache server is down while checking blacklist', async () => {
			console.log("Stop Redis manually");
			await new Promise(resolve => setTimeout(resolve, 10000));

			const authUserInstance = AuthUser.fromObject({
				email: 'talat@google.com',
				password: 'HashedPass1word.HashedString.HashedPass1word',
			});

			const userAgent = "from-jest-test";
				
			const authuser = await authuserDbService.addAuthUser(authUserInstance);
			const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);

			await new Promise(resolve => setTimeout(resolve, 2000));
				
			const requestHeader = { headers: { Authorization: `Bearer ${tokens.access.token}` }, useragent: { source: userAgent }};
			const expectedError  = new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "ApiError: We've encountered a server internal problem (Redis)");
			await commonHeaderTestProcess(requestHeader, expectedError);
		});
	});


	describe('Success Authentication', () => {
		
		test('should continue next middleware with user is attached to the request', async () => {
			console.log("Restart Redis manually if it is stopped");
			await new Promise(resolve => setTimeout(resolve, 10000));

			const authUserInstance = AuthUser.fromObject({
				email: 'talat@google.com',
				password: 'HashedPass1word.HashedString.HashedPass1word'
			});

			const userAgent = "from-jest-test";
				
			const authuser = await authuserDbService.addAuthUser(authUserInstance);
			const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);
			
			const request = { headers: { Authorization: `Bearer ${tokens.access.token}` }, useragent: { source: userAgent }};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			await auth()(req, res, next);
			
			expect(next).toHaveBeenCalledWith();
			expect(req.user.id).toEqual(authuser.id);

		});
	});



	describe('Check Authorization whether the user has specific right(s) or not', () => {

		const authUserInstance = AuthUser.fromObject({
			email: 'talat@google.com',
			password: 'HashedPass1word.HashedString.HashedPass1word'
		});

		const userAgent = "from-jest-test";
		
		
		test('should throw ApiError with code 403 if the user has appropriate right but self (param id does not match)', async () => {

			const authuser = await authuserDbService.addAuthUser(authUserInstance);
			const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);
	
			var request  = httpMocks.createRequest({
				method: 'GET',
				headers: { Authorization: `Bearer ${tokens.access.token}` }, 
				useragent: { source: userAgent },
				params: { id: "62384687364898374912323" },
			});

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			await auth("change-password")(req, res, next);

			const expectedError  = new ApiError(httpStatus.FORBIDDEN, "Forbidden, (only self-data)");
			
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			expect(next).toHaveBeenCalledWith(expect.toBeMatchedWithError(expectedError));
			expect(req.user.id).toEqual(authuser.id);
			expect(req.user.role).toEqual("user");
		});


		test('should throw ApiError with code 403 if the user does not have appropriate right', async () => {

			const authuser = await authuserDbService.addAuthUser(authUserInstance);
			const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);
	
			var request  = httpMocks.createRequest({
				method: 'GET',
				headers: { Authorization: `Bearer ${tokens.access.token}` }, 
				useragent: { source: userAgent },
				params: { id: "62384687364898374912323" },
			});

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			await auth("query-users")(req, res, next);

			const expectedError  = new ApiError(httpStatus.FORBIDDEN, "Forbidden, (you don\'t have appropriate right)");
			
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			expect(next).toHaveBeenCalledWith(expect.toBeMatchedWithError(expectedError));
			expect(req.user.id).toEqual(authuser.id);
			expect(req.user.role).toEqual("user");
		});


		test('should continue next middleware if the user has appropriate right related himself', async () => {

			const authuser = await authuserDbService.addAuthUser(authUserInstance);
			const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);
	
			var request  = httpMocks.createRequest({
				method: 'POST',
				headers: { Authorization: `Bearer ${tokens.access.token}` }, 
				useragent: { source: userAgent },
				params: { id: authuser.id },
			});

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			await auth("change-password")(req, res, next);
			
			expect(next).toHaveBeenCalledWith();
			expect(req.user.id).toEqual(authuser.id);
			expect(req.user.role).toEqual("user");
		});


		test('should continue next middleware if the user has appropriate right which is not dependent on himself', async () => {
			const authuser = await authuserDbService.addAuthUser(authUserInstance);
			const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);
			
			// let's an admin user to check he/she has appropriate right
			await userDbService.addUser(authuser.id, {name: "User", role: "admin" });
	
			var request  = httpMocks.createRequest({
				method: 'POST',
				headers: { Authorization: `Bearer ${tokens.access.token}` }, 
				useragent: { source: userAgent },
				params: { id: authuser.id },
			});

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			await auth("query-users")(req, res, next);
			
			expect(next).toHaveBeenCalledWith();
			expect(req.user.id).toEqual(authuser.id);
			expect(req.user.role).toEqual("admin");
		});
	});
})