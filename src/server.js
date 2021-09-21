const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const config = require('./config');
const app = require('./core/express');
const logger = require('./core/logger')
const mongodb = require('./core/mongodb');
const redisClient = require('./utils/cache').getRedisClient();

let httpServer, httpsServer;
const SSLdirectory = path.join(__dirname , '/ssl/')

mongodb.connect()
	.then(() => {
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

	})
	.catch((error) => {
		logger.error(`mongodb connection error: ${error}`);
		exitHandler();
	})


const exitHandler = () => {

	process.exitCode = 1;

	httpServer?.close(() => {
		logger.info('Http Server closed.tk');
	});

	httpsServer?.close(() => {
		logger.info('Https Server closed.tk');
	});

	mongodb.disconnect();

	redisClient.quit(function() {
		logger.info(`redis client quit.tk`);
	});

};
  
  
process.on('uncaughtException', (err, origin) => {
	console.log(`UnCaught Exception: ${err}\nException Origin: ${origin}`);

	logger.error(`uncaughtException happened: ${err}`);
	exitHandler();
});


process.on('unhandledRejection', (reason, promise) => {
	console.log(`Unhandled Rejection Promise: ${promise}\nRejection Reason: ${reason.stack || reason}`);
	
	logger.error(`unexpectedError happened: ${reason}`);
	exitHandler();
});


process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

function cleanup(signal) {
	logger.error(`${signal} received.tk`);
	exitHandler()
};


process.on("exit", function(code){
	redisClient.quit(function() {
		console.log('redis client quit on process exit.tk');
	});

	console.log(`Process exit event with code: ${code}`);
});

  




  