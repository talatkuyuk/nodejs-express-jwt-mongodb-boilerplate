const Utils = require('../utils/Utils');

const paginary = async (query, queryFields, booleanFields, dbQueryCallback) => {

	try {
		const DEFAULT_PAGE_SIZE = 20;
		const DEFAULT_PAGE = 1;
	
		const filterQueries = Utils.pick(query, queryFields);
		const filterBooleans = Utils.pick(query, booleanFields);
	
		const filterBooleansParsed = Utils.parseBooleans(filterBooleans, booleanFields);
	
		const filter = {...filterQueries, ...filterBooleansParsed};
	
		const page = parseInt(query.page) || DEFAULT_PAGE;
	
		const limit = parseInt(query.size) || DEFAULT_PAGE_SIZE;
		const skip = (page - 1) * limit;
	
		const sort = Utils.pickSort(query.sort);
	
		console.log({ filter, sort, skip, page, limit });
	
		// query from db //
		const result = await dbQueryCallback(filter, sort, skip, limit);
	
		let totalCount;
		if (result[0]["totalCount"].length > 0)
			totalCount = result[0]["totalCount"] = result[0]["totalCount"][0]["count"];
		else
			totalCount = result[0]["totalCount"] = 0;
	
		const totalPages = Math.ceil(totalCount / limit);
	
		result[0]["pagination"] = { perPage: limit, currentPage: page, totalPages};
	
		return result[0];
		
	} catch (error) {
		error.description || (error.description = "Paginary Service failed");
		throw error;
	}
}

module.exports = {
	paginary,
};