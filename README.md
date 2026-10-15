# asbplayer 中文学习定制版

> **跨工具外语学习系统当前接手：先读 [AGENTS.md](AGENTS.md)，再通过 Obsidian MCP 读取 Vault `03-项目与工程/外语学习系统/README.md` → `Decisions.md` → `Handoff.md`。** GitHub 的 [旧 ENGLISH_LEARNING_PLAN](https://github.com/suifracti/yomitan/blob/main/ENGLISH_LEARNING_PLAN.md) 与 [旧协调 Issue #1](https://github.com/suifracti/yomitan/issues/1) 只供追溯，不是现行规划和派工。附件仍放 [Google Drive 原文件夹](https://drive.google.com/drive/folders/1yj5UZvKGsyrgHpmdNRoEv3ixyK-hG-kZ)。
>
> **以下为 2026-10-08 zh-study7 发布包的历史说明**。不能把此页声称的当时版本、安装步骤或验收状态当作当前日常 Chrome 的实际结果；新 App 也未因修改此 README 而完成交付。

仅维护 [suifracti/asbplayer](https://github.com/suifracti/asbplayer)，不向官方仓库推送或提 PR。

## 2026-10-15 源码同步（非发布）

只使用本仓库 `main`，不新开分支或 PR。此次补回既有本机 API 字幕采集、双扩展可信 cue 交接、换源/时间处理及精简字幕工具的源码与定向测试；独立 App 已停止。与 Yomitan 的来源协议配套，但不把替身/合成测试当作真实网站已通过，也不要求因本次源码同步重载、重装或写学习数据。

## 2026-10-08 历史发布包下载与加载

历史本机记录（2026-10-09）：**study17 / asbplayer1.22.2 + Yomitan26.10.9.8**，加载目录 `本机固定的扩展加载目录`，Downloads包 `english-study-extensions-2026-10-09-study17.zip`。本轮asbplayer代码不变；已安装者仅重载Yomitan并刷新网页，不卸载清数据。本轮未推送/发布；[Releases study7](https://github.com/suifracti/asbplayer/releases/tag/v2026.10.08-zh-study7) 是此前公开版，不是此次本机改动。Code下载是待构建源码。

新安装已预设中文界面、AnkiConnect `127.0.0.1:8766`、牌组 `外语::英语语境`、笔记类型 `外语语境卡` 和七个字段；不会迁移或覆盖旧扩展数据。Yomitan 随包提供增强 ECDICT 英语学习词典，首次入门/设置页会自动导入，请等待提示就绪。Chrome 首次加载/授权须人工确认。Anki Desktop 必须运行且安装 AnkiConnect；此包不自动改任意机器的 Anki 数据库。

## 2026-10-08 历史发布包使用方法

- 文章/字幕：按住 **Shift** 悬停查词；中文释义由内置 ECDICT 提供。
- 视频：asbplayer 使用平台可检测字幕，或拖入自己的 SRT/VTT；不保证任意网站字幕自动可读。
- 视频学习：载入整轨字幕，明确开始AI翻译及Obsidian记录；词句用Yomitan保存学习过程，可选采集对应字幕片段，学完审核后制卡。原生“更新上一张卡”不适用于延迟批量制卡，不推荐在这条链路使用。
- **高级词汇状态标色依赖额外 yomitan-api 本机组件，当前包不启用。** 已预设 Word 字段和目标牌组，但不把配置称为已完成 Anki 复习回流。21 天等“成熟”阈值是软件规则，不是真实掌握。

## 历史本机功能记录（study14–study16）

主按钮负责整轨翻译/暂停；保存成功再显示打开Obsidian。轨道/语言、下载、补交和记住自动设置放次要区域，状态/取消可见。已有60请求/确认上限、日记真实事件、缓存与补交规则不改，不自动制卡。

字幕文字节点提供偏移后的有限时间属性给Yomitan，调偏移重建缓存。它不是整句识别或跨站采集保证；Yomitan仍验证当前来源/唯一视频/token，媒体默认不选。study16只升级共用桥的学习库/草稿模块；asbplayer运行代码、字幕协议、扩展身份和权限未改。Yomitan选中记录→持久草稿→明确目标提交已实施，详见配套Yomitan说明；视频整体真人验收仍待进行。

25项相关Jest、类型/lint与Chrome构建通过；本人网站/全屏/实际模型翻译与制卡质量待验。没有真实模型请求、学习卡或伪造观看记录。英文默认，日语预备不自动开始；复习状态回流尚未实现。详细执行/边界见 `docs/personal-build.md`。

## 更新与边界

独立公开扩展 key 固定本地版本 ID，与商店版分开；升级复用同一目录和同一 key，不再生成新 key。运行 `tools/check-upstream.sh` 只拉取并查看更新，不自动合并、推送或提交官方 PR。两个自有 fork 均只保留 `main`。后续官方更新适配到自己的 `main`，检查文案键、模板变量、权限与构建后再发布；不创建长期适配/备份分支。

验证记录与构建说明见 `docs/personal-build.md`。构建及静态检查不等于真实浏览器加载、词典首次导入或视频/制卡运行验收。


## 维护与许可证

README 随每次发布更新下载入口、当前功能和未验证项，不保留并列“最终版”。临时计划已完成并移除，必要维护与验收说明集中于 `docs/personal-build.md`。

本项目基于 [asbplayer/asbplayer](https://github.com/asbplayer/asbplayer)，感谢原作者及所有贡献者；原版权声明和 [许可证](LICENSE) 保持不变。定制代码继续遵守 AGPL-3.0。2026-10-07 修改包括中文显示层、英语制卡默认配置和独立扩展标识，不代表官方发布。完整对应源码可通过本仓库提交历史与 Release 源码下载获得。
