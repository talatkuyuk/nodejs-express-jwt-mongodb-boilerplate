const request = require('supertest');
const httpStatus = require('http-status');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = require('../../src/core/express');
const config = require('../../src/config');

const { authuserService, authuserDbService, tokenService, tokenDbService } = require('../../src/services');
const { AuthUser } = require('../../src/models');
const { tokenTypes } = require('../../src/config/tokens');

const testData = require('../data/testdata');

const { setupTestDatabase } = require('../setup/setupTestDatabase');
const { setupRedis } = require('../setup/setupRedis');


setupTestDatabase();
setupRedis();


describe('POST /auth/verify-email', () => {

	jest.setTimeout(50000);

	let verifyEmailForm;

	describe('Request Validation (token) Errors', () => {

		function commonExpectations(response) {
			expect(response.status).toBe(httpStatus.UNPROCESSABLE_ENTITY);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(422);
			expect(response.body.name).toEqual("ValidationError");
			expect(response.body.message).toEqual("The request could not be validated");
			expect(response.body.errors.token.length).toBe(1);
			expect(response.body.errors.token).toEqual(["token must not be empty"]); 
			expect(response.body).not.toHaveProperty("description");
		}

		test('should return 422 Validation Error if there is no token', async () => {
			const response = await request(app).post('/auth/verify-email').send({});
			commonExpectations(response);
		});


		test('should return 422 Validation Error if the token is undefined', async () => {
			verifyEmailForm = {
				token: testData.VERIFY_EMAIL_TOKEN_UNDEFINED // there is no such token in the testData in order to simulate "undefined"
			};
			const response = await request(app).post('/auth/verify-email').send(verifyEmailForm);
			commonExpectations(response);
		});
	});


	describe('Verify-Email Token Errors', () => {

		function commonExpectations(response) {
			expect(response.status).toBe(httpStatus.UNAUTHORIZED);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(401);
			expect(response.body).toHaveProperty("description");
		}

		test('should throw ApiError with code 401 if the verify-email token is expired', async () => {

			verifyEmailForm = {
				token: testData.VERIFY_EMAIL_TOKEN_EXPIRED
			};

			const response = await request(app).post('/auth/verify-email').send(verifyEmailForm);

			commonExpectations(response);
			expect(response.body.name).toEqual("TokenExpiredError");
			expect(response.body.message).toEqual("jwt expired");
		});

		
		test('should throw ApiError with code 401 if the verify-email token has wrong signature', async () => {

			verifyEmailForm = {
				token: testData.TOKEN_WITH_INVALID_SIGNATURE
			};

			const response = await request(app).post('/auth/verify-email').send(verifyEmailForm);

			commonExpectations(response);
			expect(response.body.name).toEqual("JsonWebTokenError");
			expect(response.body.message).toEqual("invalid signature");
		});


		test('should throw ApiError with code 401 if the token is malformed', async () => {

			verifyEmailForm = { token: "mal-formed-token" };

			const response = await request(app).post('/auth/verify-email').send(verifyEmailForm);

			commonExpectations(response);
			expect(response.body.name).toEqual("JsonWebTokenError");
			expect(response.body.message).toEqual("jwt malformed");
		});
	});



	describe('Failed verify-email process related with the database', () => {

		function commonExpectations(response) {
			expect(response.status).toBe(httpStatus.UNAUTHORIZED);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(401);
			expect(response.body.name).toEqual("ApiError");
			expect(response.body).toHaveProperty("description");
			expect(response.body).not.toHaveProperty("errors");
		}

		test('should return status 401, if there is no such token in the database', async () => {
			const authuser_id = "123456789012345678901234";

			// generate and add valid verify-email token into db
			const { verifyEmailToken, tokenId } = await tokenService.generateVerifyEmailToken(authuser_id);

			// delete the token
			await tokenService.removeToken(tokenId);

			verifyEmailForm = { token: verifyEmailToken };

			const response = await request(app).post('/auth/verify-email').send(verifyEmailForm);

			commonExpectations(response);
			expect(response.body.message).toEqual("verify-email token is not valid");
		});


		test('should return status 401, if the token is blacklisted in the database', async () => {
			const authuser_id = "123456789012345678901234";

			// generate and add valid verify-email token into db
			const { verifyEmailToken, tokenId } = await tokenService.generateVerifyEmailToken(authuser_id);

			// update the token as blacklisted
			await tokenService.updateTokenAsBlacklisted(tokenId);

			verifyEmailForm = { token: verifyEmailToken };

			const response = await request(app).post('/auth/verify-email').send(verifyEmailForm);

			commonExpectations(response);
			expect(response.body.message).toEqual("verify-email token is in the blacklist");
		});
	});



	describe('Failed verify-email process related with the user', () => {

		function commonExpectations(response, status) {
			expect(response.status).toBe(status);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(status);
			expect(response.body.name).toEqual("ApiError");
			expect(response.body).toHaveProperty("description");
			expect(response.body).not.toHaveProperty("errors");
		}


		test('should return status 404, if there is no user', async () => {
			const authuser_id = "123456789012345678901234";

			// generate and add valid verify-email token into db
			const { verifyEmailToken } = await tokenService.generateVerifyEmailToken(authuser_id);

			verifyEmailForm = { token: verifyEmailToken };

			const response = await request(app).post('/auth/verify-email').send(verifyEmailForm);

			commonExpectations(response, httpStatus.NOT_FOUND);
			expect(response.body.message).toEqual("No user found");
		});


		test('should return status 404, if the user is disabled', async () => {

			const authuserx = AuthUser.fromObject({
				email: 'talat@gmail.com',
				password: 'no-matters-for-this-test',
			});

			// add the authuser into db
			const authuser = await authuserDbService.addAuthUser(authuserx);

			// generate and add valid verify-email token into db
			const { verifyEmailToken } = await tokenService.generateVerifyEmailToken(authuser.id);

			// update the authuser as disabled
			await authuserService.toggleAbility(authuser.id);

			verifyEmailForm = { token: verifyEmailToken };

			const response = await request(app).post('/auth/verify-email').send(verifyEmailForm);

			commonExpectations(response, httpStatus.FORBIDDEN);
			expect(response.body.message).toEqual("You are disabled, call the system administrator");
		});
	});



	describe('Success verify-email process', () => {

		test('should return status 204, delete verify-email tokens of the user', async () => {
			
			const authuserx = AuthUser.fromObject({
				email: 'talat@gmail.com',
				password: 'no-matters-for-this-test',
			});

			// add the authuser into db
			const authuser = await authuserDbService.addAuthUser(authuserx);

			// generate and add valid verify-email token into db
			const { verifyEmailToken } = await tokenService.generateVerifyEmailToken(authuser.id);

			verifyEmailForm = { token: verifyEmailToken };

			const response = await request(app).post('/auth/verify-email').send(verifyEmailForm);

			expect(response.status).toBe(httpStatus.NO_CONTENT);

			// check the database if the authuser's verify-email tokens are deleted
			const data = await tokenDbService.getTokens({ user: authuser.id, type: tokenTypes.VERIFY_EMAIL });
			expect(data.length).toBe(0);

 		})
	});
});
