const request = require('supertest');
const httpStatus = require('http-status');
const jwt = require('jsonwebtoken');

const app = require('../../src/core/express');
const config = require('../../src/config');

const { authuserDbService, tokenDbService, tokenService, emailService } = require('../../src/services');
const { AuthUser } = require('../../src/models');
const { tokenTypes } = require('../../src/config/tokens');

const { setupTestDatabase } = require('../setup/setupTestDatabase');
const { setupRedis } = require('../setup/setupRedis');


setupTestDatabase();
setupRedis();


describe('POST /auth/send-verification-email', () => {

	jest.setTimeout(50000);

	let accessToken, refreshToken;
	let authuser, tokens;
	const userAgent = "from-jest-test";

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


	describe('Failed send-verification-email process', () => {

		test('should return status 400, if the email is already verified', async () => {

			// update the authuser with isEmailVerifid true
			await authuserDbService.updateAuthUser(authuser.id, { isEmailVerified: true });

			const response = await request(app).post('/auth/send-verification-email')
												.set('Authorization', `Bearer ${accessToken}`) 
												.set('User-Agent', userAgent) 
												.send();
			
			expect(response.status).toBe(httpStatus.BAD_REQUEST);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toBe(400);
			expect(response.body.name).toBe("ApiError");
			expect(response.body.message).toEqual("Email is already verified");
			expect(response.body).toHaveProperty("description");
			expect(response.body).not.toHaveProperty("errors");
		});


		test('should return status 500, if the email service does not respond', async () => {

			// spy on transporter to produce error
			jest.spyOn(emailService.transporter, 'sendMail').mockImplementation(() => Promise.reject(new Error("email service does not respond")));

			const response = await request(app).post('/auth/send-verification-email')
												.set('Authorization', `Bearer ${accessToken}`) 
												.set('User-Agent', userAgent) 
												.send();

			expect(response.status).toBe(httpStatus.INTERNAL_SERVER_ERROR);
			expect(response.body).toEqual({
				"code": 500,
				"name": "ApiError",
				"message": "email service does not respond",
				"description": expect.any(String)
			});
		});
	});



	describe('Success send-verification-email process', () => {

		test('should return status 204, generate and store verify-email token in db', async () => {

			// spy on transporter and sendVerificationEmail of the emailService
			jest.spyOn(emailService.transporter, 'sendMail').mockResolvedValue("The verification email is sent.");
			const spyOnSendVerificationEmail = jest.spyOn(emailService, 'sendVerificationEmail');

			const response = await request(app).post('/auth/send-verification-email')
												.set('Authorization', `Bearer ${accessToken}`) 
												.set('User-Agent', userAgent) 
												.send();

			expect(response.status).toBe(httpStatus.NO_CONTENT);

			expect(spyOnSendVerificationEmail).toHaveBeenCalledWith(authuser.email, expect.any(String));
			
			// obtain the token from the function on that spied 
			const verifyEmailToken = spyOnSendVerificationEmail.mock.calls[0][1];

			// check the verify email token belongs to the authuser
			const { sub } = jwt.decode(verifyEmailToken, config.jwt.secret);
			expect(sub).toEqual(authuser.id);

			// check the verify email token is stored in db
			const verifyEmailTokenDoc = await tokenDbService.getToken({ token: verifyEmailToken, user: authuser.id, type: tokenTypes.VERIFY_EMAIL });
			expect(verifyEmailTokenDoc.user.toString()).toEqual(authuser.id);
 		})
	});

});
