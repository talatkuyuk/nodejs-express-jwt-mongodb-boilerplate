const httpStatus = require('http-status');
const bcrypt = require('bcryptjs');

const ApiError = require('../utils/ApiError');

const mongodb = require('../core/mongodb');
const ObjectId = require('mongodb').ObjectId;

const { AuthUser } = require('../models');

/////////////////////////  UTILS  ///////////////////////////////////////


/**
 * Check if the email is already taken
 * @param {String} email
 * @returns {Promise<Boolean>}
 */
const isEmailTaken = async function (email) {
	var db = mongodb.getDatabase();
	const authuser = await db.collection("authusers").findOne({ email });
	return !!authuser;
};


/**
 * Check if the authuser exists
 * @param {String} id
 * @returns {Promise<Boolean>}
 */
 const isValidAuthUser = async function (id) {
	var db = mongodb.getDatabase();
	const authuser = await db.collection("authusers").findOne({ _id: ObjectId(id) });
	return !!authuser;
};


/**
 * Check if the email and the id matches
 * @param {String} id
 * @param {String} email
 * @returns {Promise<Boolean>}
 */
const isPair_EmailAndId = async function (id, email) {
	var db = mongodb.getDatabase();
	const authuser = await db.collection("authusers").findOne({_id: ObjectId(id), email });
	return !!authuser;
};


/////////////////////////////////////////////////////////////////////



/**
 * Create a authuser
 * @param {string} email
 * @param {string} password
 * @returns {Promise<AuthUser>}
 */
const createAuthUser = async (email, password) => {
	try {
		if (await isEmailTaken(email)) {
			throw new ApiError(httpStatus.BAD_REQUEST, 'Email is already taken.');
		}
		
		const hashedPassword = await bcrypt.hash(password, 8);
		const authuser = new AuthUser(email, hashedPassword);

		const db = mongodb.getDatabase();
		const result = await db.collection("authusers").insertOne(authuser);
		
		authuser.transformId(result.insertedId);

		console.log(`${result.insertedCount} record is created in authusers.`)
		
		return authuser;

	} catch (error) {
		throw error;
	}
};




/**
 * Get authuser
 * @param {Object} query {id | email}
 * @returns {Promise<User>}
 */
const getAuthUser = async (query) => {
	try {
		const db = mongodb.getDatabase();
		query.id && (query = {_id: ObjectId(query.id)});
		const doc = await db.collection("authusers").findOne(query);

		return AuthUser.fromDoc(doc);
		
	} catch (error) {
		throw error
	}
};




/**
 * Query for authusers
 * @param {Object} filter - Mongo filter for authusers
 * @param {Object} sort - Sort option in the format: { field1: 1, field2: -1}
 * @param {number} limit - Maximum number of results per page (default = 20)
 * @param {number} page - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
 const getAuthUsers = async (filter, sort, skip, limit) => {
	try {
		const db = mongodb.getDatabase();
	
		const pipeline = [
			{
			   $match: filter
			},
			{
				$project:{
					email: 1,
					isEmailVerified: 1,
					disabled: 1,
					createdAt: 1,
				}
			},
			{
			   $sort: sort
			},
			{
			   $facet:{
				   users: [{ $skip: skip }, { $limit: limit}],
				   totalCount: [
					   {
						   $count: 'count'
					   }
				   ]
				 }
			}
		]
	
	   return await db.collection("authusers").aggregate(pipeline).toArray();
		
	} catch (error) {
		throw error;
	}
};




/**
 * Update authuser by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<AuthUser>}
 */
const updateAuthUser = async (id, updateBody) => {
	try {
		console.log(updateBody);
	  
		const db = mongodb.getDatabase();
	  
		const result = await db.collection("authusers").findOneAndUpdate(
		  { _id: ObjectId(id) },
		  { $set: {...updateBody, updatedAt: Date.now()} },
		  { returnOriginal: false }
		);
	  
		console.log(`${result.ok} record is updated in users`);
	  
		return AuthUser.fromDoc(result.value);
		
	} catch (error) {
		throw error
	}
  
};




