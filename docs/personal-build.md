# 私人定制构建与验收（按历史构建批次保留）

> **历史构建与测试报告，不是外语学习系统当前任务入口。** 新 Agent 先读本仓库 [AGENTS.md](../AGENTS.md) → Obsidian `03-项目与工程/外语学习系统/Decisions.md` 与 `Handoff.md`。本文旧“当前”“下一步”仅对应原批次，不能凭此要求用户重载或宣称真实字幕验收通过。

## 范围
- asbplayer 中文显示层、无凭据的英语学习默认预设；只写自己的 fork。
- 早期显示层不改查词/播放器算法、Anki 调度、扩展权限；study11 经用户批准新增受限本机通信（见末节）；除预设与首次词典初始化外保留上游逻辑。
- 独立 public key 隔离商店版，私钥未保存/上传；此 key 不是任何账号凭据。

## 工具链
- 本机 Node 24.18.0。asbplayer 上游声明 Node 24.21.0/pnpm 11.27.0；本次使用 pnpm 11.27.0，Node 24.18.0 构建通过，但并非完全相同版本。
- Yomitan 使用 npm ci --ignore-scripts 与 npm run build:libs；asbplayer 使用冻结 pnpm lockfile。未自动升级依赖。

## 测试
- Yomitan：五项本地回归、上游 schema 验证及既有配置保留测试、修改文件 ESLint 与 TypeScript 检查。
- asbplayer：四项中文/字段预设检查、全语言键一致性与既有设置提供器 14 项回归。
- Anki：8766 只读 version=6；目标牌组与七字段已核对；两个新扩展 Origin 请求被当前接口接受。未新增测试学习卡片。
- Chromium 构建通过；最终文件与 SHA256 以 Release 的 BUILD-INFO.json 为准。

## 未实测
实际 Chrome 加载、首次 77 万词条导入、视频字幕检测、音频截取、真实制卡与复习回流。没有通过受限扩展页面自动化伪造验收。

## 上游安全边界
Yomitan npm 全依赖审计报告 52 项（含开发工具）；omit=dev 检查为 0 项。该审计不保证构建链/最终扩展无漏洞；不执行 audit fix --force 来掩盖风险。

## 更新
不自动定时更新；用户要求适配时先只读 fetch 官方更新，再在我们唯一的 `main` 审查合并与适配。不向官方写入；不保留额外长期分支。asbplayer 使用 localization/apply-overrides.py 重新应用翻译，遇到改名键或占位符变化即停止。 完成测试及构建后才发布到自己的 fork，不向官方提 PR。

README 每次发布可更新，保留原作者出处、许可证、修改说明与对应源码入口。仅清理本次完成的临时计划、重复介绍和自有 fork 的多余分支；不删除上游运行代码、测试或构建依赖。

维护提交使用 `suifracti@gmail.com`，两个本地仓库已设定 `user.email`；作者与提交者邮箱均须在提交前核对。官方历史作者不修改；2026-10-07 此设置之前已推送的定制提交尚保留旧邮箱，未擅自重写历史。

## zh-study2 首次加载修复

用户截图确认第一版扩展已加载，但 ECDICT 初始化失败、asbplayer 欢迎页为英文；之前的测试未覆盖实际打包词典索引与入门页语言启动。

