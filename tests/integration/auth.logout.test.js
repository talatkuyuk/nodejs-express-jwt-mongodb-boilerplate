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

const { setupTestDatabase } = require('../setup/setupTestDatabase');
const { setupRedis } = require('../setup/setupRedis');


// setupTestDatabase();
setupRedis();


describe('POST /auth/logout', () => {

	jest.setTimeout(50000);

	describe('Request Validation Errors', () => {

		test('should return 422 Validation Error if refresh token is not in the request body', async () => {
			
		});
	});


	describe('Failed Logouts', () => {

		test('should return 401 if the user use own access token but use the refresh token that is not own', async () => {

		});

	});


	describe('Success logout', () => {

		test('should return 204 even if refresh token is expired', async () => {

		});


		test('should return 204 even if refresh token is blacklisted', async () => {

		});
		

		test('should return 204 even if redis cache server is down during logout, since Redis supports offline operations', async () => {

		});


		test('should return 204, remove refresh token family from db and revoke access tokens', async () => {

		});
	});
})