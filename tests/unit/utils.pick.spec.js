const querystring = require("querystring");

const Utils = require("../../src/utils/Utils");

const querystrings = ["size=3&page=2&email=xxx@xxx.com", "size=3&page=2", ""];

describe("Utils pick function", () => {
  it("picks the keys from request query", () => {
    expect(Utils.pickStrings(querystring.parse(querystrings[0]), ["email"])).toEqual({
      email: "xxx@xxx.com",
    });

    expect(Utils.pickStrings(querystring.parse(querystrings[0]), ["email", "size"])).toEqual({
      email: "xxx@xxx.com",
      size: "3",
    });

    expect(Utils.pickStrings(querystring.parse(querystrings[0]), ["email", "sizex"])).toEqual({
      email: "xxx@xxx.com",
    });

    expect(Utils.pickStrings(querystring.parse(querystrings[0]), ["emailx"])).toEqual({});

    expect(Utils.pickStrings(querystring.parse(querystrings[1]), ["email"])).toEqual({});

    expect(Utils.pickStrings(querystring.parse(querystrings[1]), ["page"])).toEqual({
      page: "2",
    });

    expect(Utils.pickStrings(querystring.parse(querystrings[1]), [])).toEqual({});

    expect(Utils.pickStrings({}, [])).toEqual({});
  });
});
