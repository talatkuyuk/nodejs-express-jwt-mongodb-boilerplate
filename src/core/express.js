var express      = require('express');
var path         = require('path');
let helmet 		 = require("helmet");
let crossdomain  = require("helmet-crossdomain");
let noCache 	 = require("nocache");
let cors         = require("cors");
const passport 	 = require('passport');
var xss 		 = require('xss-clean');
const useragent	 = require('express-useragent');
const mongoSanitize = require('express-mongo-sanitize');

const routes     = require('../routes');
const config     = require('../config');
const morgan     = require('./morgan');

const { jwtStrategy, googleStrategy, facebookStrategy } = require('./passport');
const { error, authLimiter } = require('../middlewares');

// *****************************************************************
function initViewEngine(app) {
	// View engine setup  (needs "views" directory )
	app.set('views', path.join(__dirname, '../views'));

	// choose one
	app.set('view engine', 'ejs'); // option-1 
	app.set('view engine', 'pug'); // option-2

	// Environment dependent middleware
	if (config.env === "development") {

		// Disable views cache
		app.set("view cache", false);
		app.use(noCache());

		// Jade options: Don't minify html, debug intrumentation
		app.locals.pretty = true;
		//app.locals.compileDebug = true;

	} else {
		app.locals.cache = "memory";
		app.set("view cache", true); // it is default in production
	}
}
// *******************************************************************

var app = express();

// log requests via morgan handler
if (config.env !== 'test') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

// set security HTTP headers
app.use(helmet());

// Sets X-Permitted-Cross-Domain-Policies: none
app.use(crossdomain())

// if need to server side rendering (optional)
initViewEngine(app)

// if need to sent any static file to client (needs "public" directory in "src" folder; it is optional)
app.use(express.static(path.join(__dirname, '..', 'public')));

// parse JSON bodies (application/json)
app.use(express.json());

// parse urlencoded bodies (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

// enable cors
var corsOptions = {
	origin: ['http://localhost:5500', 'https://localhost:5500'],
	optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
	methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
	credentials: true // allow session cookie from browser to pass through
}
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.set('strict routing', true);


// get the device of request
app.use(useragent.express());

// authentication
app.use(passport.initialize());
passport.use('jwt', jwtStrategy);
passport.use('google', googleStrategy);
passport.use('facebook', facebookStrategy);

// limit repeated failed requests to auth endpoints
if (config.env === 'production') {
    app.use('/auth', authLimiter);
}

// remove dollar sign, and dot operators from the request against malicious mongoDB operations
app.use(mongoSanitize({ 
	replaceWith: '_', 
	onSanitize: ({ req, key }) => {
		console.warn(`The request[${key}] is sanitized.`);
	},
}));

// sanitize the requests against XSS attacks
app.use(xss());
  
// routes
app.use('/', routes);

// send back a 404 error for any unknown api request
app.use(error.notFound);

// convert error to ApiError
app.use(error.converter);

// handle error
app.use(error.handler);

module.exports = app;