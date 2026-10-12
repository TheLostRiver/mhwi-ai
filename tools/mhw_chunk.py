# -*- coding: utf-8 -*-
"""
MHW:I chunkG*.bin 命令行解包工具。

移植自 MHWNoChunk (https://github.com/JodoZT/MHWNoChunk) 与
WorldChunkTool by MHVuze (https://github.com/mhvuze/WorldChunkTool) 的解包逻辑：
  - chunk 文件由若干 0x40000 字节的子块组成，每块 Oodle 压缩 + 16 字节循环 XOR 加密
  - 所有子块解密后顺序拼接即为一个 PKG 虚拟流，文件表位于流开头
  - 多个 chunkGN.bin 按 N 升序合并，编号大的覆盖编号小的同名文件

依赖：oo2core_8_win64.dll（放在仓库根目录或 tools/ 目录，或通过 --oodle 指定）。

用法:
  python tools/mhw_chunk.py index  --game "D:/.../Monster Hunter World"
  python tools/mhw_chunk.py list    "em/em013/.*\\.thk$"
  python tools/mhw_chunk.py extract "em/em013/00/data/" --out extracted
正则匹配的是以 / 分隔的路径，例如 /em/em013/00/data/em013.thklst
"""
import argparse
import ctypes
import json
import re
import struct
import sys
from collections import OrderedDict
from pathlib import Path

MAGIC_CHUNK = 0x00504D43
SUBCHUNK_SIZE = 0x40000

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
DEFAULT_GAME = r"D:\Software\Steam\steamapps\common\Monster Hunter World"
DEFAULT_INDEX = REPO / "extracted" / "chunk_index.json"

# 16 组 XOR 密钥，顺序与 WorldChunkTool / MHWNoChunk 一致
CHUNK_KEYS = [bytes.fromhex(h) for h in (
    "ac76cb97ec7500133a81038e7a82c80a",
    "6bb5c956e44d00bc305233cfbfaafa25",
    "8f021dccb0f2787206fbdee2390bbb5c",
    "da5c1e531d8359157875bd63bfaafa25",
    "1f6d31c883dd716d7e8f598ce23f1929",
    "4bb0de04e4e0856980ccb2942f9ce9f9",
    "8bce54dc4c11139a7875bd63bfaafa25",
    "ec13345966ce7312440089a2ceddcee9",
    "e4662c709c753a039a2c0f5ae23f1929",
    "a492fc9033949c15a033ac223735cca7",
    "25099c1f911a26e5ce9172f07a82c80a",
    "d1d29d7446d4fdf1a033ac223735cca7",
    "7eb268373b5d361ed6d313e2933c4dcb",
    "a1c7d2ea661895ac7875bd63bfaafa25",
    "82a43b2108797c6a440089a2ceddcee9",
    "41d055b3dd6015167e8f598ce23f1929",
)]


def _load_key_pattern():
    data = (HERE / "chunk.key").read_bytes()
    start, end = struct.unpack_from("<ii", data, 0)
    # 原实现: chunkKeyPattern[i - 1] = byte, i ∈ [start, end]
    return data[8:8 + (end - start + 1)], start - 1


KEY_PATTERN, KEY_BASE = _load_key_pattern()


def chunk_key(index):
    pos = KEY_PATTERN[index - KEY_BASE]
    return CHUNK_KEYS[pos if pos <= 0xF else 0]