/**
 * Delete authuser by id
 * @param {ObjectId} id
 * @returns {Promise<AuthUser?>}
 */
const deleteAuthUser = async (id) => {
	try {
		const db = mongodb.getDatabase();
		const result = await db.collection("authusers").findOneAndDelete({_id: ObjectId(id)});

		if (result.ok === 1) {
			console.log(`The authuser ${id} is deleted in authusers`);
			
			const authuser = AuthUser.fromDoc(result.value);

			await toDeletedAuthUsers(authuser);

			return authuser;

		} else {
			console.log(`The authuser is not deleted.`);

			return null;
		}
		
	} catch (error) {
		throw error;
	}
};




/**
 * Add the deleted authuser to the deletedauthusers
 * @param {AuthUser} deletedAuthUser
 * @returns {Promise}
 */
 const toDeletedAuthUsers = async (deletedAuthUser) => {
	try {
		const db = mongodb.getDatabase();

		deletedAuthUser["_id"] = deletedAuthUser.id;
		delete deletedAuthUser.id;
		deletedAuthUser["deletedAt"] = Date.now();

		const result = await db.collection("deletedauthusers").insertOne(deletedAuthUser);
		console.log(`${result.insertedCount} record is created in deletedauthusers.`)
		
	} catch (error) {
		throw error;
	}
};




/**
 * Enable & Disable AuthUser
 * @param {string} id
 * @returns {Promise}
 */
 const toggleAbility = async (id) => {
	try {
		const authuser = await getAuthUser({id});
		if (!authuser) throw new Error("User not found");

		await updateAuthUser(id, {disabled: !authuser.disabled});
  
	} catch (error) {
	  throw new ApiError(httpStatus.UNAUTHORIZED, `${error.message}. Enabling/disabling authuser failed.` );
	}
};




/**
 * Change password
 * @param {AuthUser} authuser
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Promise}
 */
 const changePassword = async (authuser, currentPassword, newPassword) => {
	try {
		console.log(newPassword+"")
		console.log(await bcrypt.hash(currentPassword, 8));
		console.log(authuser.password);
		console.log(await bcrypt.compare(currentPassword, authuser.password))

		if (!(await authuser.isPasswordMatch(currentPassword))) {
			throw new ApiError(httpStatus.BAD_REQUEST, 'Incorrect current password');
		}

		const password = await bcrypt.hash(newPassword, 8);
    	await updateAuthUser(authuser.id, { password });

	} catch (error) {
		throw error;
	}
}




/**
 * Get AuthUser by email
 * @param {string} email
 * @returns {Promise<AuthUser?>}
 */
 const getAuthUserByEmail = async (email) => {
	try {
		const authuser = await getAuthUser({email});
		
		if (!authuser) {
			throw new ApiError(httpStatus.NOT_FOUND, 'No authuser found with this email');
			// or fake message for security, forgotPassword
			throw new ApiError(httpStatus.OK, 'An email has been sent for reseting password.');
		}

		return authuser;
  
	} catch (error) {
	  throw error;
	}
};




/**
 * Get AuthUser by id
 * @param {string} id
 * @returns {Promise<AuthUser?>}
 */
 const getAuthUserById = async (id) => {
	try {
		const authuser = await getAuthUser({id});
		
		if (!authuser) {
			throw new ApiError(httpStatus.NOT_FOUND, 'No authuser found with this id');
		}

		return authuser;
  
	} catch (error) {
	  throw error;
	}
};



module.exports = {
	createAuthUser,
	getAuthUser,
	getAuthUsers,
	updateAuthUser,
	deleteAuthUser,

	toggleAbility,
	changePassword,
	getAuthUserById,
	getAuthUserByEmail,
};

module.exports.utils = {
	isEmailTaken,
	isValidAuthUser,
	isPair_EmailAndId
}
