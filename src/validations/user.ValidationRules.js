const validator = require("validator");
const { body, param, query, check, oneOf } = require("express-validator");

const { authuserService, userService } = require("../services");
const { roles } = require("../config/roles");

const {
  check_param_id,
  check_param_id_custom,
  check_body_email,
} = require("./common.ValidationRules");

const iso_3166_alpha_3 =
  /ABW|AFG|AGO|AIA|ALA|ALB|AND|ARE|ARG|ARM|ASM|ATA|ATF|ATG|AUS|AUT|AZE|BDI|BEL|BEN|BES|BFABGD|BGR|BHR|BHS|BIH|BLM|BLR|BLZ|BMU|BOL|BRA|BRB|BRN|BTN|BVT|BWA|CAF|CAN|CCK|CHE|CHL|CHN|CIV|CMR|COD|COG|COK|COL|COM|CPV|CRI|CUB|CUW|CXR|CYM|CYP|CZE|DEU|DJI|DMA|DNK|DOM|DZA|ECU|EGY|ERI|ESH|ESP|EST|ETH|FIN|FJI|FLK|FRA|FRO|FSM|GAB|GBR|GEO|GGY|GHA|GIB|GIN|GLP|GMB|GNB|GNQ|GRC|GRD|GRL|GTM|GUF|GUM|GUY|HKG|HMD|HND|HRV|HTI|HUN|IDN|IMN|IND|IOT|IRL|IRN|IRQ|ISL|ISR|ITA|JAM|JEY|JOR|JPN|KAZ|KEN|KGZ|KHM|KIR|KNA|KOR|KWT|LAO|LBN|LBR|LBY|LCA|LIE|LKA|LSO|LTU|LUX|LVA|MAC|MAF|MAR|MCO|MDA|MDG|MDV|MEX|MHL|MKD|MLI|MLT|MMR|MNE|MNG|MNP|MOZ|MRT|MSR|MTQ|MUS|MWI|MYS|MYT|NAM|NCL|NER|NFK|NGA|NIC|NIU|NLD|NOR|NPL|NRU|NZL|OMN|PAK|PAN|PCN|PER|PHL|PLW|PNG|POL|PRI|PRK|PRT|PRY|PSE|PYF|QAT|REU|ROU|RUS|RWA|SAU|SDN|SEN|SGP|SGS|SHN|SJM|SLB|SLE|SLV|SMR|SOM|SPM|SRB|SSD|STP|SUR|SVK|SVN|SWE|SWZ|SXM|SYC|SYR|TCA|TCD|TGO|THA|TJK|TKL|TKM|TLS|TON|TTO|TUN|TUR|TUV|TWN|TZA|UGA|UKR|UMI|URY|USA|UZB|VAT|VCT|VEN|VGB|VIR|VNM|VUT|WLF|WSM|YEM|ZAF|ZMB|ZWE/;

const check_body_name = () =>
  body("name")
    .trim()
    .escape()
    .isLength({ min: 2 })
    .withMessage("requires minimum 2 characters");

const check_body_gender = () =>
  body("gender")
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage("must not be empty")
    .bail()
    .isIn(["male", "female", "none"])
    .withMessage("should be male, female or none");

const check_body_country = () =>
  body("country")
    .trim()
    .toUpperCase()
    .notEmpty()
    .withMessage("must not be empty")
    .bail()
    .matches(iso_3166_alpha_3)
    .withMessage("must be 3-letter standart country code");

////////////////////////////////////////////////////////////////////////

const once = (value) => {
  if (typeof value === "object")
    throw new Error("The parameter can only appear once in the query string");
  return true;
};

const only = (body) => {
  const validKeys = [
    "page",
    "size",
    "sort",
    "email",
    "role",
    "name",
    "gender",
    "country",
  ];
  if (Object.keys(body).every((key) => validKeys.includes(key))) return true;
  else throw new Error("Any extra parameter is not allowed");
};

const getUsers = [
  body().custom(only),

  query("email").custom(once).trim().toLowerCase().optional(),

  query("name")
    .custom(once)
    .trim()
    .isLength({ min: 1 })
    .withMessage("The query param 'name' must be minumum 1-length charachter")
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
    .isLength({ min: 3, max: 3 })
    .withMessage(
      "The query param 'country' code must be in the form of 3-letter standart country code"
    )
    .bail()
    .matches(iso_3166_alpha_3)
    .withMessage(
      "The query param 'country' code must be in the form of 3-letter standart country code"
    )
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
    .withMessage(
      "The query param 'sort' can contains a-zA-Z letters . dot and | pipedelimeter"
    )
    .optional(),
];

const getUser = [...check_param_id_custom];

const addUser = [
  // check the id is valid and check if there is another user with the same id.
  param("id")
    .isLength({ min: 24, max: 24 })
    .withMessage("The param id must be a 24-character number")
    .bail()
    .custom(async (value) => {
      if (await userService.isExist(value))
        throw new Error("There is another user with the same id");

      return true;
    }),

  ...check_body_email,

  body("role").trim().toLowerCase().equals("user").withMessage("must be user"),

  check_body_name().optional(),
  check_body_gender().optional(),
  check_body_country().optional(),

  // check if there is no an authenticated user with the email and the id
  body()
    .custom(async (body, { req }) => {
      const id = req.params.id;
      const email = req.body.email;

      // I needed to validate id and email again here, since the chains above are isolatated in express-validator
      if (
        id &&
        email &&
        validator.isEmail(email?.trim()?.toLowerCase()) &&
        validator.isLength(id, { min: 24, max: 24 })
      ) {
        if (!(await authuserService.isExist(id, email)))
          throw new Error(
            "There is no correspondent authenticated user with the same id and email"
          );
      }

      return true;
    })
    .custom((body, { req }) => {
      const validKeys = ["email", "role", "name", "gender", "country"];
      return Object.keys(req.body).every((key) => validKeys.includes(key));
    })
    .withMessage("Any extra parameter is not allowed"),
];

const updateUser = [
  ...check_param_id,

  check_body_name().optional(),
  check_body_gender().optional(),
  check_body_country().optional(),

  oneOf(
    [
      check("name").exists(),
      check("gender").exists(),
      check("country").exists(),
    ],
    "The request body should contain at least one of the name, gender, country"
  ),

  body()
    .custom((body, { req }) => {
      const validKeys = ["name", "gender", "country"];
      return Object.keys(req.body).every((key) => validKeys.includes(key));
    })
    .withMessage("Any extra parameter is not allowed"),
];

const deleteUser = [...check_param_id];

const changeRole = [
  ...check_param_id,

  body("role")
    .trim()
    .toLowerCase()
    .isIn(roles)
    .withMessage(`role could be one of ${roles}`),

  body()
    .custom((body) => {
      const validKey = "role";
      return Object.keys(body).every((key) => validKey === key);
    })
    .withMessage("Any extra parameter is not allowed"),
];

module.exports = {
  getUsers,
  getUser,
  addUser,
  updateUser,
  deleteUser,
  changeRole,
};
