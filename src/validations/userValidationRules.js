const { body, param } = require('express-validator');
const {authuserService, userService} = require('../services');
const { roles } = require('../config/roles');


const iso_3166_alpha_3 = `/^A(BW|FG|GO|IA|L[AB]|ND|R[EGM]|SM|T[AFG]|U[ST]|ZE)|B(DI|E[LNS]|FA|G[DR]|H[RS]|IH|L[MRZ]|MU|OL|R[ABN]|TN|VT|WA)|C(A[FN]|CK|H[ELN]|IV|MR|O[DGKLM]|PV|RI|U[BW]|XR|Y[MP]|ZE)|D(EU|JI|MA|NK|OM|ZA)|E(CU|GY|RI|S[HPT]|TH)|F(IN|JI|LK|R[AO]|SM)|G(AB|BR|EO|GY|HA|I[BN]|LP|MB|N[BQ]|R[CDL]|TM|U[FMY])|H(KG|MD|ND|RV|TI|UN)|I(DN|MN|ND|OT|R[LNQ]|S[LR]|TA)|J(AM|EY|OR|PN)|K(AZ|EN|GZ|HM|IR|NA|OR|WT)|L(AO|B[NRY]|CA|IE|KA|SO|TU|UX|VA)|M(A[CFR]|CO|D[AGV]|EX|HL|KD|L[IT]|MR|N[EGP]|OZ|RT|SR|TQ|US|WI|Y[ST])|N(AM|CL|ER|FK|GA|I[CU]|LD|OR|PL|RU|ZL)|OMN|P(A[KN]|CN|ER|HL|LW|NG|OL|R[IKTY]|SE|YF)|QAT|R(EU|OU|US|WA)|S(AU|DN|EN|G[PS]|HN|JM|L[BEV]|MR|OM|PM|RB|SD|TP|UR|V[KN]|W[EZ]|XM|Y[CR])|T(C[AD]|GO|HA|JK|K[LM]|LS|ON|TO|U[NRV]|WN|ZA)|U(GA|KR|MI|RY|SA|ZB)|V(AT|CT|EN|GB|IR|NM|UT)|W(LF|SM)|YEM|Z(AF|MB|WE)$/`;

const check_param_id = [
	param("id")
		.isLength({ min: 24, max: 24}).withMessage('param id is wrong')
		.bail()
		.custom(async (value) => {
			try {
				if (await userService.isValidUser(value)) 
					return true; // indicates validation is success: the id is valid
				throw new Error('param id does not refer any user. (User not found)');
				
			} catch (error) {
				throw error;
			}
	}),
];

const check_body_name = [
	body('name')
		.trim()
		.escape()
		.isLength({ min: 2 })
		.withMessage('name must be minimum 2 characters')
];

const check_body_gender = [
	body('gender')
		.trim()
		.toLowerCase()
		.isIn(["male", "female", "none"])
		.withMessage('gender could be male, female or none')
];

const check_body_country = [
	body('country')
		.trim()
		.toUpperCase()
		.matches(iso_3166_alpha_3).withMessage("country code must be in the form of iso_3166_alpha_3")
		.isLength({ max: 3 }).withMessage("country code can't exceed 3 characters")
		.isLength({ min: 3 }).withMessage("country code can't less than 3 characters")
];

////////////////////////////////////////////////////////////////////////


const getUsers = [
	param("country").toUpperCase(),
	param("page").default(1),
	param("size").default(20),
];



const getUser = [
	...check_param_id,
];



const addUser = [

	// check there is an authenticated user with that id, and there is no user with the same id.
	body("id")
		.exists({checkFalsy: true}).withMessage('id must not be empty or falsy value')
		.bail()
		.isLength({ min: 24, max: 24}).withMessage('id is wrong')
		.bail()
		.custom(async (value) => {
			try {
				if (!await authuserService.isValidUser(value)) 
					throw new Error('Id does not match with any authenticated user');

				if (await userService.isValidUser(value)) 
					throw new Error('There is another user with the same id.');

				return true;
				
			} catch (error) {
				throw error;
			}
	}),

	// check e-mail is valid and is matched with the id in authenticated users
	body('email')
		.trim()
		.exists({checkFalsy: true}).withMessage('email must not be empty or falsy value')
		.bail()
		.isEmail().withMessage('email must be in valid form')
		.toLowerCase()
		.custom(async (value, { req }) => {
			try {
				if (!await authuserService.isPair_EmailAndId(req.body.id, value))
					throw new Error('Email does not match with the auth id.');
				
				return true; // Indicates the success

			} catch (error) {
				throw error;
			}
		}),

	body('role')
		.trim()
		.toLowerCase()
		.equals('user')
		.withMessage("The role must be setted as 'user' while creating."),

	check_body_name[0].optional(),
	check_body_gender[0].optional(),
	check_body_country[0].optional(),

	body().custom( (body, { req }) => {
		const validKeys = ['id', 'email', 'role', 'name', 'gender', 'country'];
		return Object.keys(req.body).every(key => validKeys.includes(key));
	}).withMessage(`Any extra parameter is not allowed other than ${['id', 'email', 'role', 'name', 'gender', 'country']}`),

];



const updateUser = [
	...check_param_id,
	...check_body_name,
	...check_body_gender,
	...check_body_country,

	body().custom( (body, { req }) => {
		const validKeys = ['name', 'gender', 'country'];
		return Object.keys(req.body).every(key => validKeys.includes(key));
	}).withMessage(`Any extra parameter is not allowed other than ${['name', 'gender', 'country']}`),
];



const deleteUser = [
	...check_param_id,
];



const changeRole = [
	...check_param_id,
	body('role', `role could be one of ${roles}`).trim().isIn(roles),
	body().custom( (body, { req }) => {
		const validKey = 'role';
		return Object.keys(req.body).every(key => validKey === key);
	}).withMessage(`Any extra parameter is not allowed other than 'role'`),
];



module.exports = {
	getUsers,
	getUser,
	addUser,
	updateUser,
	deleteUser,
	changeRole
};