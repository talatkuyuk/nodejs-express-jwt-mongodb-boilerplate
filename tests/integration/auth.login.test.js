const request = require('supertest');
const httpStatus = require('http-status');
const bcrypt = require('bcryptjs');

const app = require('../../src/core/express');

const { authuserDbService } = require('../../src/services');
const { AuthUser } = require('../../src/models');

const TestUtil = require('../testutil/TestUtil');

const { setupTestDatabase } = require('../setup/setupTestDatabase');
const { setupRedis } = require('../setup/setupRedis');


setupTestDatabase();
setupRedis();


describe('POST /auth/login', () => {

	describe('Request Validation Errors', () => {

		jest.setTimeout(50000);

	  	test('should return 422 Validation Error if email is empty or falsy value', async () => {
			const loginForm = {
				password: 'Pass1word.',
			};

			const response = await request(app).post('/auth/login').send(loginForm);

			TestUtil.validationErrorExpectations(response);
			expect(response.body.errors.email).toEqual(["email must not be empty or falsy value"]); 
			expect(response.body.errors).not.toHaveProperty("password");
	  	});


		test('should return 422 Validation Error if email is invalid form', async () => {
			const loginForm = {
				email: 'talat1@com',
				password: 'Pass1word.',
			};

			const response = await request(app).post('/auth/login').send(loginForm);
			
			TestUtil.validationErrorExpectations(response);
			expect(response.body.errors.email).toEqual(["email must be in valid form"]); 
			expect(response.body.errors).not.toHaveProperty("password");
		});

		
		test('should return 422 Validation Error if password is empty or falsy value', async () => {
			const loginForm = {
				email: 'talat@gmail.com',
			};

			const response = await request(app).post('/auth/login').send(loginForm);

			TestUtil.validationErrorExpectations(response);
			expect(response.body.errors).not.toHaveProperty("email");
			expect(response.body.errors.password).toEqual(["password must not be empty or falsy value"]); 
		});


		test('should return 422 Validation Error if occurs both email, password validation errors', async () => {
			const loginForm = {
				email: 'talat@gmail',
				password: '',
			};

			const response = await request(app).post('/auth/login').send(loginForm);

			TestUtil.validationErrorExpectations(response);
			expect(response.body.errors).toEqual({
				"email": ["email must be in valid form"],
				"password": ["password must not be empty or falsy value"],
			});
		});
	});


	describe('Failed logins', () => {

		test('should return status 404, if the user is not registered', async () => {
			const loginForm = {
				email: 'talat@gmail.com',
				password: 'Pass1word.',
			};

			const response = await request(app).post('/auth/login').send(loginForm);

			TestUtil.errorExpectations(response, httpStatus.NOT_FOUND);
			expect(response.body.message).toEqual("No user found");
		});


		test('should return status 403, if the user is disabled', async () => {
			const hashedPassword = await bcrypt.hash('Pass1word.', 8);
			const authuser = AuthUser.fromObject({
				email: 'talat@gmail.com',
				password: hashedPassword,
				isDisabled: true
			});
			await authuserDbService.addAuthUser(authuser);

			const loginForm = {
				email: 'talat@gmail.com',
				password: 'Pass1word.',
			};

			const response = await request(app).post('/auth/login').send(loginForm);

			TestUtil.errorExpectations(response, httpStatus.FORBIDDEN);
			expect(response.body.message).toEqual("You are disabled, call the system administrator");

		});


		test('should return status 401, if the password is wrong', async () => {
			const hashedPassword = await bcrypt.hash('Pass1word.', 8);
			const authuser = AuthUser.fromObject({
				email: 'talat@gmail.com',
				password: hashedPassword,
			});

			await authuserDbService.addAuthUser(authuser);

			const loginForm = {
				email: 'talat@gmail.com',
				password: 'Pass1word',
			};

			const response = await request(app).post('/auth/login').send(loginForm);

			TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
			expect(response.body.message).toEqual("Incorrect email or password");
		});
	});



	describe('Success login', () => {
		
		test('should return status 200, user and valid tokens in json form; successfully login user if the request is valid', async () => {
			const hashedPassword = await bcrypt.hash('Pass1word.', 8);
			
			const authuserDoc = AuthUser.fromObject({
				email: 'talat@gmail.com',
				password: hashedPassword,
				services: { emailpassword: "registered" }
			});
				
			const authuser = await authuserDbService.addAuthUser(authuserDoc);
			
			const loginForm = {
				email: authuser.email,
				password: 'Pass1word.',
			};

			const response = await request(app).post('/auth/login').send(loginForm);

			expect(response.status).toBe(httpStatus.OK);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));

			TestUtil.CheckTokenConsistency(response.body.tokens, response.body.user.id);

			// check the whole response body expected
			expect(response.body).toEqual({
				"user": {
					"createdAt": expect.any(Number), // 1631868212022
					"email": authuser.email,
					"id": authuser.id,
					"isEmailVerified": false,
					"isDisabled": false,
					"services": {
					  "emailpassword": "registered",
					},
				},
				"tokens": TestUtil.ExpectedTokens,
			});

			// check the refresh token is stored into database
			TestUtil.CheckRefreshTokenStoredInDB(response);
		});
	});
})