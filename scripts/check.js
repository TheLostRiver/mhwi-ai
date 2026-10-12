// 校验 nack2json 的解析结果：打印回 nack 文本并与原文逐行比对；检查随机权重和
// 用法: node scripts/check.js em013_00
const fs = require("fs");
const path = require("path");
const { load, ROOT } = require("./load");

function findNack(dir, name) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { const r = findNack(p, name); if (r) return r; }
    else if (e.name === name) return p;
  }
  return null;
}

const key = process.argv[2] || "em013_00";
const { project } = load(key);
const globalFile = project.project.contexts.find((c) => c.context === "Global").file;

function callText(call, file) {
  if (call.file === file) return call.node;
  return (call.file === globalFile ? "Global" : call.file) + "." + call.node;
}

function segText(st, file, scope) {
  const parts = [];
  if (st.fn) parts.push(st.fn);
  if (st.act) parts.push(`-> ${scope}.${st.act.name}(${st.act.args.join(",")})`);
  if (st.call) parts.push(">> " + callText(st.call, file));
  if (st.dir) parts.push(parts.length ? "=> " + st.dir : st.dir);
  if (st.meta) parts.push("@ " + st.meta);
  return parts.join(" ");
}

function printBody(body, file, scope, out) {
  for (const st of body) {
    if (st.t === "seg" && st.ew) {
      const end = out.pop();
      out.push(`${end === "endr" ? "endrwith" : "endwith"} ${segText(st, file, scope)}`);
    } else if (st.t === "seg") out.push(segText(st, file, scope));
    else if (st.t === "conclude") out.push("conclude");
    else {
      st.br.forEach((br, i) => {
        let head;
        if (st.t === "if") head = i === 0 ? `if ${br.c}` : br.c === null ? "else" : `elif ${br.c}`;
        else head = `${i === 0 ? "random" : "elser"} (${br.p})`;
        // 原文把分支体第一条（若来自同一段）写在同一行，这里统一拆行后再比较
        out.push(head);
        printBody(br.b, file, scope, out);
      });
      out.push(st.t === "if" ? "endif" : "endr");
    }
  }
}

let bad = 0;
const scope = "fatalis";
for (const [fk, f] of Object.entries(project.files)) {
  const src = fs.readFileSync(findNack(path.join(ROOT, "data", key), fk + ".nack"), "utf8");
  const scopeName = (src.match(/importactions \S+ as (\S+)/) || [])[1] || scope;
  const norm = (s) => s.trim().replace(/\s+/g, " ");
  // 原文: 把 "if X >> y" 这类同行写法拆成两行，便于比较
  const orig = [];
  for (const line of src.split(/\r?\n/)) {
    const l = norm(line);
    if (!l || l.startsWith("import") || l.startsWith("def ") || l === "endf") continue;
    const m = /^(if .+?|elif .+?|else|random \(\d+\)|elser \(\d+\))(?: ((?:->|>>|=>) .*))?$/.exec(l);
    const fm = /^(if|elif) (\[[^\]]+\]|\S+)(?: ((?:->|>>|=>) .*))?$/.exec(l);
    if (fm) { orig.push(`${fm[1]} ${fm[2]}`); if (fm[3]) orig.push(fm[3].replace(/^=> /, "")); continue; }
    if (m && m[2]) { orig.push(m[1]); orig.push(m[2].replace(/^=> /, "")); continue; }
    orig.push(l);
  }
  const out = [];
  for (const n of f.nodes) printBody(n.body, fk, scopeName, out);
  const gen = out.map(norm);
  const len = Math.max(orig.length, gen.length);
  for (let i = 0; i < len; i++) {
    if (orig[i] !== gen[i]) {
      console.log(`${fk} 第 ${i} 条不一致:\n  原: ${orig[i]}\n  新: ${gen[i]}`);
      bad++;
      break;
    }
  }
}

// 随机权重和
const sums = new Map();
for (const [fk, f] of Object.entries(project.files)) {
  const walk = (body, node) => {
    for (const st of body) {
      if (st.t === "rand") {
        const s = st.br.reduce((a, b) => a + b.p, 0);
        if (s !== 100) sums.set(`${fk}.${node}@${st.line}`, s);
      }
      if (st.br) st.br.forEach((br) => walk(br.b, node));
    }
  };
  f.nodes.forEach((n) => walk(n.body, n.name));
}
console.log(bad ? `${bad} 个文件不一致` : "全部文件往返一致");
console.log(sums.size ? "权重和不为 100 的随机块: " + JSON.stringify([...sums]) : "所有随机块权重和均为 100");
