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
const setupRedis = require('../setup/setupRedis');


// setupTestDatabase();
setupRedis();


describe('Auth Middleware', () => {

	jest.setTimeout(50000);

	describe('Access Token Errors', () => {

		test('should return 400 if Authorization Header is bad formed without Bearer', async () => {

		});


		test('should return 400 if Authorization Header is bad formed mistyping Baerer', async () => {

		});


		test('should return 400 if Authorization Header is bad formed with no space between Bearer and Token', async () => {

		});


		test('should return 400 if access token is not in the Authorization Header', async () => {

		});


		test('should return 401 if access token is expired', async () => {
			
		});


		test('should return 401 if access token has wrong signature', async () => {
			
		});
	});



	describe('Failed Authorizations', () => {

		test('should return 401 if access token does not refer any user', async () => {

		});


		test('should return 401 if access token refers any other user', async () => {

		});


		test('should return 403 if the user is disabled', async () => {

		});


		test('should return 403 if the user has changed or updated his/her user agent', async () => {

		});


		test('should return 403 if access token is in the blcaklist', async () => {

		});


		test('should return 500 if redis cache server is down while checking it is in the blacklist', async () => {

		});
	});


	describe('Success Authorization', () => {
		
		test('should continue next middleware with user is attached to the request', async () => {

		});
	});
})