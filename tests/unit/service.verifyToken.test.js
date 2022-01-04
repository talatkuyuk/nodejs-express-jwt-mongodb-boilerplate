const httpStatus = require('http-status');

const ApiError = require('../../src/utils/ApiError');

const { tokenService } = require('../../src/services');
const { Token } = require('../../src/models');
const { tokenTypes } = require('../../src/config/tokens');

const testData = require('../testutils/testdata');
const TestUtil = require('../testutils/TestUtil');

const { setupTestDatabase } = require('../setup/setupTestDatabase');
const { setupRedis } = require('../setup/setupRedis');


setupTestDatabase();
setupRedis();


describe('Test for Refresh Token Rotation', () => {

	TestUtil.MatchErrors();

	describe('Tests for Token Errors', () => {

		test('should throw ApiError with code 401 if the reset password token is expired', async () => {

			const token = testData.RESET_PASSWORD_TOKEN_EXPIRED;
			const type = tokenTypes.RESET_PASSWORD;

			const expectedError = new ApiError(httpStatus.UNAUTHORIZED, "TokenExpiredError: jwt expired");

			expect(() => tokenService.verifyToken(token, type)).rejects.toThrow(expect.toBeMatchedWithError(expectedError));
		});

		
		test('should throw ApiError with code 401 if the refresh token has wrong signature', async () => {
			const token = testData.TOKEN_WITH_INVALID_SIGNATURE;
			const type = tokenTypes.VERIFY_EMAIL;

			const expectedError = new ApiError(httpStatus.UNAUTHORIZED, "JsonWebTokenError: invalid signature");

			expect(() => tokenService.verifyToken(token, type)).rejects.toThrow(expect.toBeMatchedWithError(expectedError));
		});


		test('should throw ApiError with code 401 if the token is malformed (Undefined)', async () => {
			const token = testData.VERIFY_EMAIL_TOKEN_UNDEFINED; // there is no such token in testData in order to simulate "undefined"
			const type = tokenTypes.VERIFY_EMAIL;

			const expectedError = new ApiError(httpStatus.UNAUTHORIZED, "JsonWebTokenError: jwt must be provided");

			expect(() => tokenService.verifyToken(token, type)).rejects.toThrow(expect.toBeMatchedWithError(expectedError));
		});
	});


	describe('Token Database Related Errors', () => {

		test('should throw ApiError with code 401 if the verified token is not in the database (token, type, user)', async () => {
			const token = testData.REFRESH_TOKEN_VALID; // There is no such token in the database
			const type = tokenTypes.REFRESH;

			const expectedError = new ApiError(httpStatus.UNAUTHORIZED, "the token is not valid");
			expect(() => tokenService.verifyToken(token, type)).rejects.toThrow(expect.toBeMatchedWithError(expectedError));
		});

	});


	describe('Success Token Verification', () => {
		
		test('Reset-Password Token: should return the token document', async () => {

			const userId = "613b417848981bfd6e91c662";
		  
			const resetPasswordToken = await tokenService.generateResetPasswordToken(userId);

			const data = await tokenService.verifyToken(resetPasswordToken.token, tokenTypes.RESET_PASSWORD);
			expect(data).toEqual(expect.any(Token));
		});


		test('Verify-Email Token: should return the token document', async () => {

			const userId = "613b417848981bfd6e91c662";
		  
			const verifyEmailToken = await tokenService.generateVerifyEmailToken(userId);

			const data = await tokenService.verifyToken(verifyEmailToken.token, tokenTypes.VERIFY_EMAIL);
			expect(data).toEqual(expect.any(Token));
		});
	});
})