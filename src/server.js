const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const config = require('./config');
const app = require('./core/express');
const logger = require('./core/logger')
const mongodb = require('./core/mongodb');
const redis = require('./core/redis');

let httpServer, httpsServer;
const SSLdirectory = path.join(__dirname , '/ssl/');


async function start() {
	try {
		await redis.connect();

		await mongodb.connect();

		if (config.server === "https" || config.server === "both") {
			const port = process.env.PORT || config.porthttps;
			const key  = fs.readFileSync(SSLdirectory + 'server.decrypted.key', 'utf8');
			const cert = fs.readFileSync(SSLdirectory + 'server.crt', 'utf8');
			const credentials = { key, cert };

			httpsServer = https.createServer(credentials, app);
			httpsServer.listen(port, function () {
				logger.info('Https Server started on port ' + port);
			});
		}
		
		if (config.server === "http" || config.server === "both") {
			const port = process.env.PORT || config.porthttp;
			httpServer = http.createServer(app);
			httpServer.listen(port, function () {
				logger.info('Http Server started on port ' + port);
			});

			// app.listen actually also creates an http server instance
			// httpServer = app.listen(config.porthttp, function () {
			// 	logger.info('Http Server started on port ' + config.porthttp);
			// });
		}

	} catch (error) {
		logger.error(`${error}`);
		exitHandler();
	}
}

start();

const exitHandler = async () => {
	try {
		process.exitCode = 1;

		await httpServer?.close(() => {
			logger.info('exithandler: Http Server closed.tk');
		});

		await httpsServer?.close(() => {
			logger.info('exithandler: Https Server closed.tk');
		});

		await mongodb.disconnect((result) => {
			logger.info(`exithandler: Mongodb connection is closed with ${result}.tk`);
		});

		await redis.disconnect((result) => {
			logger.info(`exithandler: Redis client quit with ${result}.tk`);
		});
	} catch (error) {
		logger.error(error);
	}
};
  
  
process.on('uncaughtException', (err, origin) => {
	logger.error(`uncaughtException: ${err}`);
	exitHandler();
});


process.on('unhandledRejection', (reason, promise) => {
	console.log(`Unhandled Rejection Promise: ${promise}\nRejection Reason: ${reason.stack || reason}`);
	
	logger.error(`unexpectedError : ${reason}`);
	exitHandler();
});


process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

function cleanup(signal) {
	logger.error(`${signal} received.tk`);
	exitHandler()
};


process.on("exit", function(code){
	logger.warn(`ON_EXIT code: ${code}`);
});

  




  