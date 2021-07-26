var watch = require("watch");
var childProcess = require("child_process");

console.log("Watching src directory for changes...");

watch.watchTree(__dirname + "/lib", function (f, curr, prev) {
   if (prev) {
      console.log("Change detected, rebuilding.");
   }
   childProcess.fork(__dirname + "/scripts/build-format.js");
});
