const { locateError } = require('./ApiError');
const Utils = require('./Utils');


const composeSort = (query, sortingFields) => {
	try {
		return Utils.pickSort(query.sort, sortingFields);

	} catch (error) {
		throw locateError(error, "Utils : composeSort");
	}
}


module.exports = composeSort;