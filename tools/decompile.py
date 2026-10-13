# -*- coding: utf-8 -*-
"""
调用 Leviathon (third_party/Leviathon) 把怪物的 thklst/thk 反编译为 .fand/.nack。

  python tools/decompile.py em013_00          # 默认读 extracted/em/em013/00/data/em013.thklst
  python tools/decompile.py em023_05
  python tools/decompile.py em050_00 --full   # 保留空节点，输出到 build/nack_full/em050_00/

两种输出的节点编号不同：
  默认    → data/<key>/。Leviathon 会丢掉空节点（id 为 0、只有一个全空段），剩下的节点
            从 0 起连续重新编号；节点头的「@ N」才是 THK 里的原始序号。网页、文档、注释
            （anno/notes）里的 node_NNN 都是这套编号，不要改。
  --full  → build/nack_full/<key>/。加 -nullShow -indexShow -idShow：保留空节点，
            node_NNN 等于原始序号，节点头为「def node_NNN : <节点id> @ <原始序号>」，
            可以直接和游戏日志对照。tools/pack_nack.py 用它打包给别人分析。
除编号与空节点外两者内容逐行一致（pack_nack.py 打包时会校验）。

依赖见 requirements.txt（注意 sly 必须是 0.4）。
"""
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
LEVIATHON = REPO / "third_party" / "Leviathon"


def decompile(key, full=False):
    em, variant = key.split("_")
    thklst = REPO / "extracted" / "em" / em / variant / "data" / f"{em}.thklst"
    if not thklst.exists():
        sys.exit(f"找不到 {thklst}，先运行: python tools/mhw_chunk.py extract \"em/{em}/{variant}/data/\"")
    out = REPO / ("build/nack_full" if full else "data") / key
    out.mkdir(parents=True, exist_ok=True)
    flags = ["-nullShow", "-indexShow", "-idShow"] if full else ["-indexShow"]
    subprocess.run([sys.executable, "-W", "ignore", "decompilerMain.py", str(thklst),
                    "-outputPath", str(out), *flags], cwd=LEVIATHON, check=True)
    # fand 首行是本机绝对路径，换成仓库相对路径
    for fand in out.glob("*.fand"):
        lines = fand.read_text(encoding="utf-8").splitlines()
        if lines and lines[0].startswith("at "):
            lines[0] = "at extracted"
        fand.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return out


def main():
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8")
    args = [a for a in sys.argv[1:] if a != "--full"]
    if len(args) != 1:
        sys.exit(__doc__)
    print(f"已输出到 {decompile(args[0], full='--full' in sys.argv)}")


if __name__ == "__main__":
    main()
