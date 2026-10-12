// Node 端加载 web/data 下的数据与注释（与浏览器共用同一份 JS）
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const MHWI = require(path.join(ROOT, "web/js/thk-core.js"));

function loadScript(file) {
  vm.runInThisContext(fs.readFileSync(file, "utf8"), { filename: file });
}

function load(key) {
  if (!MHWI.thk[key]) loadScript(path.join(ROOT, "web/data", `${key}.js`));
  const annoFile = path.join(ROOT, "web/data", `${key}.anno.js`);
  if (!MHWI.anno[key] && fs.existsSync(annoFile)) loadScript(annoFile);
  return { project: MHWI.thk[key], anno: MHWI.anno[key] };
}

module.exports = { MHWI, load, ROOT };
