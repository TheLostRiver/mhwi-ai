# -*- coding: utf-8 -*-
"""
把 Leviathon 反编译出的 .fand/.nack 解析为结构化 JSON（供 Web 与分析脚本使用）。

  python tools/nack2json.py em013_00

输入 data/<key>/，输出 web/data/<key>.js（`MHWI.register(...)` 形式，便于 file:// 直接打开）。

AST 约定（body 为语句数组）:
  {"t":"seg", "fn":str?, "act":{name,args}?, "call":{file,node}?, "dir":str?, "meta":str?}
  {"t":"if",   "br":[{"c":str|null, "b":body}, ...]}      # c 为 null 表示 else
  {"t":"rand", "br":[{"p":int, "b":body}, ...]}
  {"t":"conclude"}
"""
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

FLOW_RE = re.compile(r"^(if|elif|else|endif|random|elser|endr|endwith|endrwith)\b\s*")
CHANCE_RE = re.compile(r"^\((\d+)\)\s*")
DEF_RE = re.compile(r"^def\s+(.+?)(?:\s*:\s*(\d+))?(?:\s*@\s*(\d+))?\s*$")
ACTION_RE = re.compile(r"^(?:(\w+)\.)?([\w#]+)\((.*)\)$")


def split_segment(text):
    """拆出 fn / -> action / >> call / => directive / @ meta 各部分。"""
    parts = {"fn": None, "act": None, "call": None, "dir": None, "meta": None}
    # 先把寄存器操作 [...] 整体取出，避免里面的 >= 干扰
    fn = None
    rest = text
    if rest.startswith("["):
        end = rest.index("]")
        fn, rest = rest[:end + 1], rest[end + 1:].strip()
    tokens = re.split(r"(?:^|\s)(->|>>|=>|@)\s", " " + rest + " ")
    head = tokens[0].strip()
    if fn is None and head:
        if head in ("return", "reset", "repeat"):
            parts["dir"] = head
        else:
            fn = head
    elif head:
        raise ValueError(f"无法解析: {text}")
    parts["fn"] = fn
    for marker, value in zip(tokens[1::2], tokens[2::2]):
        value = value.strip()
        if marker == "->":
            m = ACTION_RE.match(value)
            if not m:
                raise ValueError(f"动作格式异常: {value}")
            args = [int(a, 0) for a in m.group(3).split(",") if a.strip()]
            parts["act"] = {"name": m.group(2), "args": args}
        elif marker == ">>":
            parts["call"] = value
        elif marker == "=>":
            parts["dir"] = value
        elif marker == "@":
            parts["meta"] = value
    return parts


def resolve_call(call, file_key, scopes):
    if "." in call:
        scope, node = call.split(".", 1)
        return {"file": scopes[scope], "node": node}
    return {"file": file_key, "node": call}


def make_seg(parts, file_key, scopes):
    seg = {"t": "seg"}
    if parts["fn"]:
        seg["fn"] = parts["fn"]
    if parts["act"]:
        seg["act"] = parts["act"]
    if parts["call"]:
        seg["call"] = resolve_call(parts["call"], file_key, scopes)
    if parts["dir"]:
        seg["dir"] = parts["dir"]
    if parts["meta"]:
        seg["meta"] = parts["meta"]
    return seg


