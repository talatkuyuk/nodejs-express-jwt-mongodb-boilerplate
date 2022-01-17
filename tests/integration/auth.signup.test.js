const request = require('supertest');
const httpStatus = require('http-status');

const app = require('../../src/core/express');

const { authuserDbService } = require('../../src/services');
const { AuthUser } = require('../../src/models');

const TestUtil = require('../testutils/TestUtil');

const { setupTestDatabase } = require('../setup/setupTestDatabase');
const { setupRedis } = require('../setup/setupRedis');


setupTestDatabase();
setupRedis();


describe('POST /auth/signup', () => {

	describe('Request Validation Errors', () => {

	  	test('should return 422 Validation Error if email is empty', async () => {
			const registerform = {
				password: 'Pass1word.',
				passwordConfirmation: 'Pass1word.'
			};
			const response = await request(app).post('/auth/signup').send(registerform);

			TestUtil.validationErrorExpectations(response);
			expect(response.body.error.errors.email).toEqual(["must not be empty"]); 
			expect(response.body.error.errors).not.toHaveProperty("password");
			expect(response.body.error.errors).not.toHaveProperty("passwordConfirmation");
	  	});


		test('should return 422 Validation Error if email is invalid form', async () => {
			const registerform = {
				email: 'talat1@com',
				password: 'Pass1word.',
				passwordConfirmation: 'Pass1word.'
			};
			const response = await request(app).post('/auth/signup').send(registerform);

			TestUtil.validationErrorExpectations(response);
			expect(response.body.error.errors.email).toEqual(["must be valid email address"]); 
			expect(response.body.error.errors).not.toHaveProperty("password");
			expect(response.body.error.errors).not.toHaveProperty("passwordConfirmation");
		});


		test('should return 422 Validation Error if email is already taken', async () => {

			const authuser = AuthUser.fromDoc({
				email: 'talat@google.com',
				password: 'HashedPass1word.HashedString.HashedPass1word'
			})
				
			await authuserDbService.addAuthUser(authuser);

			const registerform = {
				email: 'talat@google.com',
				password: 'Pass1word.',
				passwordConfirmation: 'Pass1word.'
			};

			const response = await request(app).post('/auth/signup').send(registerform);
			
			TestUtil.validationErrorExpectations(response);
			expect(response.body.error.errors.email).toEqual(["email is already taken"]); 
			expect(response.body.error.errors).not.toHaveProperty("password");
			expect(response.body.error.errors).not.toHaveProperty("passwordConfirmation");
		});

		
		test('should return 422 Validation Error if password is empty', async () => {
			const registerform = {
				email: 'talat@gmail.com',
				password: '',
				passwordConfirmation: ''
			};
			const response = await request(app).post('/auth/signup').send(registerform);

			TestUtil.validationErrorExpectations(response);
			expect(response.body.error.errors).not.toHaveProperty("email");
			expect(response.body.error.errors.password).toEqual(["must not be empty"]);
			expect(response.body.error.errors.passwordConfirmation).toEqual(["must not be empty"]); 
		});


	  	test('should return 422 Validation Error if password length is less than 8 characters', async () => {
			const registerform = {
				email: 'talat@gmail.com',
				password: '12aA',
				passwordConfirmation: '12aA'
			};
			const response = await request(app).post('/auth/signup').send(registerform);

			TestUtil.validationErrorExpectations(response);
			expect(response.body.error.errors).not.toHaveProperty("email");
			expect(response.body.error.errors).not.toHaveProperty("passwordConfirmation");
			expect(response.body.error.errors.password).toEqual(["must be minimum 8 characters"]); 
	  	});


	  	test('should return 422 Validation Error if password does not contain at least one uppercase, one lowercase, one number and one special char', async () => {
			const registerform = {
				email: 'talat@gmail.com',
				password: '11aaAA88',
				passwordConfirmation: '11aaAA88'
			};
			const response = await request(app).post('/auth/signup').send(registerform);

			TestUtil.validationErrorExpectations(response);
			expect(response.body.error.errors).not.toHaveProperty("email");
			expect(response.body.error.errors).not.toHaveProperty("passwordConfirmation");
			expect(response.body.error.errors.password).toEqual(["must contain uppercase, lowercase, number and special char"]); 
	  	});


		test('should return 422 Validation Error if password confirmation does not match with the password', async () => {
			const registerform = {
				email: 'talat@gmail.com',
				password: '11aaAA88+',
				passwordConfirmation: '11aaAA88$'
			};
			const response = await request(app).post('/auth/signup').send(registerform);

			TestUtil.validationErrorExpectations(response);
			expect(response.body.error.errors).not.toHaveProperty("email");
			expect(response.body.error.errors).not.toHaveProperty("password");
			expect(response.body.error.errors.passwordConfirmation).toEqual(["should match with the password"]); 
		});


		test('should return 422 Validation Error if occurs all email, password, confirmation password validation errors', async () => {
			const registerform = {
				email: 'talat@gmail',
				password: '11aaAA',
				passwordConfirmation: '11aaAA88$'
			};
			const response = await request(app).post('/auth/signup').send(registerform);

			TestUtil.validationErrorExpectations(response);
			expect(response.body.error.errors).toEqual({
				"email": ["must be valid email address"],
				"password": ["must be minimum 8 characters"],
				"passwordConfirmation": ["should match with the password"]
			});
		});
	});

	describe('Success registration', () => {

		test('should return status 201, user and valid tokens in json form; successfully register user if the request is valid', async () => {
			const registerform = {
				email: 'talat@gmail.com',
				password: 'Pass1word.',
				passwordConfirmation: 'Pass1word.'
			};

			const response = await request(app).post('/auth/signup').send(registerform);

			expect(response.status).toBe(httpStatus.CREATED);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.headers['location']).toEqual(expect.stringContaining("/authusers/"));

			TestUtil.CheckTokenConsistency(response.body.data.tokens, response.body.data.authuser.id);

			// check the whole response body expected
			expect(response.body).toEqual({
				"success": true,
				"data": {
					"authuser": {
						"createdAt": expect.any(Number), // 1631868212022
						"email": registerform.email,
						"id": expect.stringMatching(/^[0-9a-fA-F]{24}$/), // valid mongodb ObjectID: 24-size hex value
						"isEmailVerified": false,
						"isDisabled": false,
						"services": {
						  "emailpassword": "registered",
						},
					},
					"tokens": TestUtil.ExpectedTokens,
				}
			});

			// check the refresh token is stored into database
			TestUtil.CheckRefreshTokenStoredInDB(response);

			// TODO: check the new authuser is stored into database
			// TODO: check the new authuser password is hashed in the database
		});
	});
})