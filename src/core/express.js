var express     = require('express');
var path        = require('path');
let helmet 			= require("helmet");
let crossdomain = require("helmet-crossdomain");

const routes = require('../routes');
const config = require('../config');

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
		app.use(helmet.noCache());

		// Jade options: Don't minify html, debug intrumentation
		app.locals.pretty = true;
		//app.locals.compileDebug = true;

	} else {
		app.locals.cache = "memory";
		app.set("view cache", true);
	}
}
// *******************************************************************

var app = express();

// set security HTTP headers
app.use(helmet());

// Sets X-Permitted-Cross-Domain-Policies: none
app.use(crossdomain())

// if need to server side rendering 
initViewEngine(app)

// parse JSON (parse application/json)
app.use(express.json());

// parse urlencoded bodies (parse application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

// limit repeated failed requests to auth endpoints
if (config.env === 'production') {
    app.use('/auth', authLimiter);
  }
  
// routes
app.use('/', routes);

module.exports = app;