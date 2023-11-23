var Express = require("express");

var port = process.env.PORT || 3001; // don't clash with gi-matrix by default

var app = Express();
app.use(Express.static("./dist"));
var server = app.listen(port, function () {
  console.log(
    "Serving story format at http://localhost:" +
      port +
      "/enquirywitch-0.0.1/format.js\n",
  );

  require("./watch.js");
});
