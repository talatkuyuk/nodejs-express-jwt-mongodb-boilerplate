const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const config = require('./config');
const app = require('./core/express');
const logger = require('./core/logger')
const mongodb = require('./core/mongodb');
const redis = require('./core/redis');

let httpServer, httpsServer, redisClient;
const SSLdirectory = path.join(__dirname , '/ssl/');


redis.establisConnection().then(() => {
	mongodb.connect().then(() => {
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
		logger.error(`Mongodb connection error: ${error}`);
		exitHandler();
	});

}).catch((error) => {
	logger.error(`redis connection error: ${error}`);
	exitHandler();
});




const exitHandler = async () => {

	process.exitCode = 1;

	await httpServer?.close(() => {
		logger.info('Http Server closed.exithandler.tk');
	});

	await httpsServer?.close(() => {
		logger.info('Https Server closed.exithandler.tk');
	});

	await mongodb.disconnect(() => {
		logger.info("Mongodb connection is closed.exithandler.tk");
	});

	await redis.getRedisClient()?.quit(function() {
		logger.info(`redis client quit.exithandler.tk`);
	});
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

  




  