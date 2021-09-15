const Utils = require('../../src/utils/Utils');

const querystrings = [
	{ input: { isEmailVerified: "true", isDisabled: "false" }, 	output: { isEmailVerified: true, isDisabled: false } },
	{ input: { isEmailVerified: "True", isDisabled: "False" }, 	output: { isEmailVerified: true, isDisabled: false } },
	{ input: { isEmailVerified: true, isDisabled: false }, 		output: { isEmailVerified: true, isDisabled: false } },
	{ input: { isEmailVerified: "truex", isDisabled: "false" }, output: { isDisabled: false } },
	{ input: { isEmailVerified: "True", isDisabled: "false" }, 	output: { isEmailVerified: true, isDisabled: false } },
	{ input: { isEmailVerified: "Truex", isDisabled: "falsex" },output: {} }
]

describe('Utils pickSort function', () => {
  it('picks the sort key from the request query', () => {
	  for (const query of querystrings) {
		  const received = query.input;
		  const expected = query.output;
		  expect(Utils.parseBooleans(received, ['isEmailVerified', 'isDisabled'])).toEqual(expected);
	  }
  });
});