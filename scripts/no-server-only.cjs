// Scripts only: lets server modules load outside Next (server-only would throw).
const Module = require("module");
const orig = Module._resolveFilename;
Module._resolveFilename = function (req, ...rest) {
  if (req === "server-only") return require.resolve("./empty.cjs");
  return orig.call(this, req, ...rest);
};
