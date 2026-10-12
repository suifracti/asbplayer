# AGENTS.md · 外语学习系统 / asbplayer 接手路由（2026-10-12）

> **本仓库维护 asbplayer 代码与历史构建证据，不维护当前跨工具项目规划。** 外语学习系统原称英语学习系统。

## 新 AI 接手步骤

1. 有 Obsidian MCP 时先读取 Vault 根 `AGENTS.md`。
2. 当前项目入口：`03-项目与工程/外语学习系统/README.md`；现行决定：同目录 `Decisions.md`；最新交接和验收：同目录 `Handoff.md`；Google Drive 文件/证据：同目录 `资料与来源.md`。
3. 依 Handoff 中实际任务再读 asbplayer 本机工作树、版本/dirty、字幕轨道来源与原始时间、当前 Chrome 扩展实际加载状态；仓库 main、2026-10-08 README/release 不等于日常版。
4. 无法读取 Vault 时必须声明最新交接不可核实，请用户或有权限协作者提供；**不能拿 Yomitan 仓库旧 ENGLISH_LEARNING_PLAN.md 或旧 Issue #1 代替当前决定**。

## 已定边界

- Chrome/asbplayer 继续提供实际网页字幕输入，IINA 保留现有适配；薄 Electron 伴学 App 复用现有词典/学习服务/保存/恢复，不重造播放器或独立制卡管线。
- 自动字幕的来源、轨道、语言、时间、回源需按既有可信契约核实，合成/安装/构建通过不等于真实网站 PASS。普通手动文本必须明确标注来源，不伪称网站可信轨道。
- 项目决定/交接在 Obsidian；报告、HTML、补丁与包放 [Google Drive 原文件夹](https://drive.google.com/drive/folders/1yj5UZvKGsyrgHpmdNRoEv3ixyK-hG-kZ)；代码在现有 fork 与本机实际工作树。
- 原 [历史规划](https://github.com/suifracti/yomitan/blob/main/ENGLISH_LEARNING_PLAN.md) 和 [历史 Issue #1](https://github.com/suifracti/yomitan/issues/1) 仅供追溯；不据旧任务自动派工、扩大模型预算、制卡或重新加载 IINA 全部插件。
- 默认不开 PR，不推送/发布未经当前用户授权的代码。保留旧数据、Anki 卡片和排程，同一工作树只允许一个写入者。

本次路由文字不宣称新桌面 App 或 R1/R2/R3 已普遍实机通过。