def parse_nack(path, file_key, scopes):
    nodes = []
    node = None
    stack = []            # 打开的 if/rand 块
    body = None           # 当前语句追加位置

    def cur_body():
        return stack[-1]["br"][-1]["b"] if stack else node["body"]

    for lineno, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("importactions") or line.startswith("importlibrary"):
            continue
        if line.startswith("def "):
            m = DEF_RE.match(line)
            names = [n.strip() for n in m.group(1).split("&")]
            node = {"name": names[0], "index": int(m.group(3)) if m.group(3) else len(nodes),
                    "line": lineno, "body": []}
            nodes.append(node)
            continue
        if line == "endf":
            if stack:
                raise ValueError(f"{path.name}:{lineno} 节点结束时仍有未闭合块")
            node = None
            continue
        if line == "conclude":
            cur_body().append({"t": "conclude"})
            continue

        flow = None
        m = FLOW_RE.match(line)
        if m:
            flow = m.group(1)
            line = line[m.end():]
        chance = None
        if flow in ("random", "elser"):
            m = CHANCE_RE.match(line)
            chance = int(m.group(1))
            line = line[m.end():]
        parts = split_segment(line.strip()) if line.strip() else {"fn": None, "act": None, "call": None, "dir": None, "meta": None}
        cond = parts.pop("fn") if flow in ("if", "elif") else None
        seg = make_seg(dict(parts, fn=None if flow in ("if", "elif") else parts["fn"]), file_key, scopes)
        has_payload = len(seg) > 1

        if flow == "if":
            block = {"t": "if", "br": [{"c": cond, "b": []}], "line": lineno}
            cur_body().append(block)
            stack.append(block)
        elif flow == "random":
            block = {"t": "rand", "br": [{"p": chance, "b": []}], "line": lineno}
            cur_body().append(block)
            stack.append(block)
        elif flow == "elif":
            stack[-1]["br"].append({"c": cond, "b": []})
        elif flow == "else":
            stack[-1]["br"].append({"c": None, "b": []})
        elif flow == "elser":
            stack[-1]["br"].append({"p": chance, "b": []})
        elif flow in ("endif", "endr"):
            if has_payload:
                raise ValueError(f"{path.name}:{lineno} 暂不支持 endif/endr 后带内容")
            stack.pop()
            continue
        elif flow in ("endwith", "endrwith"):
            raise ValueError(f"{path.name}:{lineno} 暂不支持 endwith")

        if has_payload:
            seg["line"] = lineno
            cur_body().append(seg)
    return nodes


def parse_fand(path):
    contexts = []
    info = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("is "):
            info["monster"] = line[3:]
        elif line.startswith("through "):
            info["through"] = line[8:]
        elif "=" in line and line.endswith(tuple("0123456789ABCDEF")) and "@" in line:
            ctx, rest = [s.strip() for s in line.split("=", 1)]
            nack, hsh = [s.strip() for s in rest.split("@")]
            contexts.append({"context": ctx, "file": Path(nack).stem, "hash": hsh})
    info["contexts"] = contexts
    return info


def main():
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8")
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    key = sys.argv[1]
    src = REPO / "data" / key
    fand = next(src.glob("*.fand"))
    project = parse_fand(fand)
    global_file = next(c["file"] for c in project["contexts"] if c["context"] == "Global")
    scopes = {"Global": global_file}

    files = {}
    for nack in sorted(src.glob("*.nack")):
        fk = nack.stem
        files[fk] = {"nodes": parse_nack(nack, fk, scopes)}

    # 校验所有调用目标存在
    names = {fk: {n["name"] for n in f["nodes"]} for fk, f in files.items()}
    missing = set()

    def walk(body):
        for st in body:
            if st["t"] == "seg" and "call" in st:
                c = st["call"]
                if c["node"] not in names.get(c["file"], ()):
                    missing.add(f'{c["file"]}.{c["node"]}')
            for br in st.get("br", []):
                walk(br["b"])
    for f in files.values():
        for n in f["nodes"]:
            walk(n["body"])
    if missing:
        print("警告: 以下调用目标不存在:", sorted(missing), file=sys.stderr)

    out = {"key": key, "project": project, "files": files}
    dst = REPO / "web" / "data" / f"{key}.js"
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text("MHWI.registerThk(" + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ");\n",
                   encoding="utf-8")
    total = sum(len(f["nodes"]) for f in files.values())
    print(f"{key}: {len(files)} 个 THK, {total} 个节点 -> {dst}")


if __name__ == "__main__":
    main()
