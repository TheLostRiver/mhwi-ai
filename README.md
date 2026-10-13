# MHWI 怪物 AI 解析

《怪物猎人世界：冰原》怪物 AI（THK 文件）的解包、反编译与分析。结果以交互网页 + Markdown 文档两种形式提供。

| 怪物 | 状态 | 文档 |
|---|---|---|
| 黑龙 Fatalis（em013_00） | ✅ 已完成 | [docs/em013-fatalis.md](docs/em013-fatalis.md) |
| 激昂金狮子 Furious Rajang（em023_05） | ✅ 已完成 | [docs/em023-furious-rajang.md](docs/em023-furious-rajang.md) |
| 历战王冰呪龙 Arch-Tempered Velkhana（em124_00） | ✅ 已完成 | [docs/em124-at-velkhana.md](docs/em124-at-velkhana.md) |
| 雷狼龙 Zinogre（em057_00） | ✅ 已完成 | [docs/em057-zinogre.md](docs/em057-zinogre.md) |
| 煌黑龙 Alatreon（em050_00） | ✅ 已完成 | [docs/em050-alatreon.md](docs/em050-alatreon.md) |

## 网页

**在线访问：<https://mhwi.helsincy.com>**

本地使用：直接用浏览器打开 `web/index.html`（纯静态，无需服务器、无需构建）。

- **概览**：一轮决策的完整流程、阶段血线、计数器、关键结论
- **出招模拟**：在俯视罗盘上点选/拖动猎人站位，设定阶段/姿态/形态、HP、计数器与各种条件 → 精确出招概率（含连段）与完整决策路径；扇区热力图显示某招在各位置的出现概率；状态编码在 URL 里，可直接分享
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

# 亚种：thklst 会混用 05 与 00 目录的 THK，两个目录都要解包
python tools/mhw_chunk.py extract "em/em023/0[05]/data/"
python tools/decompile.py em023_05 && python tools/nack2json.py em023_05 && node scripts/check.js em023_05
node scripts/sim.js em023_05 enraged=1 pump=1 dist=400 angle=90

# 动作参数（.actp2）：按 Leviathon ActionDumps 的内部编号还原动作名，读取指定字段（如雷狼龙的电量增减）
python tools/actp2.py extracted/em/em057/00/data/em057.actp2 94 mIncBarrierValue mDecBarrierValue

# 打包 nack 给别人分析（保留空节点、编号 = 游戏原始序号）→ build/mhwi-nack.zip
python tools/pack_nack.py
```

### 节点编号：网页编号 ≠ 游戏原始序号

Leviathon 默认会**丢掉空节点**（节点 id 为 0、只有一个全空段），剩下的节点从 0 起**连续重新编号**。`data/` 里的 nack 就是这样生成的（只加了 `-indexShow`），所以：

- 网页、文档、`anno.js` / `notes.js` 里的 `node_NNN` 是重编后的号，**和游戏日志里的节点序号对不上**；
- 节点头 `def node_NNN @ M` 里的 `M` 才是该节点在 THK 文件里的原始序号。例：煌黑龙 `em050_55` 的网页 `node_198 @ 224`，原始序号是 224。

要和日志对照、或把 nack 给别人分析时，用完整输出：`python tools/decompile.py <key> --full`（加 `-nullShow -indexShow -idShow`，输出到 `build/nack_full/<key>/`），节点头为 `def node_NNN : <节点id> @ <原始序号>`，`NNN` 等于原始序号。`tools/pack_nack.py` 会对每只怪物生成完整输出，逐文件校验它与 `data/` 除编号和空节点外逐行一致，并附上 `编号对照.csv`（网页编号 ↔ 原始序号 ↔ 节点 id）。

`data/` 不改成完整编号：网页注释与文档里的所有节点引用都基于默认编号。

## 部署

网站部署在 Cloudflare Workers（静态资源 + 自定义域名 `mhwi.helsincy.com`，配置见 `wrangler.jsonc`）：

```bash
npx wrangler deploy        # 上传 web/ 目录；DNS 记录与证书由 Cloudflare 自动管理
```

修改 `web/` 下的 CSS/JS/数据后，把 `web/index.html` 里所有 `?v=` 版本号加一，避免浏览器使用旧缓存。

新增一只怪物：完成 1~3 步，再写 `web/data/<key>.anno.js`（中文注释：动作、条件、寄存器、节点；模拟器的状态控件 `state.controls`、罗盘轮廓 `silhouette`、动作对站位的影响 `effect`）与 `web/data/<key>.notes.js`（概览与资料对照），在 `scripts/report.js` 的 `REPORTS` 里加上概率表配置，最后在 `web/data/monsters.js` 里把状态改为 `ready`。

## 目录

```
tools/        解包（mhw_chunk.py）、反编译包装（decompile.py）、nack → JSON（nack2json.py）、动作参数读取（actp2.py）、nack 打包（pack_nack.py）
scripts/      Node 端：往返校验、出招概率命令行、文档概率表生成
data/<key>/   Leviathon 反编译结果（.fand / .nack，默认编号，见「节点编号」）
build/        打包输出（不入库）
web/          交互网页；web/js/thk-core.js 是 THK 解释器（网页与脚本共用）
docs/         分析文档
third_party/  Leviathon（git submodule，GPLv3）
```

## 致谢

- 解包逻辑移植自 [JodoZT/MHWNoChunk](https://github.com/JodoZT/MHWNoChunk) 与 [mhvuze/WorldChunkTool](https://github.com/mhvuze/WorldChunkTool)
- THK 反编译：[AsteriskAmpersand/Leviathon](https://github.com/AsteriskAmpersand/Leviathon)，语言规范见 [MonsterHunterWorldModding Wiki](https://github.com/Ezekial711/MonsterHunterWorldModding/wiki/Leviathon-Language-Reference)
- 黑龙社区资料：`黑龙THK注释.xlsx`、九世深渊《[黑龙AI重构的最后一块拼图](https://www.bilibili.com/opus/932887546921222162)》《[黑龙开局不扇火的秘密](https://www.bilibili.com/opus/930951641929089095)》
- 历战王冰呪龙社区资料：`王冰THK注释.xlsx`、九世深渊《[雪花沉睡 历战王冰呪龙战斗AI全解析](https://www.bilibili.com/opus/953519534698921990)》
- 煌黑龙资料：noderoo《[Alatreon AI Observations](https://rentry.co/p8bhu2hx)》、游民星空 雨酱《[煌黑龙招式拆解及打法详解](https://www.gamersky.com/handbook/202007/1306235.shtml)》与 Mr独行远方《[煌黑龙起飞机制探究](https://www.gamersky.com/handbook/202008/1316011.shtml)》、巴哈姆特 肆伍陸《[煌黑龍攻略情報彙整](https://forum.gamer.com.tw/C.php?bsn=5786&snA=157377)》
- 雷狼龙资料：腾讯新闻 爱游戏的Solay《[雷狼龙超带电机制与连段解析](https://news.qq.com/rain/a/20200722A0WSR400)》、游民星空 SweetPotatoH「[超带电状态](https://www.gamersky.com/handbook/202005/1288897.shtml)」
- 激昂金狮子资料：HK01、游民星空的攻略与 [Monster Hunter Wiki](https://monsterhunterwiki.org/wiki/Furious_Rajang_(MHWI))（见文档「与社区资料的对照」）
- exe 类名：[Andoryuuta/MHW-DTI-Dumps](https://github.com/Andoryuuta/MHW-DTI-Dumps)

游戏数据版权归 CAPCOM 所有。本项目仅用于研究与学习。
