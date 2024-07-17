const toBeMatchedWithError = require("./tests/testutils/toBeMatchedWithError");

// the Custom Matcher will be available for all tests
expect.extend({
  toBeMatchedWithError,
});
