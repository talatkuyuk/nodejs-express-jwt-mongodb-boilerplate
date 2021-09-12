const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const config = require('./config');
const app = require('./core/express');
const logger = require('./core/logger')
const mongodb = require('./core/mongodb');

let httpServer, httpsServer;
const SSLdirectory = path.join(__dirname , '/ssl/')

mongodb.connect( function( error ) {

	if (error) unexpectedErrorHandler(error);

	const key  = fs.readFileSync(SSLdirectory + 'server.decrypted.key', 'utf8');
	const cert = fs.readFileSync(SSLdirectory + 'server.crt', 'utf8');
	const credentials = { key, cert };

	httpServer = http.createServer(app);
	httpsServer = https.createServer(credentials, app);

	httpServer.listen(config.porthttp, function () {
		logger.info('Http Server started on port ' + config.porthttp);
	});

	httpsServer.listen(config.porthttps, function () {
		logger.info('Https Server started on port ' + config.porthttps);
	});

	// app.listen actually creates an http server instance
	// server = app.listen(config.port, function () {
	// 	logger.info('Server started on port ' + config.port);
	// });
});


const exitHandler = () => {

	mongodb.disconnect();

	if (httpServer) {
		httpServer.close(() => {
		logger.info('Http Server closed.tk');
		process.exit(1);
	  });
	} else {
	  process.exit(1);
	}

	if (httpsServer) {
		httpsServer.close(() => {
		logger.info('Https Server closed.tk');
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
	if (httpServer) { httpServer.close() }
	if (httpsServer) { httpsServer.close() }
  });
  