# -*- coding: utf-8 -*-
"""
解析怪物动作参数文件 .actp2（rActionParam），按动作名列出指定字段。

文件由若干对象组成，每个对象以 0x11E2D786、1 字节「有数据」标志、4 字节动作哈希开头；
动作哈希 = JAMCRC("ACTION::<动作名>")，动作名取自 Leviathon 的 ActionDumps/emXXX.txt（XXX 为内部编号）。
字段编码为 [类型哈希 u32][值][字段名\0][类型码 u32][类型名\0][数量 u32]…，值在字段名之前。

  python tools/actp2.py extracted/em/em057/00/data/em057.actp2 94 mIncBarrierValue mDecBarrierValue mbSetValueOnEnter
"""
import re
import struct
import sys
import zlib
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
MARK = struct.pack("<I", 0x11E2D786)


def action_names(internal_id):
    src = (REPO / f"third_party/Leviathon/common/ActionDumps/em{internal_id:03d}.txt").read_text(encoding="utf-8")
    names = {}
    for i, n in re.findall(r"ID:(\d+),Name:ACTION::(\w+)", src):
        names[zlib.crc32(f"ACTION::{n}".encode()) ^ 0xFFFFFFFF] = (int(i), n)
    return names


def field(seg, name):
    m = re.search(re.escape(name.encode()) + rb"\x00.\x00\x00\x00([a-z0-9]+)\x00", seg)
    if not m:
        return None
    t, st = m.group(1).decode(), m.start()
    if t == "bool":
        return seg[st - 1]
    if t == "f32":
        return round(struct.unpack_from("<f", seg, st - 4)[0], 4)
    return struct.unpack_from("<i" if t == "s32" else "<I", seg, st - 4)[0]


def main():
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8")
    path, internal_id, fields = Path(sys.argv[1]), int(sys.argv[2]), sys.argv[3:]
    d = path.read_bytes()
    names = action_names(internal_id)
    pos = [m.start() for m in re.finditer(re.escape(MARK), d)] + [len(d)]
    print("ID\t动作\t" + "\t".join(fields))
    for a, b in zip(pos, pos[1:]):
        if d[a + 4] != 1:
            continue
        aid, name = names.get(struct.unpack_from("<I", d, a + 5)[0], (-1, "?"))
        vals = [field(d[a:b], f) for f in fields]
        if any(v not in (None, 0) for v in vals):
            print(f"{aid}\t{name}\t" + "\t".join("" if v is None else str(v) for v in vals))


if __name__ == "__main__":
    main()