def _xor_tables():
    """预计算每把密钥重复到 0x40000 字节的 int，用大整数异或代替逐字节循环。"""
    tables = []
    for key in CHUNK_KEYS:
        tables.append(int.from_bytes(key * (SUBCHUNK_SIZE // 16), "little"))
    return tables


_XOR_TABLES = None


def decrypt(data, index):
    global _XOR_TABLES
    if _XOR_TABLES is None:
        _XOR_TABLES = _xor_tables()
    pos = KEY_PATTERN[index - KEY_BASE]
    table = _XOR_TABLES[pos if pos <= 0xF else 0]
    n = len(data)
    if n != SUBCHUNK_SIZE:
        table &= (1 << (8 * n)) - 1
    return (int.from_bytes(data, "little") ^ table).to_bytes(n, "little")


class Oodle:
    def __init__(self, path=None):
        candidates = [path] if path else [REPO / "oo2core_8_win64.dll", HERE / "oo2core_8_win64.dll"]
        for cand in candidates:
            if cand and Path(cand).exists():
                self.lib = ctypes.CDLL(str(cand))
                break
        else:
            sys.exit("找不到 oo2core_8_win64.dll，请放到仓库根目录或用 --oodle 指定")
        fn = self.lib.OodleLZ_Decompress
        fn.restype = ctypes.c_int
        fn.argtypes = [ctypes.c_char_p, ctypes.c_longlong, ctypes.c_char_p, ctypes.c_longlong] + [ctypes.c_uint] * 3 + [ctypes.c_ulonglong] + [ctypes.c_uint] * 6
        self.fn = fn

    def decompress(self, src, out_size):
        out = ctypes.create_string_buffer(out_size)
        n = self.fn(src, len(src), out, out_size, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3)
        if n <= 0 or n > out_size:
            raise IOError("Oodle 解压失败")
        return out.raw[:n]


class ChunkFile:
    """单个 chunkGN.bin：子块表 + 按虚拟偏移读取。"""

    def __init__(self, path, oodle, cache_size=64):
        self.path = Path(path)
        self.oodle = oodle
        self.fh = open(self.path, "rb")
        magic, count = struct.unpack("<II", self.fh.read(8))
        if magic != MAGIC_CHUNK:
            raise ValueError(f"{self.path.name} 不是 chunk 文件")
        meta = self.fh.read(8 * count)
        self.entries = []
        for i in range(count):
            raw = bytearray(meta[i * 8:i * 8 + 3])
            raw[0] >>= 4
            size = int.from_bytes(raw, "little")
            size = (size >> 4) + (size & 0xF)
            offset = int.from_bytes(meta[i * 8 + 3:i * 8 + 8], "little")
            self.entries.append((offset, size))
        self.cache = OrderedDict()
        self.cache_size = cache_size

    def subchunk(self, index):
        hit = self.cache.get(index)
        if hit is not None:
            self.cache.move_to_end(index)
            return hit
        offset, size = self.entries[index]
        self.fh.seek(offset)
        if size == 0:
            data = self.fh.read(SUBCHUNK_SIZE)
        else:
            data = self.oodle.decompress(self.fh.read(size), SUBCHUNK_SIZE)
        data = decrypt(data, index)
        self.cache[index] = data
        if len(self.cache) > self.cache_size:
            self.cache.popitem(last=False)
        return data

    def read(self, offset, size):
        out = bytearray()
        while size > 0:
            idx, ptr = divmod(offset, SUBCHUNK_SIZE)
            block = self.subchunk(idx)
            take = min(size, len(block) - ptr)
            if take <= 0:
                raise IOError(f"读取越界 @0x{offset:X}")
            out += block[ptr:ptr + take]
            offset += take
            size -= take
        return bytes(out)

    def toc(self):
        """返回 {路径: (size, offset)}，路径用反斜杠，与游戏内一致。"""
        parent_count, child_total = struct.unpack("<ii", self.read(0x0C, 8))
        ptr = 0x100
        files = {}
        for _ in range(parent_count):
            # 父条目: name[0x3C] size:i64 offset:i64 type:i32 children:i32
            parent = self.read(ptr, 0x54)
            ptr += 0x54
            count_children = struct.unpack_from("<i", parent, 0x50)[0]
            body = self.read(ptr, 0xB8 * count_children)
            ptr += 0xB8 * count_children
            # 子条目: name[0xA0] size:i64 offset:i64 type:i32 unk:i32；type 2 的名字只有 0x50
            for j in range(count_children):
                e = body[j * 0xB8:(j + 1) * 0xB8]
                size, offset, etype = struct.unpack_from("<qqi", e, 0xA0)
                name_len = 0x50 if etype == 2 else 0xA0
                name = e[:name_len].split(b"\0", 1)[0].decode("ascii", "replace")
                if etype in (0, 2):
                    files[name] = (size, offset)
        return files


def chunk_paths(game):
    paths = list(Path(game, "chunk").glob("chunkG*.bin"))
    return sorted(paths, key=lambda p: int(re.sub(r"\D", "", p.stem)))


def build_index(game, oodle, index_path):
    merged = {}
    for path in chunk_paths(game):
        print(f"解析 {path.name} ...", flush=True)
        cf = ChunkFile(path, oodle)
        for name, (size, offset) in cf.toc().items():
            merged[name] = [path.name, size, offset]
        print(f"  累计 {len(merged)} 个文件", flush=True)
    index_path.parent.mkdir(parents=True, exist_ok=True)
    index_path.write_text(json.dumps({"game": str(game), "files": merged}, ensure_ascii=False), encoding="utf-8")
    print(f"索引已写入 {index_path}")
    return merged


def load_index(args, oodle):
    path = Path(args.index)
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))["files"]
    return build_index(args.game, oodle, path)


def main():
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="MHW:I chunk 解包 CLI")
    ap.add_argument("--game", default=DEFAULT_GAME, help="游戏根目录")
    ap.add_argument("--oodle", help="oo2core_8_win64.dll 路径")
    ap.add_argument("--index", default=str(DEFAULT_INDEX), help="合并文件表缓存")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("index", help="重建所有 chunk 的合并文件表")
    p_list = sub.add_parser("list", help="按正则列出文件")
    p_list.add_argument("pattern")
    p_ext = sub.add_parser("extract", help="按正则解包文件")
    p_ext.add_argument("pattern")
    p_ext.add_argument("--out", default=str(REPO / "extracted"))
    args = ap.parse_args()

    oodle = Oodle(args.oodle)
    if args.cmd == "index":
        build_index(args.game, oodle, Path(args.index))
        return

    files = load_index(args, oodle)
    rx = re.compile(args.pattern, re.IGNORECASE)
    hits = sorted(n for n in files if rx.search(n.replace("\\", "/")))
    if args.cmd == "list":
        for n in hits:
            chunk, size, _ = files[n]
            print(f"{size:>10}  {chunk:<14} {n}")
        print(f"共 {len(hits)} 个文件", file=sys.stderr)
        return

    opened = {}
    out_root = Path(args.out)
    for n in hits:
        chunk, size, offset = files[n]
        if chunk not in opened:
            opened[chunk] = ChunkFile(Path(args.game, "chunk", chunk), oodle)
        data = opened[chunk].read(offset, size)
        dst = out_root / n.lstrip("\\").replace("\\", "/")
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_bytes(data)
        print(f"{size:>10}  {n}")
    print(f"已解包 {len(hits)} 个文件到 {out_root}", file=sys.stderr)


if __name__ == "__main__":
    main()
