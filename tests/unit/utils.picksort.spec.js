const querystring = require('querystring');

const Utils = require('../../src/utils/Utils');

// what does querystring do:
// input:  size=3&page=2&size=4&sort=email.desc&sort=id.asc&sort=isDisabled
// result: { size: [ '3', '4' ], page: '2', sort: [ 'email.desc', 'id.asc', 'isDisabled' ] }

const querystrings = [
	{ input: "size=3&page=2&email=xxx@xxx.com&sort=email.desc", output: { email: -1, createdAt: -1 } },
	{ input: "size=3&page=2&email=xxx@xxx.com&sort=isEmailVerified", output: { isEmailVerified: 1, createdAt: -1 } },
	{ input: "", output: { createdAt: -1 } },
	{ input: "size=3&page=2&email=xxx@xxx.com&sort=id.asc", output: { id: 1, createdAt: -1 } },
	{ input: "size=3&page=2&email=xxx@xxx.com&sortx=page", output: { createdAt: -1 } },
	{ input: "size=3&page=2&email=xxx@xxx.com", output: { createdAt: -1 } },
	{ input: "size=3&sort=pagex.desc", output: { pagex: -1, createdAt: -1 } },
	{ input: "sort=page", output: { page: 1, createdAt: -1 } },
	{ input: "size=3&page=2&size=4&sort=email.desc&sort=id.asc&sort=isDisabled", output: { email: -1, id: 1, isDisabled: 1, createdAt: -1 } }
]

describe('Utils pickSort function', () => {
  it('picks the sort key from the request query', () => {
	  for (const query of querystrings) {
		  const { sort: querySort } = querystring.parse(query.input);
		  const expected = query.output;
		  expect(Utils.pickSort(querySort)).toEqual(expected);
	  }
  });
});