const request = require('supertest');
const httpStatus = require('http-status');
const moment = require('moment');
const jwt = require('jsonwebtoken');

const app = require('../../src/core/express');
const { authuserDbService, tokenDbService } = require('../../src/services');
const { AuthUser, Token } = require('../../src/models');
const config = require('../../src/config');
const { tokenTypes } = require('../../src/config/tokens');

const { setupTestDatabase } = require('../setup/setupTestDatabase');
const { setupRedis } = require('../setup/setupRedis');


setupTestDatabase();
setupRedis();


describe('POST /auth/signup', () => {

	describe('Request Validation Errors', () => {

		jest.setTimeout(50000);

		let registerform;

		function commonExpectations(response) {
			expect(response.status).toBe(httpStatus.UNPROCESSABLE_ENTITY);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(422);
			expect(response.body.name).toEqual("ValidationError");
			expect(response.body.message).toEqual("The request could not be validated");
		}

	  	test('should return 422 Validation Error if email is empty or falsy value', async () => {
			registerform = {
				password: 'Pass1word.',
				passwordConfirmation: 'Pass1word.'
			};
			const response = await request(app).post('/auth/signup').send(registerform);
			commonExpectations(response);
			expect(response.body.errors.email.length).toBe(1); // { ..., email: ["only one error message related with email"] }
			expect(response.body.errors.email).toEqual(["email must not be empty or falsy value"]); 
			expect(response.body.errors).not.toHaveProperty("password");
			expect(response.body.errors).not.toHaveProperty("passwordConfirmation");
	  	});


		test('should return 422 Validation Error if email is invalid form', async () => {
			registerform = {
				email: 'talat1@com',
				password: 'Pass1word.',
				passwordConfirmation: 'Pass1word.'
			};
			const response = await request(app).post('/auth/signup').send(registerform);
			commonExpectations(response);
			expect(response.body.errors.email.length).toBe(1);
			expect(response.body.errors.email).toEqual(["email must be in valid form"]); 
			expect(response.body.errors).not.toHaveProperty("password");
			expect(response.body.errors).not.toHaveProperty("passwordConfirmation");
		});


		test('should return 422 Validation Error if email is already taken', async () => {

			const authuser = AuthUser.fromObject({
				email: 'talat@google.com',
				password: 'HashedPass1word.HashedString.HashedPass1word'
			})
				
			await authuserDbService.createAuthUser(authuser);

			registerform = {
				email: 'talat@google.com',
				password: 'Pass1word.',
				passwordConfirmation: 'Pass1word.'
			};

			const response = await request(app).post('/auth/signup').send(registerform);
			commonExpectations(response);
			expect(response.body.errors.email.length).toBe(1);
			expect(response.body.errors.email).toEqual(["email is already taken"]); 
			expect(response.body.errors).not.toHaveProperty("password");
			expect(response.body.errors).not.toHaveProperty("passwordConfirmation");
		});

		
		test('should return 422 Validation Error if password is empty or falsy value', async () => {
			registerform = {
				email: 'talat@gmail.com',
				password: '',
				passwordConfirmation: ''
			};
			const response = await request(app).post('/auth/signup').send(registerform);
			commonExpectations(response);
			expect(response.body.errors).not.toHaveProperty("email");
			expect(response.body.errors.password.length).toBe(1);
			expect(response.body.errors.password).toEqual(["password must not be empty or falsy value"]); 
			expect(response.body.errors).not.toHaveProperty("passwordConfirmation");
		});


	  	test('should return 422 Validation Error if password length is less than 8 characters', async () => {
			registerform = {
				email: 'talat@gmail.com',
				password: '12aA',
				passwordConfirmation: '12aA'
			};
			const response = await request(app).post('/auth/signup').send(registerform);
			commonExpectations(response);
			expect(response.body.errors).not.toHaveProperty("email");
			expect(response.body.errors.password.length).toBe(1);
			expect(response.body.errors.password).toEqual(["password must be minimum 8 characters"]); 
			expect(response.body.errors).not.toHaveProperty("passwordConfirmation");
	  	});


	  	test('should return 422 Validation Error if password does not contain at least one uppercase, one lowercase, one number and one special char', async () => {
			registerform = {
				email: 'talat@gmail.com',
				password: '11aaAA88',
				passwordConfirmation: '11aaAA88'
			};
			const response = await request(app).post('/auth/signup').send(registerform);
			commonExpectations(response);
			expect(response.body.errors).not.toHaveProperty("email");
			expect(response.body.errors.password.length).toBe(1);
			expect(response.body.errors.password).toEqual(["password must contain at least one uppercase, one lowercase, one number and one special char"]); 
			expect(response.body.errors).not.toHaveProperty("passwordConfirmation");
	  	});


		test('should return 422 Validation Error if password confirmation does not match with the password', async () => {
			registerform = {
				email: 'talat@gmail.com',
				password: '11aaAA88+',
				passwordConfirmation: '11aaAA88$'
			};
			const response = await request(app).post('/auth/signup').send(registerform);
			commonExpectations(response);
			expect(response.body.errors).not.toHaveProperty("email");
			expect(response.body.errors).not.toHaveProperty("password");
			expect(response.body.errors.passwordConfirmation.length).toBe(1);
			expect(response.body.errors).toHaveProperty("passwordConfirmation");
		});


		test('should return 422 Validation Error if occurs all email, password, confirmation password validation errors', async () => {
			registerform = {
				email: 'talat@gmail',
				password: '11aaAA',
				passwordConfirmation: '11aaAA88$'
			};
			const response = await request(app).post('/auth/signup').send(registerform);
			commonExpectations(response);
			expect(response.body.errors).toEqual({
				"email": ["email must be in valid form"],
				"password": ["password must be minimum 8 characters"],
				"passwordConfirmation": ["password confirmation does not match with the password"]
			});
		});
	});

	describe('Success registration', () => {
		test('should return status 201, user and valid tokens in json form; successfully register user if the request is valid', async () => {
			let registerform = {
				email: 'talat@gmail.com',
				password: 'Pass1word.',
				passwordConfirmation: 'Pass1word.'
			};

			const response = await request(app).post('/auth/signup').send(registerform);

			expect(response.status).toBe(httpStatus.CREATED);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));

			expect(response.body).not.toHaveProperty("code");
			expect(response.body).not.toHaveProperty("message");
			expect(response.body).not.toHaveProperty("errors");

			const accessToken = response.body.tokens.access.token;
			const refreshToken = response.body.tokens.refresh.token;

			// access token verification and consistency check within the response data
			const { sub, iat, exp, jti, type} = jwt.verify(accessToken, config.jwt.secret);
			expect(sub && iat && exp && jti && type).toBe(tokenTypes.ACCESS);
			expect(sub).toBe(response.body.user.id);
			expect(exp).toBe(moment(response.body.tokens.access.expires).unix());

			// refresh token verification and consistency check within the response data
			const { sub: subx, iat:iatx, exp: expx, jti:jtix, type:typex} = jwt.decode(refreshToken, config.jwt.secret);
			expect(subx && iatx && expx && jtix && typex).toBe(tokenTypes.REFRESH);
			expect(subx).toBe(response.body.user.id);
			expect(expx).toBe(moment(response.body.tokens.refresh.expires).unix());

			// check the dates in the esponse are valid dates
			expect(moment(response.body.tokens.access.expires, moment.ISO_8601, true).isValid()).toBe(true);
			expect(moment(response.body.tokens.refresh.expires, moment.ISO_8601, true).isValid()).toBe(true);
			expect(response.body.user.createdAt).toBeGreaterThan(moment().unix());

			// check the whole response body expected
			expect(response.body).toEqual({
				"user": {
					"createdAt": expect.any(Number), // 1631868212022
					"email": "talat@gmail.com",
					"id": expect.stringMatching(/^[0-9a-fA-F]{24}$/), // valid mongodb ObjectID: 24-size hex value
					"isEmailVerified": false,
					"isDisabled": false,
					"services": {
					  "emailpassword": "registered",
					},
				},
				"tokens": {
					"access": {
					  "token": expect.any(String),
					  "expires": expect.any(String), // ex. "2021-10-17T09:49:26.735Z"
					},
					"refresh": {
					  "token": expect.any(String),
					  "expires": expect.any(String), 
					},
				},
			});

			// check the refresh token is stored into database
			const result = await tokenDbService.findToken({
				user: response.body.user.id,
				token: refreshToken,
				expires: moment(response.body.tokens.refresh.expires).toDate(),
				type: tokenTypes.REFRESH,
			});
			expect(Token.fromDoc(result)?.id).toBeDefined();

			// TODO: check the new auth user is stored into database
			// TODO: check the new auth user password is hashed in the database
		});
	});
})