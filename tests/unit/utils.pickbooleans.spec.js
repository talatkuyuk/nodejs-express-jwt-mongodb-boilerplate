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

const sanitize = (object) =>
  Object.assign(
    ...Object.entries(object).map(([k, v]) => ({
      [k]: typeof v === "string" ? v.trim().toLowerCase() : v,
    }))
  );

describe("Utils pickBooleans function", () => {
  it("picks the booleans from the request query", () => {
    for (const query of querystrings) {
      const received = sanitize(query.input); // like express-validator does
      const expected = query.output;

      expect(
        Utils.pickBooleans(received, ["isEmailVerified", "isDisabled"])
      ).toEqual(expected);
    }
  });
});
