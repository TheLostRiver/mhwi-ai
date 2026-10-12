# MHWI 怪物 AI 解析

《怪物猎人世界：冰原》怪物 AI（THK 文件）的解包、反编译与分析。结果以交互网页 + Markdown 文档两种形式提供。

| 怪物 | 状态 | 文档 |
|---|---|---|
| 黑龙 Fatalis（em013_00） | ✅ 已完成 | [docs/em013-fatalis.md](docs/em013-fatalis.md) |
| 历战王冰咒龙 Arch-Tempered Velkhana（em124_00） | 计划中 | |
| 激昂金狮子 Furious Rajang（em023_05） | 计划中 | |
| 雷狼龙 Zinogre（em057_00） | 计划中 | |

## 网页

**在线访问：<https://mhwi.helsincy.com>**

本地使用：直接用浏览器打开 `web/index.html`（纯静态，无需服务器、无需构建）。

- **概览**：一轮决策的完整流程、阶段血线、计数器、关键结论
- **出招模拟**：在俯视罗盘上点选/拖动猎人站位，设定阶段、姿态、愤怒、HP、计数器与各种条件 → 精确出招概率（含连段）与完整决策路径；扇区热力图显示某招在各位置的出现概率；状态编码在 URL 里，可直接分享
- **THK 代码**：反编译后的代码，逐行中文释义、调用跳转、被调用/调用/寄存器交叉引用
- **招式表**：官方内部动作名、逐词直译与社区俗称
- **资料对照**：社区资料中的说法逐条与代码比对

快捷键：`/` 或 `Ctrl+K` 打开怪物图鉴。

## 工作流程

```bash
# 0. 依赖：Python 3.10+（64 位）、Node.js 18+；把 oo2core_8_win64.dll 放到仓库根目录
git clone --recursive https://github.com/TheLostRiver/mhwi-ai.git
pip install -r requirements.txt          # Leviathon 依赖（sly 必须是 0.4）

# 1. 解包（命令行版 MHWNoChunk）
python tools/mhw_chunk.py index --game "D:/Steam/steamapps/common/Monster Hunter World"
python tools/mhw_chunk.py list    "em/em013/.*\.thk$"
python tools/mhw_chunk.py extract "em/em013/00/data/"

# 2. 反编译（third_party/Leviathon）→ data/em013_00/*.nack
python tools/decompile.py em013_00

# 3. 结构化 → web/data/em013_00.js，并校验
python tools/nack2json.py em013_00
node scripts/check.js em013_00

# 4. 分析
node scripts/sim.js em013_00 phase=1 stance=l2 dist=1500 angle=0
node scripts/report.js em013_00 docs/em013-fatalis.md
```

## 部署

网站部署在 Cloudflare Workers（静态资源 + 自定义域名 `mhwi.helsincy.com`，配置见 `wrangler.jsonc`）：

```bash
npx wrangler deploy        # 上传 web/ 目录；DNS 记录与证书由 Cloudflare 自动管理
```

修改 `web/` 下的 CSS/JS/数据后，把 `web/index.html` 里所有 `?v=` 版本号加一，避免浏览器使用旧缓存。

新增一只怪物：完成 1~3 步，再写 `web/data/<key>.anno.js`（中文注释：动作、条件、寄存器、节点）与 `web/data/<key>.notes.js`（概览与资料对照），最后在 `web/data/monsters.js` 里把状态改为 `ready`。

## 目录

```
tools/        解包（mhw_chunk.py）、反编译包装（decompile.py）、nack → JSON（nack2json.py）
scripts/      Node 端：往返校验、出招概率命令行、文档概率表生成
data/<key>/   Leviathon 反编译结果（.fand / .nack）
web/          交互网页；web/js/thk-core.js 是 THK 解释器（网页与脚本共用）
docs/         分析文档
third_party/  Leviathon（git submodule，GPLv3）
```

## 致谢

- 解包逻辑移植自 [JodoZT/MHWNoChunk](https://github.com/JodoZT/MHWNoChunk) 与 [mhvuze/WorldChunkTool](https://github.com/mhvuze/WorldChunkTool)
- THK 反编译：[AsteriskAmpersand/Leviathon](https://github.com/AsteriskAmpersand/Leviathon)，语言规范见 [MonsterHunterWorldModding Wiki](https://github.com/Ezekial711/MonsterHunterWorldModding/wiki/Leviathon-Language-Reference)
- 黑龙社区资料：`黑龙THK注释.xlsx`、九世深渊《[黑龙AI重构的最后一块拼图](https://www.bilibili.com/opus/932887546921222162)》《[黑龙开局不扇火的秘密](https://www.bilibili.com/opus/930951641929089095)》

游戏数据版权归 CAPCOM 所有。本项目仅用于研究与学习。
