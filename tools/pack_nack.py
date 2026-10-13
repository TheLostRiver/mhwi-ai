# -*- coding: utf-8 -*-
"""
把怪物 AI 反编译结果打包给别人分析：保留空节点、node_NNN 等于游戏原始序号（可对照日志）。

  python tools/pack_nack.py                     # data/ 下所有怪物 → build/mhwi-nack.zip
  python tools/pack_nack.py em050_00 em057_00   # 只打包指定怪物

步骤：对每只怪物运行 decompile.py --full（→ build/nack_full/<key>/），逐文件校验它与
data/<key>/ 的默认输出除编号和空节点外逐行一致，再生成「编号对照.csv」（网页编号 ↔
原始序号 ↔ 节点 id）和 README.txt，打成 zip。两套编号的区别见 decompile.py 说明。
"""
import csv
import io
import re
import sys
import zipfile
from pathlib import Path

from decompile import REPO, decompile

NAMES = {
    "em013_00": "黑龙 Fatalis", "em023_05": "激昂金狮子 Furious Rajang", "em050_00": "煌黑龙 Alatreon",
    "em057_00": "雷狼龙 Zinogre", "em124_00": "历战王冰呪龙 Arch-Tempered Velkhana",
}
COMPACT = re.compile(r"^def node_(\d+) @ (\d+)$", re.M)
FULL = re.compile(r"^def node_(\d+) : (-?\d+) @ (\d+)$", re.M)

README = """怪物猎人世界：冰原（MHW:I）怪物 AI 反编译文件（.nack）
==========================================================

在线分析与模拟器：https://mhwi.helsincy.com
项目仓库：https://github.com/TheLostRiver/mhwi-ai

包含的怪物
----------
{monsters}

每个目录对应游戏里的一个 thklst（怪物 AI 文件表）。亚种的 thklst 会同时引用 00/ 和 05/
两个目录的 THK，所以保留了游戏里的子目录结构。.fand 是文件表与寄存器声明。

反编译方式
----------
反编译器：Leviathon（AsteriskAmpersand，GPLv3）
命令：decompilerMain.py <emXXX.thklst> -nullShow -indexShow -idShow

  -nullShow   保留空节点。Leviathon 默认会丢掉空节点并把剩下的节点重新连续编号，
              那样 node_NNN 就和游戏里的节点序号、日志里的序号对不上。
  -indexShow  每个节点头写出它在 THK 文件里的原始序号（@ 后的数字）。
  -idShow     每个节点头写出节点 id（: 后的数字，0 表示无 id）。

所以节点头的格式是：
  def node_NNN : <节点id> @ <原始序号>
本包里 NNN 始终等于原始序号，可以直接和日志对照。

和网站上的编号不一样
--------------------
mhwi.helsincy.com 和项目文档用的是 Leviathon 默认输出（丢掉空节点、重新编号）。
每个怪物目录下的 编号对照.csv 列出了 文件、网页编号、原始序号、节点 id，可以互相换算
（例：{example}）。除编号和多出的空节点外，两版内容逐行一致（打包时已校验）。

语法速查
--------
  def node_NNN ... endf        一个节点
  >> node_XXX                  调用节点（Global.node_XXX 为公共文件 emXXX_55 里的节点）
  -> monster.action(参数)       执行动作
  if / elif / else / endif     条件；random (权重) / elser 为随机分支
  [RegisterVarN ++] 等          计数器（寄存器）操作
  function#NNN(...)            exe 中的条件函数；101 起为怪物专属，语义见网站各怪物「exe 逆向」一节
  self.xxx()                   通用查询（距离、角度、目标、飞行、HP 百分比等）

说明
----
文件是游戏数据的反编译结果，仅供研究与交流。
"""


def compare(compact, full):
    """把默认输出的编号换算成原始序号、删掉完整输出里多出的空节点后逐行比较。返回不一致的文件。"""
    maps = {p.stem: {int(n): int(ix) for n, ix in COMPACT.findall(p.read_text(encoding="utf-8"))}
            for p in compact.rglob("*.nack")}
    glob_stem = next(s for s in maps if s.endswith("_55"))
    bad = []
    for p in compact.rglob("*.nack"):
        def rename(m):
            scope, n = m.group(1), int(m.group(2))
            mp = maps[glob_stem] if scope == "Global." else maps[scope[:-1]] if scope else maps[p.stem]
            return f"{scope}node_{mp[n]:03d}"
        old = re.sub(r"((?:\w+\.)?)node_(\d+)", rename, p.read_text(encoding="utf-8"))
        old = re.sub(r"^(def node_\d+) @ \d+$", r"\1", old, flags=re.M)
        keep = set(maps[p.stem].values())
        new = []
        for block in re.split(r"(?m)^(?=def node_)", (full / p.relative_to(compact)).read_text(encoding="utf-8")):
            m = FULL.match(block)
            if m and int(m.group(3)) not in keep:
                continue
            new.append(re.sub(r"^(def node_\d+) : -?\d+ @ \d+$", r"\1", block, flags=re.M))
        lines = lambda t: [l.rstrip() for l in t.splitlines() if l.strip()]
        if lines(old) != lines("".join(new)):
            bad.append(p.relative_to(compact))
    return bad


def mapping(compact, full):
    rows = []
    for p in sorted(full.rglob("*.nack")):
        old = {int(ix): int(n) for n, ix in COMPACT.findall((compact / p.relative_to(full)).read_text(encoding="utf-8"))}
        for n, nid, ix in FULL.findall(p.read_text(encoding="utf-8")):
            o = old.get(int(ix))
            rows.append([p.name, f"node_{o:03d}" if o is not None else "（空节点，网页未收录）", ix, nid])
    return rows


def main():
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8")
    keys = sys.argv[1:] or sorted(p.name for p in (REPO / "data").iterdir() if p.is_dir())
    out = REPO / "build" / "mhwi-nack.zip"
    out.parent.mkdir(exist_ok=True)
    example = ""
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for key in keys:
            compact, full = REPO / "data" / key, decompile(key, full=True)
            bad = compare(compact, full)
            if bad:
                sys.exit(f"{key}: 完整输出与 data/ 不一致：{[str(b) for b in bad]}")
            for p in sorted(full.rglob("*")):
                if p.is_file():
                    z.writestr(f"{key}/{p.relative_to(full).as_posix()}", p.read_bytes())
            rows = mapping(compact, full)
            if not example:
                r = next((r for r in rows if r[1].startswith("node_") and int(r[1][5:]) != int(r[2])), None)
                if r:
                    example = f"{key} 的 {r[0]} 网页 {r[1]} = 本包 node_{int(r[2]):03d}"
            buf = io.StringIO()
            w = csv.writer(buf, lineterminator="\r\n")
            w.writerow(["文件", "网页编号", "原始序号", "节点id"])
            w.writerows(rows)
            z.writestr(f"{key}/编号对照.csv", buf.getvalue().encode("utf-8-sig"))
            print(f"{key}: {sum(1 for _ in full.rglob('*.nack'))} 个 nack，"
                  f"{sum(1 for r in rows if not r[1].startswith('node_'))} 个空节点，校验通过")
        monsters = "\n".join(f"  {k}/  {NAMES.get(k, '')}".rstrip() for k in keys)
        text = README.format(monsters=monsters, example=example)
        z.writestr("README.txt", text.replace("\n", "\r\n").encode("utf-8-sig"))
    print(f"已打包到 {out}")


if __name__ == "__main__":
    main()
