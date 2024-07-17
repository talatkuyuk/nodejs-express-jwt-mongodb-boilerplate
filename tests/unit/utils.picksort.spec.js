const querystring = require("querystring");

const Utils = require("../../src/utils/Utils");

// what does querystring do:
// input:  size=3&page=2&size=4&sort=email.desc&sort=id.asc&sort=isDisabled
// result: { size: [ '3', '4' ], page: '2', sort: [ 'email.desc', 'id.asc', 'isDisabled' ] }

const querystrings = [
  {
    input: "size=3&page=2&email=xxx@xxx.com&sort=email.desc",
    output: { email: -1, createdAt: -1 },
  },
  {
    input: "size=3&page=2&email=xxx@xxx.com&sort=isEmailVerified",
    output: { isEmailVerified: 1, createdAt: -1 },
  },
  { input: "", output: { createdAt: -1 } },
  {
    input: "size=3&page=2&email=xxx@xxx.com&sort=id.asc",
    output: { id: 1, createdAt: -1 },
  },
  {
    input: "size=3&page=2&email=xxx@xxx.com&sortx=page",
    output: { createdAt: -1 },
  },
  { input: "size=3&page=2&email=xxx@xxx.com", output: { createdAt: -1 } },
  { input: "size=3&sort=pagex.desc", output: { createdAt: -1 } },
  { input: "sort=page", output: { createdAt: -1 } },
  { input: "sort=  page  |   createdAt ", output: { createdAt: 1 } },
  {
    input: "size=3&page=2&size=4&sort=email.desc|id.asc|isDisabled",
    output: { email: -1, id: 1, isDisabled: 1, createdAt: -1 },
  },
];

describe("Utils pickSort function", () => {
  it("picks the sort key from the request query", () => {
    for (const query of querystrings) {
      console.log(query.input);
      const { sort: querySort } = querystring.parse(query.input);
      const expected = query.output;

      console.log({ querySort });

      if (typeof querySort === "undefined" || typeof querySort === "string") {
        expect(
          Utils.pickSort(querySort, [
            "id",
            "email",
            "isEmailVerified",
            "isDisabled",
            "createdAt",
          ]),
        ).toEqual(expected);
      } else {
        throw new Error("sort key is to be single in query string");
      }
    }
  });
});
