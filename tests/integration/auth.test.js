const request = require('supertest');
const httpStatus = require('http-status');

const app = require('../../src/core/express');

require('./setupTestDatabase')();
require('./setupRedis')();


describe('Auth routes', () => {

	describe('POST /auth/signup', () => {

		jest.setTimeout(20000);

		let registerform;

	  	test('should return 422 Validation Error if email is empty or falsy value', async () => {
			registerform = {
				password: 'Pass1word.',
				passwordConfirmation: 'Pass1word.'
			};
			const response = await request(app).post('/auth/signup').send(registerform);
			expect(response.status).toBe(httpStatus.UNPROCESSABLE_ENTITY);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(422);
			expect(response.body.message).toEqual("Validation Error");
			expect(response.body.errors).toHaveProperty("email");
			expect(response.body.errors.email.length).toBe(1); // { ..., email: ["only one error message related with email"] }
			expect(response.body.errors).not.toHaveProperty("password");
			expect(response.body.errors).not.toHaveProperty("passwordConfirmation");
	  	});


		// test('should return 422 Validation Error if email is invalid form', async () => {
		
		// });


	  	// test('should return 422 Validation Error if email is already taken', async () => {
		
	  	// });

		
		// test('should return 422 Validation Error if password is empty or falsy value', async () => {
		
		// });


	  	// test('should return 422 Validation Error if password length is less than 8 characters', async () => {
		
	  	// });


	  	// test('should return 422 Validation Error if password does not contain at least one uppercase, one lowercase, one number and one special char', async () => {

	  	// });


		// test('should return 422 Validation Error if password confirmation does not match with the password', async () => {
		
		// });


		// test('should return 422 Validation Error if occurs all email, password, confirmation password validation errors', async () => {
		
		// });


		// test('should return status 201, user and tokens in json form; successfully register user if the request is valid', async () => {

		// });

	});
})