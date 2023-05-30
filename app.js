const express = require("express");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cron = require("node-cron");
const { indexDocs } = require("./lib/common");
const config = require("./config/config.json");
const route = require("./routes/index");
const app = express();
app.use(logger("dev"));
app.set("port", process.env.PORT || 8080);
app.set("bind", process.env.BIND || "0.0.0.0");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/", route);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get("env") === "development") {
  app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.send({
      message: err.message,
      error: err,
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send({
    message: err.message,
    error: err,
  });
});

// add some references to app
app.config = config;

// set the indexing to occur every day - defaults to every 5mins
cron.schedule(config.updateDocsCron || "0 0 * * *", async () => {
  await indexDocs(app);
  console.log("[INFO] Re-indexing complete");
});

const startServer = async () => {
  // kick off initial index
  await indexDocs(app);

  console.log("[INFO] Indexing complete");
  console.log("[INFO] Node ENV", process.env.NODE_ENV);
  // serve the app
  app.listen(app.get("port"), app.get("bind"), () => {
    console.log(
      "[INFO] docs running on host: http://" +
        app.get("bind") +
        ":" +
        app.get("port")
    );
  });
};
startServer();

module.exports = app;
