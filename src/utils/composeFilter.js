const { locateError } = require('./ApiError');
const Utils = require('./Utils');


const composeFilter = (query, fields) => {
	try {
		let stringFilters = {}, booleanFilters = {};

		if (fields.stringFields) {
			stringFilters = Utils.pick(query, fields.stringFields);
		}
		
		if (fields.booleanFields) {
			const booleans = Utils.pick(query, fields.booleanFields);
			booleanFilters = Utils.parseBooleans(booleans, fields.booleanFields);
		}

		return {...stringFilters, ...booleanFilters};

	} catch (error) {
		throw locateError(error, "Utils : composeFilter");
	}
}


module.exports = composeFilter;