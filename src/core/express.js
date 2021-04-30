var express      = require('express');
var path         = require('path');
let helmet 		 = require("helmet");
let crossdomain  = require("helmet-crossdomain");
let noCache 	 = require("nocache");
let cors         = require("cors");
const httpStatus = require('http-status');
const passport 	 = require('passport');

const routes     = require('../routes');
const config     = require('../config');
const morgan     = require('./morgan');
const ApiError   = require('../utils/ApiError');

const { jwtStrategy } = require('./passport');
const { errorConverter, errorHandler } = require('../middlewares/error');
const { authLimiter } = require('../middlewares/rateLimiter');


// *****************************************************************
function initViewEngine(app) {
	// View engine setup  (needs "views" directory )
  app.set('views', path.join(__dirname, '../views'));

  // choose one
  app.set('view engine', 'ejs'); // option-1 
  app.set('view engine', 'pug'); // option-2

  // if need to sent any static file to client (needs "public" directory )
  app.use(express.static(path.join(__dirname, 'public')));

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

// parse JSON bodies (application/json)
app.use(express.json());

// parse urlencoded bodies (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

// enable cors
app.use(cors());
app.options('*', cors());

app.set('strict mode', true);

// jwt authentication
app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

// limit repeated failed requests to auth endpoints
if (config.env === 'production') {
    app.use('/auth', authLimiter);
}
  
// routes
app.use('/', routes);

// send back a 404 error for any unknown api request
app.use((req, res, next) => next(ApiError.notFound()));

// convert error to ApiError
app.use(errorConverter);

// handle error
app.use(errorHandler);

module.exports = app;