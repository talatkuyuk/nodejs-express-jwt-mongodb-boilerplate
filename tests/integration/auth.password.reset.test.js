const request = require('supertest');
const httpStatus = require('http-status');

const app = require('../../src/core/express');

const { authuserService, authuserDbService, tokenService, tokenDbService } = require('../../src/services');
const { AuthUser } = require('../../src/models');
const { tokenTypes } = require('../../src/config/tokens');

const TestUtil = require('../testutil/TestUtil');
const testData = require('../data/testdata');

const { setupTestDatabase } = require('../setup/setupTestDatabase');
const { setupRedis } = require('../setup/setupRedis');


setupTestDatabase();
setupRedis();


describe('POST /auth/reset-password', () => {

	jest.setTimeout(50000);

	describe('Request Validation (password, passwordConfirmation, token) Errors', () => {

		test('should return 422 Validation Error if password is empty or falsy value', async () => {
			const resetPasswordForm = {
				password: '',
				passwordConfirmation: '',
				token: 'no-matters-for-this-test'
			};

			const response = await request(app).post('/auth/reset-password').send(resetPasswordForm);

			TestUtil.validationErrorExpectations(response);
			expect(response.body.errors.password.length).toBe(1);
			expect(response.body.errors.password).toEqual(["password must not be empty or falsy value"]); 
			expect(response.body.errors.passwordConfirmation).toEqual(["password confirmation must not be empty or falsy value"]); 
		});


	  	test('should return 422 Validation Error if password length is less than 8 characters', async () => {
			const resetPasswordForm = {
				password: '12aA',
				passwordConfirmation: '12aA',
				token: 'no-matters-for-this-test'
			};

			const response = await request(app).post('/auth/reset-password').send(resetPasswordForm);

			TestUtil.validationErrorExpectations(response);
			expect(response.body.errors.password.length).toBe(1);
			expect(response.body.errors.password).toEqual(["password must be minimum 8 characters"]); 
			expect(response.body.errors).not.toHaveProperty("passwordConfirmation");
	  	});


	  	test('should return 422 Validation Error if password does not contain at least one uppercase, one lowercase, one number and one special char', async () => {
			const resetPasswordForm = {
				password: '11aaAA88',
				passwordConfirmation: '11aaAA88',
				token: 'no-matters-for-this-test'
			};

			const response = await request(app).post('/auth/reset-password').send(resetPasswordForm);

			TestUtil.validationErrorExpectations(response);
			expect(response.body.errors.password.length).toBe(1);
			expect(response.body.errors.password).toEqual(["password must contain at least one uppercase, one lowercase, one number and one special char"]); 
			expect(response.body.errors).not.toHaveProperty("passwordConfirmation");
	  	});


		test('should return 422 Validation Error if password confirmation does not match with the password', async () => {
			const resetPasswordForm = {
				password: '11aaAA88+',
				passwordConfirmation: '11aaAA88$',
				token: 'no-matters-for-this-test'
			};

			const response = await request(app).post('/auth/reset-password').send(resetPasswordForm);

			TestUtil.validationErrorExpectations(response);
			expect(response.body.errors).not.toHaveProperty("password");
			expect(response.body.errors.passwordConfirmation.length).toBe(1);
			expect(response.body.errors.passwordConfirmation).toEqual(["password confirmation does not match with the password"]); 
		});


		test('should return 422 Validation Error if there is no token', async () => {
			const resetPasswordForm = {
				password: '11aaAA88$',
				passwordConfirmation: '11aaAA88$',
			};

			const response = await request(app).post('/auth/reset-password').send(resetPasswordForm);

			TestUtil.validationErrorExpectations(response);
			expect(response.body.errors).not.toHaveProperty("password");
			expect(response.body.errors).not.toHaveProperty("passwordConfirmation");
			expect(response.body.errors.token.length).toBe(1);
			expect(response.body.errors.token).toEqual(["token must not be empty"]); 
		});


		test('should return 422 Validation Error if occurs all password, confirmation password and token validation errors', async () => {
			const resetPasswordForm = {
				password: '11aaAA',
				passwordConfirmation: '11aaAA88$',
				token: testData.VERIFY_EMAIL_TOKEN_UNDEFINED // there is no such token in the testData in order to simulate "undefined"
			};

			const response = await request(app).post('/auth/reset-password').send(resetPasswordForm);

			TestUtil.validationErrorExpectations(response);
			expect(response.body.errors).toEqual({
				"password": ["password must be minimum 8 characters"],
				"passwordConfirmation": ["password confirmation does not match with the password"],
				"token": ["token must not be empty"]
			});
		});
	});



	describe('Reset-Password Token Errors', () => {

		test('should throw ApiError with code 401 if the reset-password token is expired', async () => {

			const resetPasswordForm = {
				password: '11aaAA88$',
				passwordConfirmation: '11aaAA88$',
				token: testData.RESET_PASSWORD_TOKEN_EXPIRED
			};

			const response = await request(app).post('/auth/reset-password').send(resetPasswordForm);

			TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
			expect(response.body.name).toEqual("TokenExpiredError");
			expect(response.body.message).toEqual("jwt expired");
		});

		
		test('should throw ApiError with code 401 if the reset-password token has wrong signature', async () => {

			const resetPasswordForm = {
				password: '11aaAA88$',
				passwordConfirmation: '11aaAA88$',
				token: testData.TOKEN_WITH_INVALID_SIGNATURE
			};

			const response = await request(app).post('/auth/reset-password').send(resetPasswordForm);

			TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
			expect(response.body.name).toEqual("JsonWebTokenError");
			expect(response.body.message).toEqual("invalid signature");
		});


		test('should throw ApiError with code 401 if the token is malformed', async () => {

			const resetPasswordForm = {
				password: '11aaAA88$',
				passwordConfirmation: '11aaAA88$',
				token: "mal-formed-token"
			};

			const response = await request(app).post('/auth/reset-password').send(resetPasswordForm);

			TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
			expect(response.body.name).toEqual("JsonWebTokenError");
			expect(response.body.message).toEqual("jwt malformed");
		});
	});



	describe('Failed reset-password process related with the database', () => {

		test('should return status 401, if there is no such token in the database', async () => {
			const authuser_id = "123456789012345678901234";

			// generate and add valid reset-password token into db
			const { resetPasswordToken, tokenId } = await tokenService.generateResetPasswordToken(authuser_id);

			// delete the token
			await tokenService.removeToken(tokenId);

			const resetPasswordForm = {
				password: '11aaAA88$',
				passwordConfirmation: '11aaAA88$',
				token: resetPasswordToken
			};

			const response = await request(app).post('/auth/reset-password').send(resetPasswordForm);

			TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
			expect(response.body.name).toEqual("ApiError");
			expect(response.body.message).toEqual("reset-password token is not valid");
		});


		test('should return status 401, if the token is blacklisted in the database', async () => {
			const authuser_id = "123456789012345678901234";

			// generate and add valid reset-password token into db
			const { resetPasswordToken, tokenId } = await tokenService.generateResetPasswordToken(authuser_id);

			// update the token as blacklisted
			await tokenService.updateTokenAsBlacklisted(tokenId);

			const resetPasswordForm = {
				password: '11aaAA88$',
				passwordConfirmation: '11aaAA88$',
				token: resetPasswordToken
			};

			const response = await request(app).post('/auth/reset-password').send(resetPasswordForm);

			TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
			expect(response.body.name).toEqual("ApiError");
			expect(response.body.message).toEqual("reset-password token is in the blacklist");
		});
	});



	describe('Failed reset-password process related with the user', () => {

		test('should return status 404, if there is no user', async () => {
			const authuser_id = "123456789012345678901234";

			// generate and add valid reset-password token into db
			const { resetPasswordToken } = await tokenService.generateResetPasswordToken(authuser_id);

			const resetPasswordForm = {
				password: '11aaAA88$',
				passwordConfirmation: '11aaAA88$',
				token: resetPasswordToken
			};

			const response = await request(app).post('/auth/reset-password').send(resetPasswordForm);

			TestUtil.errorExpectations(response, httpStatus.NOT_FOUND);
			expect(response.body.name).toEqual("ApiError");
			expect(response.body.message).toEqual("No user found");
		});


		test('should return status 404, if the user is disabled', async () => {

			const authuserx = AuthUser.fromObject({
				email: 'talat@gmail.com',
				password: 'no-matters-for-this-test',
			});

			// add the authuser into db
			const authuser = await authuserDbService.addAuthUser(authuserx);

			// generate and add valid reset-password token into db
			const { resetPasswordToken } = await tokenService.generateResetPasswordToken(authuser.id);

			// update the authuser as disabled
			await authuserService.toggleAbility(authuser.id);

			const resetPasswordForm = {
				password: '11aaAA88$',
				passwordConfirmation: '11aaAA88$',
				token: resetPasswordToken
			};

			const response = await request(app).post('/auth/reset-password').send(resetPasswordForm);

			TestUtil.errorExpectations(response, httpStatus.FORBIDDEN);
			expect(response.body.name).toEqual("ApiError");
			expect(response.body.message).toEqual("You are disabled, call the system administrator");
		});
	});



	describe('Success reset-password process', () => {

		test('should return status 204, delete reset-password tokens of the user', async () => {
			
			const authuserx = AuthUser.fromObject({
				email: 'talat@gmail.com',
				password: 'no-matters-for-this-test',
			});

			// add the authuser into db
			const authuser = await authuserDbService.addAuthUser(authuserx);

			// generate and add valid reset-password token into db
			const { resetPasswordToken } = await tokenService.generateResetPasswordToken(authuser.id);

			const resetPasswordForm = {
				password: '11aaAA88$',
				passwordConfirmation: '11aaAA88$',
				token: resetPasswordToken
			};

			const response = await request(app).post('/auth/reset-password').send(resetPasswordForm);

			expect(response.status).toBe(httpStatus.NO_CONTENT);

			// check the database if the authuser's reset-password tokens are deleted
			const data = await tokenDbService.getTokens({ user: authuser.id, type: tokenTypes.RESET_PASSWORD });
			expect(data.length).toBe(0);

 		})
	});
});
