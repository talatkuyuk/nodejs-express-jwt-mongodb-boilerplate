
const config = require('./config');
const app = require('./core/express');
const logger = require('./core/logger')
const mongodb = require('./core/mongodb');

let server;

mongodb.connect( function( error ) {

	if (error) unexpectedErrorHandler(error);

	server = app.listen(config.port, function () {
		logger.info('Server started on port ' + config.port);
	});
});


const exitHandler = () => {

	mongodb.disconnect();

	if (server) {
	  server.close(() => {
		logger.info('Server closed.tk');
		process.exit(1);
	  });
	} else {
	  process.exit(1);
	}
  };
  
  const unexpectedErrorHandler = (error) => {
	logger.error(error);
	exitHandler();
  };
  
  process.on('uncaughtException', unexpectedErrorHandler);
  process.on('unhandledRejection', unexpectedErrorHandler);
  
  process.on('SIGTERM', () => {
	logger.info('SIGTERM received');
	if (server) {
	  server.close();
	}
  });
