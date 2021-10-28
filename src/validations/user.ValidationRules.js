const validator = require('validator');
const { body, param, query, check, oneOf } = require('express-validator');

const { authuserService, userService } = require('../services');
const { roles } = require('../config/roles');

const {
	check_param_id,
	check_body_email,
} = require('./common.ValidationRules');


const iso_3166_alpha_3 = `/^A(BW|FG|GO|IA|L[AB]|ND|R[EGM]|SM|T[AFG]|U[ST]|ZE)|B(DI|E[LNS]|FA|G[DR]|H[RS]|IH|L[MRZ]|MU|OL|R[ABN]|TN|VT|WA)|C(A[FN]|CK|H[ELN]|IV|MR|O[DGKLM]|PV|RI|U[BW]|XR|Y[MP]|ZE)|D(EU|JI|MA|NK|OM|ZA)|E(CU|GY|RI|S[HPT]|TH)|F(IN|JI|LK|R[AO]|SM)|G(AB|BR|EO|GY|HA|I[BN]|LP|MB|N[BQ]|R[CDL]|TM|U[FMY])|H(KG|MD|ND|RV|TI|UN)|I(DN|MN|ND|OT|R[LNQ]|S[LR]|TA)|J(AM|EY|OR|PN)|K(AZ|EN|GZ|HM|IR|NA|OR|WT)|L(AO|B[NRY]|CA|IE|KA|SO|TU|UX|VA)|M(A[CFR]|CO|D[AGV]|EX|HL|KD|L[IT]|MR|N[EGP]|OZ|RT|SR|TQ|US|WI|Y[ST])|N(AM|CL|ER|FK|GA|I[CU]|LD|OR|PL|RU|ZL)|OMN|P(A[KN]|CN|ER|HL|LW|NG|OL|R[IKTY]|SE|YF)|QAT|R(EU|OU|US|WA)|S(AU|DN|EN|G[PS]|HN|JM|L[BEV]|MR|OM|PM|RB|SD|TP|UR|V[KN]|W[EZ]|XM|Y[CR])|T(C[AD]|GO|HA|JK|K[LM]|LS|ON|TO|U[NRV]|WN|ZA)|U(GA|KR|MI|RY|SA|ZB)|V(AT|CT|EN|GB|IR|NM|UT)|W(LF|SM)|YEM|Z(AF|MB|WE)$/`;


const check_body_name = () =>
	body('name')
		.trim()
		.escape()
		.isLength({ min: 2 })
		.withMessage('name must be minimum 2 characters');

const check_body_gender = () =>
	body('gender')
		.trim()
		.toLowerCase()
		.isIn(["male", "female", "none"])
		.withMessage('gender could be male, female or none');

const check_body_country = () =>
	body('country')
		.trim()
		.toUpperCase()
		.matches(iso_3166_alpha_3)
		.withMessage("country code must be 3-letter standart iso code");

////////////////////////////////////////////////////////////////////////

const once = (value) => {
	if (typeof(value) === "object")
		throw new Error("The parameter can only appear once in the query string")
	return true;
}

const getUsers = [
	query("email")
		.custom(once)
		.trim()
		.toLowerCase()
		.isEmail()
		.withMessage("The query param 'email' must be in valid form")
		.optional(),
	
	query("name")
		.custom(once)
		.trim()
		.toLowerCase()
		.isLength({min: 2})
		.withMessage("The query param 'name' must be minumum 2-length charachter")
		.optional(),
	
	query("gender")
		.custom(once)
		.trim()
		.toLowerCase()
		.isIn(["male", "female", "none"])
		.withMessage("The query param 'gender' could be only male, female or none")
		.optional(),

	query("country")
		.custom(once)
		.trim()
		.toUpperCase()
		.matches(iso_3166_alpha_3)
		.withMessage("The query param 'country' code must be in the form of 3-letter standart country code")
		.optional(),
	
	query("role")
		.custom(once)
		.trim()
		.toLowerCase()
		.isIn(roles)
		.withMessage(`The query param 'role' could be one of ${roles}`)
		.optional(),

	query("page")
		.custom(once)
		.trim()
		.isNumeric()
		.withMessage("The query param 'page' must be numeric value")
		.optional(),
	
	query("size")
		.custom(once)
		.trim()
		.isNumeric()
		.withMessage("The query param 'size' must be numeric value")
		.bail()
		.isInt({ min: 1, max: 50 })
		.withMessage("The query param 'size' can be between 1-50")
		.optional(),
	
	query("sort")
		.custom(once)
		.trim()
		.matches(/^[a-zA-Z/./|\s]+$/i)
		.withMessage("The query param 'sort' can contains a-zA-Z letters . dot and | pipedelimeter")
		.optional(),
];



const getUser = [
	...check_param_id,
];



const addUser = [

	// check the id is valid and check if there is another user with the same id.
	param("id")
		.isLength({ min: 24, max: 24 })
		.withMessage('The param id must be a 24-character number')
		.bail()
		.custom(async (value) => {
			if (await userService.isExist(value)) 
				throw new Error('There is another user with the same id');

			return true;
		}),

	...check_body_email,

	body('role')
		.trim()
		.toLowerCase()
		.equals('user')
		.withMessage("The role must be setted as 'user' while creating")
		.bail(),

	check_body_name().optional(),
	check_body_gender().optional(),
	check_body_country().optional(),

	// check e-mail is matched with the id in authenticated users
	body()
		.custom(async (body, { req }) => {
			const id = req.params.id;
			const email = req.body.email;

			// I needed to validate id and email again here, since the chains above are isolatated in express-validator
			if ( id && email && validator.isEmail(email?.trim()?.toLowerCase()) && validator.isLength(id, {min: 24, max: 24})) {
				if (!await authuserService.isExist(id, email))
					throw new Error('There is no correspondent authenticated user with the same id and email');
			}
				
			return true;
		})
		.custom((body, { req }) => {
			const validKeys = ['email', 'role', 'name', 'gender', 'country'];
			return Object.keys(req.body).every(key => validKeys.includes(key));
		})
		.withMessage(`Any extra parameter is not allowed other than ${['email', 'role', 'name', 'gender', 'country']}`),

];



const updateUser = [
	...check_param_id,

	check_body_name().optional(),
	check_body_gender().optional(),
	check_body_country().optional(),

	oneOf([
		check('name').exists(),
		check('gender').exists(),
		check('country').exists()
	], 'The request body should contain at least one of the name, gender, country'),
	
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

	body("role")
		.trim()
		.toLowerCase()
		.isIn(roles)
		.withMessage(`role could be one of ${roles}`),

	// TODO: extract req, you can use only body, test it
	body().custom((body, { req }) => {
		const validKey = "role";
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