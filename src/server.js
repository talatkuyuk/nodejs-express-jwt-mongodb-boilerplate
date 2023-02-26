const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");

const config = require("./config");
const app = require("./core/express");
const logger = require("./core/logger");
const mongodb = require("./core/mongodb");
const redis = require("./core/redis");

let httpServer, httpsServer;
const SSLdirectory = path.join(__dirname, "/ssl/");

async function start() {
  try {
    await redis.connect();

    await mongodb.connect();

    if (config.server === "https" || config.server === "both") {
      const port = process.env.PORT || config.porthttps;
      const key = fs.readFileSync(SSLdirectory + "localhost-key.pem", "utf8");
      const cert = fs.readFileSync(SSLdirectory + "localhost.pem", "utf8");
      const credentials = { key, cert };

      httpsServer = https.createServer(credentials, app);
      httpsServer.listen(port, function () {
        logger.info("Https Server started on port " + port);
      });
    }

    if (config.server === "http" || config.server === "both") {
      const port = process.env.PORT || config.porthttp;
      httpServer = http.createServer(app);
      httpServer.listen(port, function () {
        logger.info("Http Server started on port " + port);
      });

      // app.listen actually also creates an http server instance
      // httpServer = app.listen(config.porthttp, function () {
      // 	logger.info('Http Server started on port ' + config.porthttp);
      // });
    }
  } catch (error) {
    logger.error(`${error}`);
    exitHandler(1);
  }
}

start();

const exitHandler = async (code) => {
  try {
    await httpServer?.close(() => {
      logger.info("exithandler: Http Server closed.tk");
    });

    await httpsServer?.close(() => {
      logger.info("exithandler: Https Server closed.tk");
    });

    await mongodb.disconnect((result) => {
      logger.info(`exithandler: Mongodb connection is closed with ${result}.tk`);
    });

    await redis.disconnect((result) => {
      logger.info(`exithandler: Redis client quit with ${result}.tk`);
    });

    process.exit(code);
  } catch (error) {
    logger.error(error);
  }
};

process.on("uncaughtException", (err, origin) => {
  console.log("Exeption error message:", err.message);
  console.log("Exeption error origin:", origin);

  logger.error(`uncaughtException: ${err}`);
  exitHandler(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.log("Rejection Reason:", reason);
  console.log("Rejection Promise:", promise);

  logger.error(`unhandledRejection : ${reason}`);
  exitHandler(1);
});

// these two events are considered a successful termination
process.on("SIGINT", cleanup); // SIGINT is emitted when a Node.js process is interrupted, usually with (^-C) keyboard event.
process.on("SIGTERM", cleanup); // SIGTERM is normally sent by a process monitor to tell Node.js to expect a successful termination.

function cleanup(signal) {
  logger.error(`${signal} received for the process ${process.pid}`);
  exitHandler(0);
}

process.on("beforeExit", (code) => {
  // Can make asynchronous calls
  setTimeout(() => {
    console.log(`beforeExit: Process will exit with code: ${code}`);
    process.exit(code);
  }, 100);
});

process.on("exit", (code) => {
  // Only make synchronous calls
  logger.warn(`ON_EXIT code: ${code}`);
});