- ECDICT 离线包移除 `isUpdatable:false`：官方 schema 按字段存在要求更新 URL，而不是按该字段真假；不修改 schema、不虚构自动更新地址。实际 ZIP 全部 768739 条记录通过 schema，官方导入器样本导入及释义查询通过。尚未在用户 Chrome 完成整个词库导入。
- 入门页从已保存的 `language` 读取语言，显式 URL lang 覆盖仍保留，Chrome 界面语言不再覆盖学习预设；页签标题和教程确认按钮补中文。
- 自定义中文优先使用打包资源，禁用只针对 zh_CN 的在线缓存更新；其他语言原缓存优先逻辑保留。以真实源码编译的隔离单元测试复现缓存覆盖并验证修复。
- 本次 Yomitan 8 组相关回归 67 项、Node 文案 5 项通过；asbplayer Python 文案/预设 7 项、生产语言缓存 3 项、既有设置 14 项通过。两源码类型检查通过。
- 本机 AnkiConnect 8766 再次只读确认模型七字段，不写入卡片。扩展权限与固定 key 不变；不操作 Chrome 用户配置、缓存或数据库。
- README 随修复发布更新，第一版已知故障包撤回。用户固定安装目录由构建产物更新，之后需要用户在 Chrome 扩展页手动重新加载两扩展。

## zh-study4 统一包维护

