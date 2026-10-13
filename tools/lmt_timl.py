# -*- coding: utf-8 -*-
"""
读取 MHW 动画文件 .lmt 里每个动画的时间轴参数（TIML），按「参数类 / 字段」列出关键帧。

结构取自 AsteriskAmpersand/MHW-Free-HyperKinetics（struct/Lmt.py、struct/TIML.py）：
  LMT 头 16 字节 + 每个动画一个 u64 偏移；动画头 96 字节，最后 8 字节是 TIML 偏移；
  TIML 数据 → 参数类（类哈希）→ 字段（字段哈希, 数据类型）→ 关键帧（值, 控制点, 帧, 过渡）。
偏移都是相对 .lmt 文件开头的绝对偏移。类哈希 = DTI 名的 CRC32 & 0x7FFFFFFF 之类的变体，
本工具只按数值输出，名字由调用方对照（nTimelineParam::EmMotionCommon 的 mFlag = 字段 0..7）。

  python tools/lmt_timl.py <file.lmt> [类哈希(16进制)]
"""
import struct
import sys

ACTION_HEADER = 96


def u64(d, o): return struct.unpack_from("<Q", d, o)[0]
def u32(d, o): return struct.unpack_from("<I", d, o)[0]


def parse(path):
    d = open(path, "rb").read()
    if d[:4] != b"LMT\x00":
        raise ValueError("不是 LMT")
    n = struct.unpack_from("<H", d, 6)[0]
    out = []
    for i in range(n):
        off = u64(d, 16 + 8 * i)
        if not off:
            out.append(None)
            continue
        frames = u32(d, off + 12)
        timl = u64(d, off + ACTION_HEADER - 8)
        types = []
        if timl:
            toff, tcnt = u64(d, timl), u64(d, timl + 8)
            for t in range(tcnt):
                a = toff + 24 * t
                foff, fcnt, thash = u64(d, a), u64(d, a + 8), u32(d, a + 16)
                fields = []
                for f in range(fcnt):
                    b = foff + 24 * f
                    koff, kcnt, fhash, ftype = u64(d, b), u64(d, b + 8), u32(d, b + 16), struct.unpack_from("<i", d, b + 20)[0]
                    keys = []
                    for k in range(kcnt):
                        c = koff + 20 * k
                        val = struct.unpack_from("<f" if ftype == 2 else "<I", d, c)[0]
                        frame = struct.unpack_from("<f", d, c + 12)[0]
                        keys.append((frame, val))
                    fields.append((fhash, ftype, keys))
                types.append((thash, fields))
        out.append({"frames": frames, "types": types})
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    anims = parse(sys.argv[1])
    want = int(sys.argv[2], 16) if len(sys.argv) > 2 else None
    for i, a in enumerate(anims):
        if not a:
            continue
        for thash, fields in a["types"]:
            if want is not None and thash != want:
                continue
            for fhash, ftype, keys in fields:
                ks = " ".join(f"{fr:g}:{v:#x}" if ftype != 2 else f"{fr:g}:{v:g}" for fr, v in keys)
                print(f"{i:4d} 帧{a['frames']:4d} 类 {thash:08x} 字段 {fhash:08x} 类型{ftype} {ks}")


if __name__ == "__main__":
    main()
