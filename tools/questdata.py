# -*- coding: utf-8 -*-
"""
解密并解析任务数据 questData_*.mib，列出含指定怪物的任务及其能力倍率。

  python tools/mhw_chunk.py extract "quest/questData_[0-9]+\\.mib$"
  python tools/mhw_chunk.py extract "common/em/em_difficulty\\.dtt_dif$"
  python tools/questdata.py 92          # 怪物内部编号（Leviathon common/monIds.txt 第 4 列）：92 = 激昂金狮子

mib 用 Blowfish/ECB 加密（MHW 按小端 32 位字处理，进出都要逐 4 字节翻转），密钥见 Synthlight/MHW-Editor
的 EncryptionKeys.cs；布局取自 AsteriskAmpersand/QuestDataDump 的 MIBTemplate-Iceborne.bt。
怪物的体力/攻击等字段是 em_difficulty.dtt_dif 的行号，每个字段取该行对应的一列；多人档位是第二张表的行号。
需要 cryptography（Blowfish 在 cryptography.hazmat.decrepit 里）。
"""
import struct
import sys
from pathlib import Path

from cryptography.hazmat.decrepit.ciphers.algorithms import Blowfish
from cryptography.hazmat.primitives.ciphers import Cipher, modes

REPO = Path(__file__).resolve().parent.parent
KEY = b"TZNgJfzyD2WKiuV4SglmI6oN5jP2hhRJcBwzUooyfIUTM4ptDYGjuRTP"
STAGES = {101: "古代树森林", 102: "大蚁冢荒地", 103: "陆珊瑚台地", 104: "瘴气之谷", 105: "龙结晶之地",
          108: "永霜冻土", 109: "导虫之地", 201: "特殊斗技场", 202: "斗技场"}
HEADER = [("magic", "Q"), ("pad", "H"), ("mibID", "I"), ("stars", "B"), ("u0", "I"), ("u1", "I"), ("rank", "I"),
          ("map", "I"), ("plSpawn", "I"), ("fixedSpawn", "I"), ("binMap", "I"), ("dayNight", "I"), ("weather", "I"),
          ("u3", "I"), ("reward", "I"), ("u5", "I"), ("subReward", "I"), ("timer", "I"), ("u4", "B"),
          ("icons", "5H"), ("hr", "B"), ("u6", "I")]
OBJ = [("type", "B"), ("multi", "B"), ("u0", "H"), ("id", "H"), ("count", "H")]
EM = [("monsterID", "i"), ("sobj", "I"), ("u0", "I"), ("tempered", "B"), ("hp", "I"), ("atk", "I"), ("plDmg", "I"),
      ("roll", "I"), ("size", "I"), ("sizeTable", "I"), ("u1", "I"), ("partHP", "I"), ("statusBase", "I"),
      ("statusBuild", "I"), ("stun", "I"), ("exhaust", "I"), ("mount", "I")]
# dtt_dif 每行 9 列；mib 里各字段取自己那一列
DIF_COLS = ["hp", "atk", "plDmg", "partHP", "statusBase", "statusBuild", "stun", "exhaust", "mount"]
DIF_ZH = ["体力", "攻击", "玩家伤害", "部位耐久", "异常基础", "异常累积", "眩晕", "减气", "骑乘"]


def decrypt(raw):
    swap = lambda b: b"".join(b[i:i + 4][::-1] for i in range(0, len(b), 4))
    c = Cipher(Blowfish(KEY), modes.ECB()).decryptor()
    return swap(c.update(swap(raw)) + c.finalize())


def parse(path):
    data, off = decrypt(Path(path).read_bytes()), 0

    def take(fmt):
        nonlocal off
        v = struct.unpack_from("<" + fmt, data, off)
        off += struct.calcsize(fmt)
        return v if len(v) > 1 else v[0]

    read = lambda spec: {k: take(f) for k, f in spec}
    q = {"header": read(HEADER), "obj1": read(OBJ), "obj2": read(OBJ)}
    take("B")
    read(OBJ), read(OBJ)
    misc = [take(f) for f in "IIIBBBBIIIIIIIIII"]
    q["ATFlag"] = misc[5]
    q["em"] = [read(EM) for _ in range(7)]
    take("4I")
    take("b")
    q["multiDiff"] = take("I")
    return q


def difficulty():
    d = (REPO / "extracted/common/em/em_difficulty.dtt_dif").read_bytes()
    assert len(d) == 8 + 1000 * 36 * 2 + 28, "em_difficulty.dtt_dif 大小不符"
    solo = lambda i: struct.unpack_from("<9f", d, 8 + i * 36)
    multi = lambda i: struct.unpack_from("<9f", d, 8 + 36000 + i * 36)
    return solo, multi


def main():
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8")
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    want = int(sys.argv[1])
    solo, multi = difficulty()
    for f in sorted((REPO / "extracted/quest").glob("questData_*.mib")):
        q = parse(f)
        ems = [e for e in q["em"] if e["monsterID"] == want]
        if not ems:
            continue
        h = q["header"]
        m = multi(q["multiDiff"])
        print(f"q{h['mibID']} ★{h['stars']} {STAGES.get(h['map'], h['map'])} "
              f"多人档位 {q['multiDiff']}（体力 {m[0]:.2f} / 部位 {m[3]:.2f}）")
        for e in ems:
            vals = " ".join(f"{zh}{solo(e[k])[i]:.2f}" for i, (k, zh) in enumerate(zip(DIF_COLS, DIF_ZH)))
            print(f"    历战 {e['tempered']} 档位 {e['hp']}/{e['atk']}/{e['partHP']}  {vals}")


if __name__ == "__main__":
    main()
