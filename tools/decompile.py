# -*- coding: utf-8 -*-
"""
调用 Leviathon (third_party/Leviathon) 把怪物的 thklst/thk 反编译为 .fand/.nack。

  python tools/decompile.py em013_00          # 默认读 extracted/em/em013/00/data/em013.thklst
  python tools/decompile.py em023_05

输出到 data/<em###_##>/。依赖见 requirements.txt（注意 sly 必须是 0.4）。
"""
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
LEVIATHON = REPO / "third_party" / "Leviathon"


def main():
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8")
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    key = sys.argv[1]                       # em013_00
    em, variant = key.split("_")
    thklst = REPO / "extracted" / "em" / em / variant / "data" / f"{em}.thklst"
    if not thklst.exists():
        sys.exit(f"找不到 {thklst}，先运行: python tools/mhw_chunk.py extract \"em/{em}/{variant}/data/\"")
    out = REPO / "data" / key
    out.mkdir(parents=True, exist_ok=True)
    subprocess.run([sys.executable, "-W", "ignore", "decompilerMain.py", str(thklst),
                    "-outputPath", str(out), "-indexShow"], cwd=LEVIATHON, check=True)
    # fand 首行是本机绝对路径，换成仓库相对路径
    for fand in out.glob("*.fand"):
        lines = fand.read_text(encoding="utf-8").splitlines()
        if lines and lines[0].startswith("at "):
            lines[0] = "at extracted"
        fand.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"已输出到 {out}")


if __name__ == "__main__":
    main()
