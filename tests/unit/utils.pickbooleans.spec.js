const Utils = require("../../src/utils/Utils");

const querystrings = [
  {
    input: { isEmailVerified: "true", isDisabled: "false" },
    output: { isEmailVerified: true, isDisabled: false },
  },
  {
    input: { isEmailVerified: "True", isDisabled: "False" },
    output: { isEmailVerified: true, isDisabled: false },
  },
  {
    input: { isEmailVerified: true, isDisabled: false },
    output: { isEmailVerified: true, isDisabled: false },
  },
  {
    input: { isEmailVerified: "truex", isDisabled: "false" },
    output: { isDisabled: false },
  },
  {
    input: { isEmailVerified: "   TrUe   ", isDisabled: "  falSe  " },
    output: { isEmailVerified: true, isDisabled: false },
  },
  { input: { isEmailVerified: "Truex", isDisabled: "falsex" }, output: {} },
];

/**
 * simple sanitize function for string values in an object
 * @template {Record<string, unknown>} T
 * @param {T} object - The object to sanitize.
 * @returns {T} - The sanitized object.
 */
const sanitize = (object) => {
  /** @type {T} */
  const init = /** @type {T} */ ({});

  Object.entries(object).reduce((acc, [k, v]) => {
    // @ts-ignore
    acc[k] = typeof v === "string" ? v.trim().toLowerCase() : v;
    return acc;
  }, init);

  return init;
};

describe("Utils pickBooleans function", () => {
  it("picks the booleans from the request query", () => {
    for (const query of querystrings) {
      const received = sanitize(query.input); // like express-validator does
      const expected = query.output;

      expect(Utils.pickBooleans(received, ["isEmailVerified", "isDisabled"])).toEqual(expected);
    }
  });
});
