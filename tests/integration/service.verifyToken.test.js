const request = require('supertest');
const httpStatus = require('http-status');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const ApiError = require('../../src/utils/ApiError');
const {serializeError} = require('serialize-error');

const app = require('../../src/core/express');
const { tokenService, tokenDbService } = require('../../src/services');
const { AuthUser, Token } = require('../../src/models');
const config = require('../../src/config');
const { tokenTypes } = require('../../src/config/tokens');
const testData = require('../data/testdata');
const TestUtil = require('../testutil/TestUtil');
const { setupTestDatabase } = require('../setup/setupTestDatabase');
const { setupRedis } = require('../setup/setupRedis');


setupTestDatabase();
setupRedis();


describe('Test for Refresh Token Rotation', () => {

	jest.setTimeout(50000);

	TestUtil.MatchErrors();

	describe('Tests for Token Errors', () => {

		test('should throw ApiError with code 401 if the reset password token is expired', async () => {

			const token = testData.RESET_PASSWORD_TOKEN_EXPIRED;
			const type = tokenTypes.RESET_PASSWORD;

			const expectedError = new ApiError(httpStatus.UNAUTHORIZED, "TokenExpiredError: jwt expired");

			expect(() => tokenService.verifyToken(token, type)).rejects.toThrow(expect.toBeMatchedWithError(expectedError));
		});

		
		test('should throw ApiError with code 401 if the refresh token has wrong signature', async () => {
			const token = testData.REFRESH_TOKEN_WITH_INVALID_SIGNATURE;
			const type = tokenTypes.REFRESH;

			const expectedError = new ApiError(httpStatus.UNAUTHORIZED, "JsonWebTokenError: invalid signature");

			expect(() => tokenService.verifyToken(token, type)).rejects.toThrow(expect.toBeMatchedWithError(expectedError));
		});


		test('should throw ApiError with code 401 if the token is malformed (Undefined)', async () => {
			const token = testData.VERIFY_EMAIL_TOKEN_UNDEFINED;
			const type = tokenTypes.VERIFY_EMAIL;

			const expectedError = new ApiError(httpStatus.UNAUTHORIZED, "JsonWebTokenError: jwt must be provided");

			expect(() => tokenService.verifyToken(token, type)).rejects.toThrow(expect.toBeMatchedWithError(expectedError));
		});
	});


	describe('Token Database Related Errors', () => {

		test('should throw ApiError with code 401 if the verified token is not in the database (token, type, user)', async () => {
			const token = testData.REFRESH_TOKEN_VALID;
			const type = tokenTypes.REFRESH;

			const expectedError = new ApiError(httpStatus.UNAUTHORIZED, `ApiError: ${type} token is not valid`);

			expect(() => tokenService.verifyToken(token, type)).rejects.toThrow(expect.toBeMatchedWithError(expectedError));
		});

	});


	describe('Success Token Verification', () => {
		
		test('Refresh Token: should return the token document even if it used NotBeforeThan', async () => {

			const userId = "613b417848981bfd6e91c662";
			const userAgent = "from-jest";
			const jti = crypto.randomBytes(16).toString('hex');

			const { refreshToken, refreshTokenExpires } = await tokenService.generateRefreshToken(userId, userAgent, jti);

			const token = refreshToken;
			const type = tokenTypes.REFRESH;

			// normally, the refresh token can not be used before than NotBeforeThan value or when it is expired (it's violation)
			const data = await tokenService.verifyToken(token, type);

			// we expect to result to be okey for Refresh Token Verification
			expect(data).toEqual(expect.any(Token));
		});


		test('Refresh Token: should return the token document even if it is expired', async () => {

			const userId = "6144e57c8b82d136729d290a";
			const token = testData.REFRESH_TOKEN_EXPIRED;
			const type = tokenTypes.REFRESH;

			await tokenDbService.saveToken({
				token,
				user: userId,
				type,
				expires: "mo-matter-for-test",
				family: "mo-matter-for-test",
				blacklisted: false
			})

			// normally, the refresh token can not be used when it is expired (it's violation)
			const data = await tokenService.verifyToken(token, type);

			// we expect to result to be okey for Refresh Token Verification
			expect(data).toEqual(expect.any(Token));
		});


		test('Reset-Password Token: should return the token document', async () => {

			const userId = "613b417848981bfd6e91c662";
		  
			const token = await tokenService.generateResetPasswordToken(userId);
			const type = tokenTypes.RESET_PASSWORD;			

			const data = await tokenService.verifyToken(token, type);
			expect(data).toEqual(expect.any(Token));
		});


		test('Verify-Email Token: should return the token document', async () => {

			const userId = "613b417848981bfd6e91c662";
		  
			const token = await tokenService.generateVerifyEmailToken(userId);
			const type = tokenTypes.VERIFY_EMAIL;			

			const data = await tokenService.verifyToken(token, type);
			expect(data).toEqual(expect.any(Token));
		});
	});
})