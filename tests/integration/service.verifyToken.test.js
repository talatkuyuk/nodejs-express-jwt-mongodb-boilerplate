const request = require('supertest');
const httpStatus = require('http-status');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = require('../../src/core/express');
const authuserService = require('../../src/services/authuser.service');
const tokenDbService = require('../../src/services/token.db.service');
const { AuthUser, Token } = require('../../src/models');
const config = require('../../src/config');
const { tokenTypes } = require('../../src/config/tokens');

const { setupTestDatabase } = require('../setup-data/setupTestDatabase');
const { setupRedis } = require('../setup-data/setupRedis');


setupTestDatabase();
setupRedis();


describe('POST /auth/logout', () => {

	jest.setTimeout(50000);

	describe('Tests for Token Errors', () => {

		test('should return ApiError with code 401 if the token is expired', async () => {
			
		});

		test('should return ApiError with code 401 if the token has wrong signature', async () => {
			
		});
	});



	describe('Tests for Refresh Token Specific Errors', () => {

		// Refresh token is used in these routes: /auth/logout, /auth/signout and /auth/refreshtoken


		// during signout+logout
		test('should return 200 if refresh token is used after "not before than"', async () => {
			
		});

		// during refreshtoken
		test('should return ApiError with code 401 if refresh token is used at time "not before than"', async () => {
			
		});

	});


	describe('Token Database Related Errors', () => {

		test('should return ApiError with code 401 if the verified token is not in the database (token, type, user)', async () => {
			
		});


		test('should return ApiError with code 401 if the verified token in the database is blacklisted', async () => {
			
		});


		test('should return ApiError with code 401 if the verified token in the database refers to another user', async () => {
			
		});
	});


	describe('Success Token Verification and token or its family is removed from db', () => {
		
		test('should return the verified token', async () => {

		});
	});
})