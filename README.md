# asbplayer 中文学习定制版

仅维护 [suifracti/asbplayer](https://github.com/suifracti/asbplayer)，不向官方仓库推送或提 PR。

## 下载与加载

请从本仓库 **[Releases](https://github.com/suifracti/asbplayer/releases/tag/v2026.10.08-zh-study6)** 下载预构建安装包，不用 Code → Download ZIP（那是需构建的源码）。
两扩展统一包发布于 [asbplayer Releases](https://github.com/suifracti/asbplayer/releases/tag/v2026.10.08-zh-study6)。解压到固定目录，在 Chrome 扩展页启用开发者模式，分别“加载已解压的扩展”选择 `yomitan`、`asbplayer` 文件夹。不要同时启用商店原版，避免重复扫描或录音。

新安装已预设中文界面、AnkiConnect `127.0.0.1:8766`、牌组 `外语::英语语境`、笔记类型 `外语语境卡` 和七个字段；不会迁移或覆盖旧扩展数据。Yomitan 随包提供增强 ECDICT 英语学习词典，首次入门/设置页会自动导入，请等待提示就绪。Chrome 首次加载/授权须人工确认。Anki Desktop 必须运行且安装 AnkiConnect；此包不自动改任意机器的 Anki 数据库。

## 使用

- 文章/字幕：按住 **Shift** 悬停查词；中文释义由内置 ECDICT 提供。
- 视频：asbplayer 使用平台可检测字幕，或拖入自己的 SRT/VTT；不保证任意网站字幕自动可读。
- 视频语境制卡：使用 asbplayer 的制卡入口，或在 Yomitan 加词后用 asbplayer 更新上一张卡片补入音频/截图。普通查词制卡无需额外服务。
- **高级词汇状态标色依赖额外 yomitan-api 本机组件，当前包不启用。** 已预设 Word 字段和目标牌组，但不把配置称为已完成 Anki 复习回流。21 天等“成熟”阈值是软件规则，不是真实掌握。

## 当前配套版本：zh-study6

统一包搭配 Yomitan 的短查词卡、保持打开的固定详解和缓存英英辅助中文。当前实现与验证只维护于 [Yomitan 说明](https://github.com/suifracti/yomitan/blob/main/docs/personal-build.md)，本仓库不复制另一份 UI 状态。

**asbplayer 1.22.0 运行代码、key/ID/权限与 zh-study2 构建均未改**，已经安装者只重载 Yomitan、刷新网页，无需重载或重新配置播放器。仍不宣称新版 Chrome、真实视频字幕/截音/制卡/复习回流已验收。Obsidian→Anki 完整保存路线尚未实现，收藏不是完整闭环。

## 更新与边界

独立公开扩展 key 固定本地版本 ID，与商店版分开；升级复用同一目录和同一 key，不再生成新 key。运行 `tools/check-upstream.sh` 只拉取并查看更新，不自动合并、推送或提交官方 PR。两个自有 fork 均只保留 `main`。后续官方更新适配到自己的 `main`，检查文案键、模板变量、权限与构建后再发布；不创建长期适配/备份分支。

验证记录与构建说明见 `docs/personal-build.md`。构建及静态检查不等于真实浏览器加载、词典首次导入或视频/制卡运行验收。


## 维护与许可证

README 随每次发布更新下载入口、当前功能和未验证项，不保留并列“最终版”。临时计划已完成并移除，必要维护与验收说明集中于 `docs/personal-build.md`。

本项目基于 [asbplayer/asbplayer](https://github.com/asbplayer/asbplayer)，感谢原作者及所有贡献者；原版权声明和 [许可证](LICENSE) 保持不变。定制代码继续遵守 AGPL-3.0。2026-10-07 修改包括中文显示层、英语制卡默认配置和独立扩展标识，不代表官方发布。完整对应源码可通过本仓库提交历史与 Release 源码下载获得。
