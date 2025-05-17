const { initSerializeError } = require("./tests/testutils/serializeErrorProvider");
const toBeMatchedWithError = require("./tests/testutils/toBeMatchedWithError");

// serialize-error (ESM-only) will be available for all tests
beforeAll(async () => {
  await initSerializeError();
});

// the Custom Matcher will be available for all tests
expect.extend({
  toBeMatchedWithError,
});
