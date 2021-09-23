const {serializeError} = require('serialize-error');

class TestUtil {
	static MatchErrors = () => expect.extend({
		toBeMatchedWithError(received, expected) {
			// Error objects are weird, so need to use serialize-error package.
			const { name: rName, message: rMessage, statusCode: rCode } = serializeError(received);
			const { name: eName, message: eMessage, statusCode: eCode } = serializeError(expected);

			const check = (r, e) => r === e || console.log(`Expected: ${e}\nReceived: ${r}`);

			const passName = check(rName, eName);
			const passMessage = check(rMessage, eMessage);
			const passCode = check(rCode, eCode);
			
			return { pass: passName && passMessage && passCode };
		},
	});
}

module.exports =  TestUtil;