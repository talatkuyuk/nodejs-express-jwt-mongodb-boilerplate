

## express.json vs bodyParser.json && express.urlencoded vs bodyParser.urlencoded
https://stackoverflow.com/questions/47232187/express-json-vs-bodyparser-json

bodyParser is already added to Express. No need to import bodyParser.

## express.urlencoded(options) difference between qs and querystring
https://stackoverflow.com/questions/29136374/what-the-difference-between-qs-and-querystring

*The extended option* allows to choose between parsing the URL-encoded data 
+ with the querystring library (when false) 
+ with the qs library (when true).

They are not different in terms of purpose.

The *querystring* library:  provides utilities for parsing and formatting URL query strings.

The *qs* library: A querystring parsing and stringifying library with some added security. Compared to querystring, it is able of parsing nested objects. Say, qs is an advanced solution.