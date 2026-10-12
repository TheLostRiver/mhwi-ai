# -*- coding: utf-8 -*-
"""
解析黑龙专属调参表 em013.dtt_unq（nEmDtTune::cEmUniqueEm013）。

字段顺序取自游戏 exe（版本 421810）中该类的反序列化函数（vtable[6] = 0x1402d7b50），
对象内偏移取自其构造函数 0x1402d6e80；文件头中的类 CRC 0x7C899B02 与 DTI 记录一致。

  python tools/em013_unq.py [extracted/em/em013/00/data/em013.dtt_unq]

列表元素为 (怪物内部 ID, 动作 ID)，动作名取自 Leviathon 的 ActionDumps/em101.txt。
"""
import re
import struct
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CLASS_CRC = 0x7C899B02


def action_names():
    src = (REPO / "third_party/Leviathon/common/ActionDumps/em101.txt").read_text(encoding="utf-8")
    return {int(i): n.strip() for _, i, n in re.findall(r"Group:(\d+),ID:(\d+),Name:([^\r\n\[]+)", src)}


class Reader:
    def __init__(self, data):
        self.d, self.p = data, 0

    def u32(self):
        v = struct.unpack_from("<I", self.d, self.p)[0]
        self.p += 4
        return v

    def f32(self):
        v = struct.unpack_from("<f", self.d, self.p)[0]
        self.p += 4
        return round(v, 6)


def main():
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8")
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else REPO / "extracted/em/em013/00/data/em013.dtt_unq"
    r = Reader(path.read_bytes())
    names = action_names()
    magic, version, em_id, _, _, crc = (r.u32() for _ in range(6))
    if crc != CLASS_CRC:
        sys.exit(f"类 CRC 不符：{crc:#x}（期望 {CLASS_CRC:#x}）")
    print(f"magic={magic:#x} version={version} em={em_id} class=cEmUniqueEm013")

    def scalars(*fields):
        for off, kind, note in fields:
            v = r.u32() if kind == "u32" else r.f32()
            print(f"  +{off:#05x} {kind} = {v}{'    ' + note if note else ''}")

    def action_list(off, note=""):
        n = r.u32()
        items = [(r.u32(), r.u32()) for _ in range(n)]
        print(f"  +{off:#05x} 动作列表 ×{n}{'    ' + note if note else ''}")
        for em, act in items:
            print(f"        ({em}, {act:3d}) {names.get(act, '?')}")

    scalars((0x28, "u32", ""), (0x2c, "f32", ""))
    n = r.u32()
    print(f"  +0x038 cAimJointData ×{n}")
    for _ in range(n):
        r.u32()  # 元素类 CRC
        print(f"        joint={r.u32()} value={r.f32()} flag={r.u32()}")
    scalars(*[(0x50 + 4 * i, "f32", "") for i in range(8)])
    action_list(0x78)
    scalars((0x70, "f32", ""), (0x74, "f32", ""))
    scalars(*[(o, "f32", "") for o in (0x98, 0x9c, 0xa0, 0xa4, 0xa8, 0xbc, 0xc0, 0xc8, 0xcc, 0xac, 0xb4, 0xb8, 0xd0)])
    action_list(0xd8)
    action_list(0xf8)
    scalars((0xc4, "f32", ""), (0x178, "f32", ""), (0xb0, "f32", ""))
    n = r.u32()
    print(f"  +0x008 (u32, f32) ×{n}")
    for _ in range(n):
        print(f"        {r.u32()}, {r.f32()}")
    action_list(0x118, "← 不计入「开局计数」的动作（function#10E）")
    action_list(0x138)
    scalars((0x17c, "u32", "← function#10E 的阈值：开局计数 < 该值时为真"),
            (0x180, "u32", ""), (0x184, "u32", ""))
    action_list(0x158)
    scalars((0x188, "f32", ""), (0x18c, "f32", ""), (0x190, "u32", ""))
    print(f"已读 {r.p} / {len(r.d)} 字节（末尾 4 字节为校验值）")


if __name__ == "__main__":
    main()
