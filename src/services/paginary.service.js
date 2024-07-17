const Utils = require("../utils/Utils");
const { traceError } = require("../utils/errorUtils");

/**
 * @typedef {Object} FieldFilters
 * @property {string[]} [stringFields]
 * @property {string[]} [booleanFields]
 * @property {string[]} [numberFields]
 *
 * @param {Record<string, unknown>} query
 * @param {FieldFilters} filterFields
 * @returns {Object}
 */
const composeFilter = (query, filterFields) => {
  try {
    let stringFilters = {},
      booleanFilters = {},
      numberFilters = {};

    if (filterFields.stringFields) {
      stringFilters = Utils.pickStrings(query, filterFields.stringFields);
    }

    if (filterFields.booleanFields) {
      booleanFilters = Utils.pickBooleans(query, filterFields.booleanFields);
    }

    if (filterFields.numberFields) {
      numberFilters = Utils.pickNumbers(query, filterFields.numberFields);
    }

    return { ...stringFilters, ...booleanFilters, ...numberFilters };
  } catch (error) {
    throw traceError(error, "Utils : composeFilter");
  }
};

/**
 *
 * @param {string} sortingString
 * @param {string[]} sortingFields
 * @returns {Object}
 */
const composeSort = (sortingString, sortingFields) => {
  try {
    return Utils.pickSort(sortingString, sortingFields);
  } catch (error) {
    throw traceError(error, "Utils : composeSort");
  }
};

/**
 * @typedef {Object} PaginationFactors
 * @property {number} page
 * @property {number} skip
 * @property {number} limit
 *
 * @param {string} pageString
 * @param {string} sizeString
 * @returns
 */
const composePaginationFactors = (pageString, sizeString) => {
  const DEFAULT_PAGE_SIZE = 20;
  const DEFAULT_PAGE = 1;

  const page = parseInt(pageString) || DEFAULT_PAGE;
  const limit = parseInt(sizeString) || DEFAULT_PAGE_SIZE;
  const skip = (page - 1) * limit;

  return { page, skip, limit };
};

/**
 * @typedef {Object} Pagination
 * @property {number} pageIndex
 * @property {number} pageNumber
 * @property {number} pageCount
 * @property {number} pageSize
 *
 * @param {number} totalCount
 * @param {number} page
 * @param {number} limit
 * @returns {Pagination}
 */
const composePagination = (totalCount, page, limit) => {
  return {
    pageIndex: page - 1,
    pageNumber: page,
    pageCount: Math.ceil(totalCount / limit),
    pageSize: limit,
  };
};

module.exports = {
  composeFilter,
  composeSort,
  composePaginationFactors,
  composePagination,
};