本轮 asbplayer 运行代码和权限未变，沿用 zh-study2 构建；仅更新 README 与统一下载入口。Yomitan 卡片/增强词典的实现、重建与适配边界集中于 [Yomitan 构建维护说明](https://github.com/suifracti/yomitan/blob/main/docs/personal-build.md)，不在本仓库维护另一份实现状态。仍不声明真实视频截音、制卡或复习回流验收。

统一 study4 包新增 Yomitan 精简查词与本机句子翻译组件；asbplayer 运行产物保持不变，未借此声明视频/制卡验收。桥的单一实现与测试说明见 [Yomitan 维护记录](https://github.com/suifracti/yomitan/blob/main/docs/personal-build.md)。


## zh-study6 统一包维护

仅更新配套下载/边界文档；asbplayer 运行代码与 1.22.0 原构建逐文件相同，没有重新构建或新播放器验收。统一包来源与当前 Yomitan UI、协议、离线验证集中于 [Yomitan 单一维护说明](https://github.com/suifracti/yomitan/blob/main/docs/personal-build.md)。两个自有 main 的推送已恢复；当前发布包 `v2026.10.08-zh-study6` 保留原许可/源码归属，无认证或个人学习数据。外语笔记/Anki 保存闭环仍未实施。

## study11 整轨翻译与视频记录（2026-10-09 用户批准“做吧”）

**Goal**：实际加载字幕后，一次启动整轨中文翻译，原译存 Obsidian，真实播放事件写日记引用。
**Architecture**：Binding 的成功字幕加载点接入独立 StudyVideoController；Chrome 后台只转发白名单 video 请求给已有本机桥。新增 study_video.py 负责受控素材目录、版本身份、逐行翻译缓存、并发锁、日记幂等追加；既有纯文本模型执行器只处理有界批次。不是另做阅读器，不改原字幕/卡片。
**Constraints**：主代理独立，在既有 main 工作树执行，不提交/推送。新增 asbplayer nativeMessaging 权限是连接本机桥所需；仅额外信任固定自有 asbplayer Origin，不能开放网页调用；asbplayer Origin 只能访问 video 动作。无真实模型/学习卡测试，不自动启用日语、不向 AI 发送媒体。翻译默认桥模型 gpt-6.1-sol/low，缓存含模型/强度/提示词版本/语言。完整字幕最高5000条/受限文本量，超限明示不裁剪。

- [x] Task 1 — 桥/归档：先新增 test_study_video.py，覆盖同视频不同轨/模型隔离、重复保存、行对齐/漏译拒绝、失败留原文、手写区保护、跨日事件、符号链接与路径/URL拒绝。新 study_video.py 提供 VideoLibrary.handle 与 translate_next；study_translator.py 归一化 video 请求、限制 Origin 并连接模型回调；install_bridge.py 安装模块和固定 Origin。
- [x] Task 2 — 整轨任务与前台：先新增 study-video.test.ts，测试暂停/失败后继续、完整行覆盖与存储恢复、换视频不串任务、重复加载无重复模型。新 study-video.ts 控制 opt-in、持久任务/事件 outbox、进度、全轨循环（每次最多60请求，达到额度后明确暂停）、语言/轨选择、译文下载/打开笔记。Binding 成功加载触发，解绑清理；事件只发送实际 play/pause 与位置，不推定完播。
- [x] Task 3 — 安全接入/验收：后台白名单与 nativeMessaging，追加 version 1.22.1；运行独立 Python/现有桥回归、针对性 Jest、TypeScript、修改文件 lint/build。临时 Vault 与替身模型验证，不启动真实模型。核对固定目录旧摘要后部署/打包，保留用户未知文件和旧包。同步唯一工程主源、日常记录入口与使用说明，单列实际站点/模型未验。

**测试命令**：`python3 -m unittest discover -s <Yomitan源码目录>/local-bridge -p 'test_study_video.py'`；在 asbplayer extension 运行 `pnpm test --runInBand study-video.test.ts` 与 `pnpm compile`；构建 `pnpm build`。针对性红→绿后再部署。
**素材目录**：`02-个人与生活/阅读与观影/观影/视频记录/`，每个视频主笔记，字幕版本为其真实子目录；日记沿用 `.obsidian/daily-notes.json` 的 `04-日记/YYYY/MM/YYYY-MM-DD`，原文与手写区保留，不记录虚构看完。

### study11 本机验证与交付

8项新JS＋42项Binding、15视频Python＋13词库Python＋15桥Python通过；修改TS lint、类型与Chrome1.22.1构建通过。先红后绿覆盖来源补交错配、重复载入事件、分页/暂停/失败、笔记保存关联、紧凑日记及错序保护。未调用真实模型/生成真实卡/观看事件。原Yomitan包26.10.9.2不重建；本机桥增加study_video.py，固定ASB Origin只能video动作；实际安装只做只读协议验证。

按旧摘要预检后部署627个自有文件、读回一致，统一包study11，SHA256 5d0b814965a0746ad7d093a7086a5c924e32965bd27e3f3a91cafd32ed539e22，旧包保留。主代理独立、未提交/推送/发布。首用必须启用，默认英语第一轨，日语不自动启动；取消不删除既存资料。真实视频网站/模型/嵌入帧/全屏待验。原字幕时间不改，下载SRT不加入用户播放偏移。多例句与听力练习留后续，没有扩张为第二套阅读器。

## study14 联动与控件收敛｜2026-10-09

用户明确要求两插件+Obsidian+Anki+AI服务同一链路。Yomitan侧完整实现计划在同级yomitan仓库docs/personal-build.md study14；本侧只改字幕时间元数据和学习控件，不复制教学系统。

- 字幕文字节点输出偏移后的start/end毫秒，偏移变化重建缓存；通知和图片字幕不伪造文字时间。Yomitan校验节点范围与唯一视频/token再用于可选媒体，不把字幕行当语义整句。
- 一个开始/暂停主按钮，笔记保存成功才可打开；错误/进度与本次不记录常显，轨道/语言/下载/补交/自动设置次要。载入新字幕时旧任务落定后正确恢复按钮；既有原文优先归档、60请求上限、自动选项显式启用、日记事件规则不变。
- 25项字幕/控制器Jest、类型/lint与WXT Chrome构建通过。版本1.22.2，原ID/key/权限不变；配套Yomitan26.10.9.5，本机桥逐文件不变。study14统一包SHA256 6bcee30fc81488a4875049f56c5622a1efa52593c448f99df19456da5b86d856，无真实模型、学习卡或本人网页验收，无子代理/提交/推送/发布。

## 2026-10-15 · 源码补同步（非发布）

本机既有API字幕/可信cue、换源处理及精简字幕工具源码补入个人main。7份相关Jest文件共112项在本轮通过；未重跑全量/调用模型/操作真实学习数据，也未重建或部署ASB。先前批次的构建/网站结论仍只对应当时的代码与输入，不能由这次源码同步升级为真实网站通过。两扩展仍沿原目录使用，不新开分支或PR。
