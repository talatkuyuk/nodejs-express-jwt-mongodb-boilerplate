const request = require('supertest');
const httpStatus = require('http-status');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = require('../../src/core/express');
const { authuserDbService, tokenDbService } = require('../../src/services');
const { AuthUser, Token } = require('../../src/models');
const config = require('../../src/config');
const { tokenTypes } = require('../../src/config/tokens');

const { setupTestDatabase } = require('../setup/setupTestDatabase');
const { setupRedis } = require('../setup/setupRedis');


setupTestDatabase();
setupRedis();


describe('POST /auth/login', () => {

	describe('Request Validation Errors', () => {

		jest.setTimeout(50000);

		let loginForm;

		function commonExpectations(response) {
			expect(response.status).toBe(httpStatus.UNPROCESSABLE_ENTITY);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(422);
			expect(response.body.name).toEqual("ValidationError");
			expect(response.body.message).toEqual("The request could not be validated");
		}

	  	test('should return 422 Validation Error if email is empty or falsy value', async () => {
			loginForm = {
				password: 'Pass1word.',
			};
			const response = await request(app).post('/auth/login').send(loginForm);
			commonExpectations(response);
			expect(response.body.errors.email.length).toBe(1); // { ..., email: ["only one error message related with email"] }
			expect(response.body.errors.email).toEqual(["email must not be empty or falsy value"]); 
			expect(response.body.errors).not.toHaveProperty("password");
	  	});


		test('should return 422 Validation Error if email is invalid form', async () => {
			loginForm = {
				email: 'talat1@com',
				password: 'Pass1word.',
			};
			const response = await request(app).post('/auth/login').send(loginForm);
			commonExpectations(response);
			expect(response.body.errors.email.length).toBe(1);
			expect(response.body.errors.email).toEqual(["email must be in valid form"]); 
			expect(response.body.errors).not.toHaveProperty("password");
		});

		
		test('should return 422 Validation Error if password is empty or falsy value', async () => {
			loginForm = {
				email: 'talat@gmail.com',
			};
			const response = await request(app).post('/auth/login').send(loginForm);
			commonExpectations(response);
			expect(response.body.errors).not.toHaveProperty("email");
			expect(response.body.errors.password.length).toBe(1);
			expect(response.body.errors.password).toEqual(["password must not be empty or falsy value"]); 
		});


		test('should return 422 Validation Error if occurs both email, password validation errors', async () => {
			loginForm = {
				email: 'talat@gmail',
				password: '',
			};
			const response = await request(app).post('/auth/login').send(loginForm);
			commonExpectations(response);
			expect(response.body.errors).toEqual({
				"email": ["email must be in valid form"],
				"password": ["password must not be empty or falsy value"],
			});
		});
	});


	describe('Failed logins', () => {

		function commonExpectations(response) {
			expect(response.status).toBe(httpStatus.UNAUTHORIZED);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(401);
		}
		

		test('should return status 401, if the user is not registered', async () => {
			let loginForm = {
				email: 'talat@gmail.com',
				password: 'Pass1word.',
			};
			const response = await request(app).post('/auth/login').send(loginForm);
			commonExpectations(response);
			expect(response.body.message).toEqual("You are not registered user");
		});


		test('should return status 401, if the user is disabled', async () => {
			const hashedPassword = await bcrypt.hash('Pass1word.', 8);
			const authuser = AuthUser.fromObject({
				email: 'talat@gmail.com',
				password: hashedPassword,
				isDisabled: true
			});
			await authuserDbService.addAuthUser(authuser);

			let loginForm = {
				email: 'talat@gmail.com',
				password: 'Pass1word.',
			};
			const response = await request(app).post('/auth/login').send(loginForm);
			expect(response.status).toBe(httpStatus.FORBIDDEN);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(403);
			expect(response.body.message).toEqual("You are disabled, call the system administrator");
		});


		test('should return status 401, if the password is wrong', async () => {
			const hashedPassword = await bcrypt.hash('Pass1word.', 8);
			const authuser = AuthUser.fromObject({
				email: 'talat@gmail.com',
				password: hashedPassword,
			});
			await authuserDbService.addAuthUser(authuser);

			let loginForm = {
				email: 'talat@gmail.com',
				password: 'Pass1word',
			};
			const response = await request(app).post('/auth/login').send(loginForm);
			commonExpectations(response);
			expect(response.body.message).toEqual("Incorrect email or password");
		});
	});



	describe('Success login', () => {
		
		test('should return status 200, user and valid tokens in json form; successfully login user if the request is valid', async () => {
			const hashedPassword = await bcrypt.hash('Pass1word.', 8);
			
			const authuser = AuthUser.fromObject({
				email: 'talat@gmail.com',
				password: hashedPassword,
				services: { emailpassword: "registered" }
			});
				
			await authuserDbService.addAuthUser(authuser);
			
			let loginForm = {
				email: 'talat@gmail.com',
				password: 'Pass1word.',
			};

			const response = await request(app).post('/auth/login').send(loginForm);

			expect(response.status).toBe(httpStatus.OK);
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
			const tokenDoc = await tokenDbService.getToken({
				user: response.body.user.id,
				token: refreshToken,
				expires: moment(response.body.tokens.refresh.expires).toDate(),
				type: tokenTypes.REFRESH,
			});
			expect(tokenDoc?.id).toBeDefined();
		});
	});
})