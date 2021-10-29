const httpMocks = require('node-mocks-http');

const { validate } = require('../../src/middlewares');
const authValidation = require('../../src/validations/auth.ValidationRules');
const { ApiError } = require('../../src/utils/ApiError');
const { authuserService } = require('../../src/services');

const TestUtil = require('../testutil/TestUtil');


describe('Validate Middleware : Auth validation rules', () => {

	describe('signup validation', () => {

		test('signup: should throw error 422, if the body is empty', async () => {
			const request = { 
				body: {}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			const spyOnEmail = jest.spyOn(authuserService, 'isEmailTaken');
			spyOnEmail.mockResolvedValue(false);
			
			await validate(authValidation.signupValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"email": ['email must not be empty or falsy value'],
				"password": ['password must not be empty or falsy value'],
				"passwordConfirmation": ['password confirmation must not be empty or falsy value'],
			});
		});


		test('signup: should throw error 422, if the email and password is empty', async () => {
			const request = { 
				body: {
					email: "",
					password: ""
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			const spyOnEmail = jest.spyOn(authuserService, 'isEmailTaken');
			spyOnEmail.mockResolvedValue(false);
			
			await validate(authValidation.signupValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"email": ['email must not be empty or falsy value'],
				"password": ['password must not be empty or falsy value'],
				"passwordConfirmation": ['password confirmation must not be empty or falsy value'],
			});
		});


		test('signup: should throw error 422, if the email and password are not in valid form', async () => {
			const request = {
				body: {
					email: "user@gmail", // invalid email form
					password: "1234", // less than 8 charachters
					passwordConfirmation: "" // empty
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			const spyOnEmail = jest.spyOn(authuserService, 'isEmailTaken');
			spyOnEmail.mockResolvedValue(false);
			
			await validate(authValidation.signupValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"email": ['email must be in valid form'],
				"password": ['password must be minimum 8 characters'],
				"passwordConfirmation": ['password confirmation must not be empty or falsy value'],
			});
		});


		test('signup: should throw error 422, if the password is not valid and confirmation does not match', async () => {
			const request = {
				body: {
					email: "user@gmail.com",
					password: "Password", // no number and special char
					passwordConfirmation: "Password+" // does not match with the password
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			const spyOnEmail = jest.spyOn(authuserService, 'isEmailTaken');
			spyOnEmail.mockResolvedValue(false);
			
			await validate(authValidation.signupValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"password": ['password must contain at least one uppercase, one lowercase, one number and one special char'],
				"passwordConfirmation": ['password confirmation does not match with the password'],
			});
		});


		test('signup: should throw error 422, if the email is already taken', async () => {
			const request = {
				body: {
					email: "user@gmail.com",
					password: "Pass1word!",
					passwordConfirmation: "Pass1word!"
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			const spyOnEmail = jest.spyOn(authuserService, 'isEmailTaken');
			spyOnEmail.mockResolvedValue(true);
			
			await validate(authValidation.signupValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"email": ['email is already taken'],
			});
		});


		test('signup: should throw error 422, if the body contains any other parameter', async () => {
			const request = {
				body: {
					email: "user@gmail.com",
					password: "Pass1word!",
					passwordConfirmation: "Pass1word!",
					otherParameter: "" // this is not allowed
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			const spyOnEmail = jest.spyOn(authuserService, 'isEmailTaken');
			spyOnEmail.mockResolvedValue(false);
			
			await validate(authValidation.signupValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"body": ['Any extra parameter is not allowed other than email,password,passwordConfirmation'],
			});
		});


		test('signup: should continue next middleware if the body elements are valid', async () => {
			const request = {
				body: {
					email: "user@gmail.com",
					password: "Pass1word!",
					passwordConfirmation: "Pass1word!"
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			const spyOnEmail = jest.spyOn(authuserService, 'isEmailTaken');
			spyOnEmail.mockResolvedValue(false);
			
			await validate(authValidation.signupValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith();
		});

	});



	describe('login validation', () => {

		test('login: should throw error 422, if the body is empty', async () => {
			const request = { 
				body: {}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(authValidation.loginValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"email": ['email must not be empty or falsy value'],
				"password": ['password must not be empty or falsy value'],
			});
		});


		test('login: should throw error 422, if the email and password is empty', async () => {
			const request = { 
				body: {
					email: "",
					password: ""
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(authValidation.loginValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"email": ['email must not be empty or falsy value'],
				"password": ['password must not be empty or falsy value'],
			});
		});


		test('login: should throw error 422, if the email and password are not in valid form', async () => {
			const request = {
				body: {
					email: "user@gmail", // invalid email form
					password: "1234", // less than 8 charachters
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(authValidation.loginValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"email": ['email must be in valid form'],
			});
		});


		test('login: should throw error 422, if the body contains any other parameter', async () => {
			const request = {
				body: {
					email: "user@gmail.com",
					password: "Pass1word!",
					otherParameter: "" // this is not allowed
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(authValidation.loginValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"body": ['Any extra parameter is not allowed other than email,password'],
			});
		});


		test('login: should continue next middleware if the body elements are valid', async () => {
			const request = {
				body: {
					email: "user@gmail.com",
					password: "Pass1word!",
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(authValidation.loginValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith();
		});
	});



	describe('refreshTokens validation', () => {

		test('refreshTokens: should throw error 422, if the body is empty', async () => {
			const request = { 
				body: {}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(authValidation.refreshTokensValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"refreshToken": ['refresh token must not be empty'],
			});
		});


		test('refreshTokens: should throw error 422, if the refresh token is empty', async () => {
			const request = { 
				body: {
					refreshToken: ""
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(authValidation.refreshTokensValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"refreshToken": ['refresh token must not be empty'],
			});
		});


		test('refreshTokens: should continue next middleware if the body elements are valid', async () => {
			const request = {
				body: {
					refreshToken: "json-web-token-for-refresh-token"
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(authValidation.refreshTokensValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith();
		});
	});



	describe('forgotPassword validation', () => {

		test('forgotPassword: should throw error 422, if the body is empty', async () => {
			const request = { 
				body: {}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(authValidation.forgotPasswordValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"email": ['email must not be empty or falsy value'],
			});
		});


		test('forgotPassword: should throw error 422, if the email is empty', async () => {
			const request = { 
				body: {
					email: ""
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(authValidation.forgotPasswordValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"email": ['email must not be empty or falsy value'],
			});
		});


		test('forgotPassword: should throw error 422, if the email is not in valid form', async () => {
			const request = {
				body: {
					email: "user@gmail", // invalid email form
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(authValidation.forgotPasswordValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"email": ['email must be in valid form'],
			});
		});


		test('forgotPassword: should continue next middleware if the body elements are valid', async () => {
			const request = {
				body: {
					email: "user@gmail.com", // valid email form
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(authValidation.forgotPasswordValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith();
		});
	});
	


	describe('resetPassword validation', () => {

		test('resetPassword: should throw error 422, if the body is empty', async () => {
			const request = { 
				body: {}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(authValidation.resetPasswordValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"password": ['password must not be empty or falsy value'],
				"passwordConfirmation": ['password confirmation must not be empty or falsy value'],
				"token": ['token must not be empty'],
			});
		});


		test('resetPassword: should throw error 422, if the body elements are empty', async () => {
			const request = { 
				body: {
					password: "",
					resetPassword: "",
					token: ""
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(authValidation.resetPasswordValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"password": ['password must not be empty or falsy value'],
				"passwordConfirmation": ['password confirmation must not be empty or falsy value'],
				"token": ['token must not be empty'],
			});
		});


		test('resetPassword: should throw error 422, if the password is less than 8-length', async () => {
			const request = {
				body: {
					password: "1234", // less than 8 charachters
					passwordConfirmation: "", // empty
					token: "some-token-text-here"
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(authValidation.resetPasswordValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"password": ['password must be minimum 8 characters'],
				"passwordConfirmation": ['password confirmation must not be empty or falsy value'],
			});
		});


		test('resetPassword: should throw error 422, if the password does not contain special character and the confirmation does not match', async () => {
			const request = {
				body: {
					password: "Password", // no number and special char
					passwordConfirmation: "Password+", // does not match with the password
					token: "some-token-text-here"
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(authValidation.resetPasswordValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"password": ['password must contain at least one uppercase, one lowercase, one number and one special char'],
				"passwordConfirmation": ['password confirmation does not match with the password'],
			});
		});


		test('resetPassword: should continue next middleware if the body elements are valid', async () => {
			const request = {
				body: {
					password: "Pass1word+", 
					passwordConfirmation: "Pass1word+",
					token: "some-token-text-here"
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(authValidation.resetPasswordValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith();
		});
	});



	describe('verifyEmail validation', () => {

		test('verifyEmail: should throw error 422, if the body is empty', async () => {
			const request = { 
				body: {}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(authValidation.verifyEmailValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"token": ['token must not be empty'],
			});
		});


		test('verifyEmail: should throw error 422, if the token is empty', async () => {
			const request = { 
				body: {
					token: ""
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(authValidation.verifyEmailValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"token": ['token must not be empty'],
			});
		});


		test('verifyEmail: should continue next middleware if the body elements are valid', async () => {
			const request = {
				body: {
					token: "json-web-token-for-refresh-token"
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(authValidation.verifyEmailValidationRules)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith();
		});
	});
});