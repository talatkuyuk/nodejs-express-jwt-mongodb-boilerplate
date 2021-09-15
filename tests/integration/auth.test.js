const request = require('supertest');

describe('Auth routes', () => {
	describe('POST /auth/signup', () => {

	  	test('should return 422 Validation Error if email is empty or falsy value', async () => {
		
	  	});


		test('should return 422 Validation Error if email is invalid form', async () => {
		
		});


	  	test('should return 422 Validation Error if email is already taken', async () => {
		
	  	});

		
		test('should return 422 Validation Error if password is empty or falsy value', async () => {
		
		});


	  	test('should return 422 Validation Error if password length is less than 8 characters', async () => {
		
	  	});


	  	test('should return 422 Validation Error if password does not contain at least one uppercase, one lowercase, one number and one special char', async () => {

	  	});


		test('should return 422 Validation Error if password confirmation does not match with the password', async () => {
		
		});


		test('should return 422 Validation Error if occurs all email, password, confirmation password validation errors', async () => {
		
		});


		test('should return status 201, user and tokens in json form; successfully register user if the request is valid', async () => {

		});

	});
})