const httpMocks = require('node-mocks-http');

const { validate } = require('../../src/middlewares');
const userValidation = require('../../src/validations/user.ValidationRules');
const { ApiError } = require('../../src/utils/ApiError');
const { authuserService, userService } = require('../../src/services');

const TestUtil = require('../testutil/TestUtil');


describe('Validate Middleware : Athuser validation rules', () => {

	jest.setTimeout(50000);

	describe('getUsers validation', () => {

		test('getUsers: should throw error 422, if a query param has multiple value', async () => {

			const request = { 
				query: { 
					email: ["email@xxx.com", "email@yyy.com"], // multiple value
					page: ["2", "5"], // multiple value
					role: ["admin", "user"], // multiple value
					sort: "email", 
				} 
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.getUsers)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({ 
				"email": ['The parameter can only appear once in the query string'],
				"page": ['The parameter can only appear once in the query string'],
				"role": ['The parameter can only appear once in the query string'],
			});
		});


		test('getUsers: should throw error 422, if the query param email is not valid email', async () => {
			const request = { 
				query: { email: "email@xxx" } // invalid email form
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.getUsers)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({ "email": ['The query param \'email\' must be in valid form']});
		});


		test('getUsers: should throw error 422, if the query param name is less than 2-length charachter', async () => {
			const request = { 
				query: { name: "" } // less than two
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.getUsers)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({ "name": ['The query param \'name\' must be minumum 2-length charachter']});
		});


		test('getUsers: should throw error 422, if the query param gender is not male, female or none', async () => {
			const request = { 
				query: { gender: "no" } // less than two
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.getUsers)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({ "gender": ['The query param \'gender\' could be only male, female or none']});
		});


		test('getUsers: should throw error 422, if the query param country code is not 3-letter standart country code', async () => {
			const request = { 
				query: { country: "tr" } // should be TUR
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.getUsers)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({ "country": ['The query param \'country\' code must be in the form of 3-letter standart country code']});
		});


		test('getUsers: should throw error 422, if the query param role is not admin or user', async () => {
			const request = { 
				query: { role: "client" } // should be TUR
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.getUsers)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({ "role": ['The query param \'role\' could be one of user,admin']});
		});


		test('getUsers: should throw error 422, if the query param page is not numeric value', async () => {
			const request = { 
				query: { page: "" } // is not numeric
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.getUsers)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({ "page": ['The query param \'page\' must be numeric value']});
		});


		test('getUsers: should throw error 422, if the query param size is not numeric value', async () => {
			const request = { 
				query: { size: "big" } // is not numeric
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.getUsers)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({ "size": ['The query param \'size\' must be numeric value']});
		});


		test('getUsers: should throw error 422, if the query param size is not between 1-50', async () => {
			const request = { 
				query: { size: "51" } // is not between 1-50
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.getUsers)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({ "size": ['The query param \'size\' can be between 1-50']});
		});


		test('getUsers: should throw error 422, if the query param sort contains an invalid character', async () => {
			const request = { 
				query: { sort: "email, createdAt" } // includes comma (only . period and | pipedelimeter allowed)
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.getUsers)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({ "sort": ['The query param \'sort\' can contains a-zA-Z letters . dot and | pipedelimeter']});
		});


		test('getUsers: should continue next middleware if the query params are valid', async () => {
			const request = { 
				query: { 
					email: 'email@xxx.com',
					name: "ta",
					gender: "female",
					country: "TUR",
					role: "user",
					page: "2",
					size: "12",
					sort: 'email.desc | role '
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.getUsers)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith();
		});


		test('getUsers: should continue next middleware even if the request query is absent', async () => {

			const req = httpMocks.createRequest(); // means that "get all authusers"
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.getUsers)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith();
		});
	});



	describe('addUser validation', () => {

		test('addUser: should throw error 422, if the param id is not 24-length character', async () => {
			const request = { 
				params: { id: "1234567890" }, // 10-length string, invalid id
				body: {
					email: "user@gmail.com",
					role: "user",
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.addUser)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({ "id": ['The param id must be a 24-character number'] });
		});

		test('addUser: should throw error 422, if the body is empty', async () => {
			const request = {
				params: { id: "123456789012345678901234" },
				body: {}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			const spyOnValid = jest.spyOn(userService, 'isExist');
			spyOnValid.mockResolvedValue(false);
			
			await validate(userValidation.addUser)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"email": ['email must not be empty or falsy value'],
				"role": ['The role must be setted as \'user\' while creating'],
			});
		});


		test('addUser: should throw error 422, if the email and the role are empty', async () => {
			const request = {
				params: { id: "123456789012345678901234" },
				body: {
					email: "",
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			const spyOnValid = jest.spyOn(userService, 'isExist');
			spyOnValid.mockResolvedValue(false);
			
			await validate(userValidation.addUser)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"email": ['email must not be empty or falsy value'],
				"role": ['The role must be setted as \'user\' while creating'],
			});
		});


		test('addUser: should throw error 422, if the email is invalid form and the role is admin', async () => {
			const request = {
				params: { id: "123456789012345678901234" },
				body: {
					email: "user@gmail",  // invalid email form
					role: "admin"
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			const spyOnValid = jest.spyOn(userService, 'isExist');
			spyOnValid.mockResolvedValue(false);
			
			await validate(userValidation.addUser)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"email": ['email must be in valid form'],
				"role": ['The role must be setted as \'user\' while creating'],
			});
		});


		test('addUser: should throw error 422, if the name is less than 2-length', async () => {
			const request = { 
				params: { id: "123456789012345678901234" },
				body: {
					email: "user@gmail.com",
					role: "user",
					name: "a"  // less than 2-length
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			const spyOnValid = jest.spyOn(userService, 'isExist');
			spyOnValid.mockResolvedValue(false);

			const spyOnExist = jest.spyOn(authuserService, 'isExist');
			spyOnExist.mockResolvedValue(true);
			
			await validate(userValidation.addUser)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"name": ['name must be minimum 2 characters'],
			});
		});

		
		test('addUser: should throw error 422, if the gender is not one of male, female, none', async () => {
			const request = {
				params: { id: "123456789012345678901234" },
				body: {
					email: "user@gmail.com",
					role: "user",
					gender: "no"  // is not valid
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			const spyOnValid = jest.spyOn(userService, 'isExist');
			spyOnValid.mockResolvedValue(false);

			const spyOnExist = jest.spyOn(authuserService, 'isExist');
			spyOnExist.mockResolvedValue(true);
			
			await validate(userValidation.addUser)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"gender": ['gender could be male, female or none'],
			});
		});
		
		
		test('addUser: should throw error 422, if the country code is not valid 3-letter iso code', async () => {
			const request = {
				params: { id: "123456789012345678901234" },
				body: {
					email: "user@gmail.com",
					role: "user",
					country: "tr"  // should be tur, or TUR
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			const spyOnValid = jest.spyOn(userService, 'isExist');
			spyOnValid.mockResolvedValue(false);

			const spyOnExist = jest.spyOn(authuserService, 'isExist');
			spyOnExist.mockResolvedValue(true);
			
			await validate(userValidation.addUser)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"country": ['country code must be 3-letter standart iso code'],
			});
		});
		
		
		test('addUser: should throw error 422, if there is no authuser correspondent with the same id and email', async () => {
			const request = {
				params: { id: "123456789012345678901234" },
				body: {
					email: "user@gmail.com",
					role: "user"
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			const spyOnValid = jest.spyOn(userService, 'isExist');
			spyOnValid.mockResolvedValue(false);

			const spyOnExist = jest.spyOn(authuserService, 'isExist');
			spyOnExist.mockResolvedValue(false);  // here created the validation error
			
			await validate(userValidation.addUser)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"body": ['There is no correspondent authenticated user with the same id and email'],
			});
		});


		test('addUser: should throw error 422, if there is another user with the same id', async () => {
			const request = {
				params: { id: "123456789012345678901234" },
				body: {
					email: "user@gmail.com",
					role: "user"
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			const spyOnValid = jest.spyOn(userService, 'isExist');
			spyOnValid.mockResolvedValue(true); // here created the validation error

			const spyOnExist = jest.spyOn(authuserService, 'isExist');
			spyOnExist.mockResolvedValue(true);
			
			await validate(userValidation.addUser)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"id": ['There is another user with the same id'],
			});
		});


		test('addUser: should throw error 422, if there is another parameter in the request body', async () => {
			const request = {
				params: { id: "123456789012345678901234" },
				body: {
					email: "user@gmail.com",
					role: "user",
					anotherfield: "",
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			const spyOnValid = jest.spyOn(userService, 'isExist');
			spyOnValid.mockResolvedValue(false);

			const spyOnExist = jest.spyOn(authuserService, 'isExist');
			spyOnExist.mockResolvedValue(true);
			
			await validate(userValidation.addUser)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"body": ['Any extra parameter is not allowed other than email,role,name,gender,country'],
			});
		});


		test('addUser: should continue next middleware if the body elements are valid; and no optional fields', async () => {
			const request = {
				params: { id: "123456789012345678901234" },
				body: {
					email: "user@gmail.com",
					role: "user",
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			const spyOnValid = jest.spyOn(userService, 'isExist');
			spyOnValid.mockResolvedValue(false);

			const spyOnExist = jest.spyOn(authuserService, 'isExist');
			spyOnExist.mockResolvedValue(true);
			
			await validate(userValidation.addUser)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith();
		});


		test('addUser: should continue next middleware if the body elements including optionals are valid', async () => {
			const request = {
				params: { id: "123456789012345678901234" },
				body: {
					email: "user@gmail.com",
					role: "  user  ", // sanitized, trimmed, no problem
					name: "Talat",
					gender: "  MALE  ", // sanitized, trimmed, no problem
					country: " tur  " // sanitized, trimmed, no problem
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			const spyOnValid = jest.spyOn(userService, 'isExist');
			spyOnValid.mockResolvedValue(false);

			const spyOnExist = jest.spyOn(authuserService, 'isExist');
			spyOnExist.mockResolvedValue(true);
			
			await validate(userValidation.addUser)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith();
		});
	});



	describe('getUser validation', () => {

		test('getUser: should throw error 422, if the param id is not 24-length character', async () => {
			const request = { 
				params: { id: "1234567890" } // 10-length string, invalid id
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.getUser)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({ "id": ['The param id must be a 24-character number'] });
		});


		test('getUser: should continue next middleware if the param id is valid', async () => {
			const request = { 
				params: { id: "123456789012345678901234" } // 24-length string, valid id
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.getUser)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith();
		});
	});



	describe('updateUser validation', () => {

		test('updateUser: should throw error 422, if the param id and the body elements are invalid', async () => {
			const request = { 
				params: { id: "1234567890" }, // 10-length string, invalid id
				body: {
					name: "a",
					gender: "no",
					country: "tr"
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.updateUser)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"id": ['The param id must be a 24-character number'],
				"name": ['name must be minimum 2 characters'],
				"gender": ['gender could be male, female or none'],
				"country": ['country code must be 3-letter standart iso code'],
			});
		});


		test('updateUser: should throw error 422, for only those appear in the body', async () => {
			const request = { 
				params: { id: "123456789012345678901234" },  // 24-length string, valid id
				body: {
					country: "tr"
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.updateUser)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"country": ['country code must be 3-letter standart iso code'],
			});
		});


		test('updateUser: should throw error 422, if the body does not contain any element valid', async () => {
			const request = { 
				params: { id: "123456789012345678901234" },
				body: {}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.updateUser)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"body": ['The request body should contain at least one of the name, gender, country'],
			});
		});


		test('updateUser: should throw error 422, if the body contain another element than valid', async () => {
			const request = { 
				params: { id: "123456789012345678901234" },
				body: {
					another: "",
					name: "Alex"
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.updateUser)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({
				"body": [ 'Any extra parameter is not allowed other than name,gender,country' ],
			});
		});


		test('updateUser: should continue next middleware if the param is valid and the body contains at least one element valid', async () => {
			const request = { 
				params: { id: "123456789012345678901234" }, // 24-length string, valid id
				body: {
					name: "Talat",
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.updateUser)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith();
		});


		test('updateUser: should continue next middleware if the param id and body elements are valid', async () => {
			const request = { 
				params: { id: "123456789012345678901234" }, // 24-length string, valid id
				body: {
					name: "Talat",
					gender: "  MALE  ", // sanitized, trimmed, no problem
					country: " tur  " // sanitized, trimmed, no problem
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.updateUser)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith();
		});
	});



	describe('changeRole validation', () => {

		test('changeRole: should throw error 422, if the param id is not 24-length character', async () => {
			const request = { 
				params: { id: "1234567890" }, // 10-length string, invalid id
				body: {
					role: "admin"
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.changeRole)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({ "id": ['The param id must be a 24-character number'] });
		});


		test('changeRole: should throw error 422, if the role is wrong; and another param appears in the body', async () => {
			const request = { 
				params: { id: "123456789012345678901234" }, // 24-length string, valid id
				body: {
					role: "super",
					email: "superadmin@gmail.com"
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.changeRole)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({ 
				"role": ['role could be one of user,admin'], 
				"body": ['Any extra parameter is not allowed other than \'role\''] 
			});
		});


		test('changeRole: should continue next middleware if the param id is valid and the body param role is valid', async () => {
			const request = { 
				params: { id: "123456789012345678901234" }, // 24-length string, valid id
				body: {
					role: "admin"
				}
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.changeRole)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith();
		});
	});



	describe('deleteUser validation', () => {

		test('deleteUser: should throw error 422, if the param id is not 24-length character', async () => {
			const request = { 
				params: { id: "1234567890" } // 10-length string, invalid id
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.deleteUser)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			TestUtil.validationErrorInMiddleware(err);
			expect(err.errors).toEqual({ "id": ['The param id must be a 24-character number'] });
		});


		test('deleteUser: should continue next middleware if the param id is valid', async () => {
			const request = { 
				params: { id: "123456789012345678901234" } // 24-length string, valid id
			};

			const req = httpMocks.createRequest(request);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await validate(userValidation.deleteUser)(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith();
		});
	});
});