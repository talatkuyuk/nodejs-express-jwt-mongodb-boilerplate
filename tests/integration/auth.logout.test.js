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


// setupTestDatabase();
setupRedis();


describe('POST /auth/logout', () => {

	jest.setTimeout(50000);

	describe('Request Validation Errors', () => {

		test('should return 422 Validation Error if refresh token is not in the request body', async () => {
			
		});
	});


	describe('Failed Logouts', () => {

		test('should return 500 if redis cache server is down during logout', async () => {

		});
	});


	describe('Success logout', () => {

		test('should return 204, remove refresh token family from db and revoke access tokens', async () => {

		});
	});
})