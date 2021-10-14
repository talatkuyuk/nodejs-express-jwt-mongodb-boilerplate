const request = require('supertest');
const httpStatus = require('http-status');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = require('../../src/core/express');
const config = require('../../src/config');

const { authuserDbService, tokenDbService, emailService } = require('../../src/services');
const { AuthUser } = require('../../src/models');
const { tokenTypes } = require('../../src/config/tokens');

const { setupTestDatabase } = require('../setup/setupTestDatabase');

setupTestDatabase();

describe('POST /auth/forgot-password', () => {

	jest.setTimeout(50000);

	let forgotPasswordForm;

	describe('Request Validation (email) Errors', () => {

		function commonExpectations(response) {
			expect(response.status).toBe(httpStatus.UNPROCESSABLE_ENTITY);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(422);
			expect(response.body.name).toEqual("ValidationError");
			expect(response.body.message).toEqual("The request could not be validated");
			expect(response.body).not.toHaveProperty("description");
			expect(response.body.errors.email.length).toBe(1); 
		}

		test('should return 422 Validation Error if email is empty or falsy value', async () => {
			forgotPasswordForm = {};

			const response = await request(app).post('/auth/forgot-password').send(forgotPasswordForm);

			commonExpectations(response);
			expect(response.body.errors.email).toEqual(["email must not be empty or falsy value"]); 
		});


		test('should return 422 Validation Error if email is invalid form', async () => {
			forgotPasswordForm = { email: 'talat1@com' };

			const response = await request(app).post('/auth/forgot-password').send(forgotPasswordForm);

			commonExpectations(response);
			expect(response.body.errors.email).toEqual(["email must be in valid form"]); 
		});
	});



	describe('Failed forgot-password process', () => {

		test('should return status 404, if there is no user with the email', async () => {
			forgotPasswordForm = { email: 'talat@gmail.com' };

			const response = await request(app).post('/auth/forgot-password').send(forgotPasswordForm);

			expect(response.status).toBe(httpStatus.NOT_FOUND);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(404);
			expect(response.body).toHaveProperty("name");
			expect(response.body).toHaveProperty("description");
			expect(response.body).not.toHaveProperty("errors");
			expect(response.body.message).toEqual("No user found");
		});


		test.only('should return status 500, if the email service does not respond', async () => {
			const authuserx = AuthUser.fromObject({
				email: 'talat@gmail.com',
				password: await bcrypt.hash('Pass1word.', 8),
			});

			// ad the authuserx into db
			const authuser = await authuserDbService.addAuthUser(authuserx);

			// spy on transporter to produce error
			jest.spyOn(emailService.transporter, 'sendMail').mockImplementation(() => Promise.reject(new Error("email service does not respond")));

			forgotPasswordForm = { email: authuser.email };
			const response = await request(app).post('/auth/forgot-password').send(forgotPasswordForm);

			expect(response.status).toBe(httpStatus.INTERNAL_SERVER_ERROR);
			expect(response.body).toEqual({
				"code": 500,
				"name": "ApiError",
				"message": "email service does not respond",
				"description": expect.any(String)
			});
		});
	});



	describe('Success forgot-password process', () => {

		test('should return status 204, generate and store reset-password token in db', async () => {
			
			const authuserx = AuthUser.fromObject({
				email: 'talat@gmail.com',
				password: await bcrypt.hash('Pass1word.', 8),
			});

			// ad the authuserx into db
			const authuser = await authuserDbService.addAuthUser(authuserx);

			// spy on transporter and sendResetPasswordEmail of the emailService
			jest.spyOn(emailService.transporter, 'sendMail').mockResolvedValue("The reset password email is sent.");
			const spyOnSendResetPasswordEmail = jest.spyOn(emailService, 'sendResetPasswordEmail');

			forgotPasswordForm = { email: authuser.email };
			const response = await request(app).post('/auth/forgot-password').send(forgotPasswordForm);

			expect(response.status).toBe(httpStatus.NO_CONTENT);

			expect(spyOnSendResetPasswordEmail).toHaveBeenCalledWith(authuser.email, expect.any(String));
			
			// obtain the token from function on that spied 
			const resetPasswordToken = spyOnSendResetPasswordEmail.mock.calls[0][1];

			// check the reset password token belongs to the authuser
			const { sub } = jwt.decode(resetPasswordToken, config.jwt.secret);
			expect(sub).toEqual(authuser.id.toString());

			// check the reset password token is stored in db
			const resetPasswordTokenDoc = await tokenDbService.getToken({ token: resetPasswordToken, user: authuser.id, type: tokenTypes.RESET_PASSWORD });
			expect(resetPasswordTokenDoc.user).toEqual(authuser.id);
 		})
	});

});
