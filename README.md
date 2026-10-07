# asbplayer 中文学习定制版

仅维护 [suifracti/asbplayer](https://github.com/suifracti/asbplayer)，不向官方仓库推送或提 PR。

## 下载与加载

请从本仓库 **[Releases](https://github.com/suifracti/asbplayer/releases)** 下载预构建安装包，不用 Code → Download ZIP（那是需构建的源码）。
两扩展统一包发布于 [asbplayer Releases](https://github.com/suifracti/asbplayer/releases)。解压到固定目录，在 Chrome 扩展页启用开发者模式，分别“加载已解压的扩展”选择 `yomitan`、`asbplayer` 文件夹。不要同时启用商店原版，避免重复扫描或录音。

新安装已预设中文界面、AnkiConnect `127.0.0.1:8766`、牌组 `外语::英语语境`、笔记类型 `外语语境卡` 和七个字段；不会迁移或覆盖旧扩展数据。Yomitan 随包提供 ECDICT 英汉词典，首次入门/设置页会自动导入，请等待提示就绪。Chrome 首次加载/授权须人工确认。Anki Desktop 必须运行且安装 AnkiConnect；此包不自动改任意机器的 Anki 数据库。

## 使用

- 文章/字幕：按住 **Shift** 悬停查词；中文释义由内置 ECDICT 提供。
- 视频：asbplayer 使用平台可检测字幕，或拖入自己的 SRT/VTT；不保证任意网站字幕自动可读。
- 视频语境制卡：使用 asbplayer 的制卡入口，或在 Yomitan 加词后用 asbplayer 更新上一张卡片补入音频/截图。普通查词制卡无需额外服务。
- **高级词汇状态标色依赖额外 yomitan-api 本机组件，当前包不启用。** 已预设 Word 字段和目标牌组，但不把配置称为已完成 Anki 复习回流。21 天等“成熟”阈值是软件规则，不是真实掌握。

## 更新与边界

独立公开扩展 key 固定本地版本 ID，与商店版分开；升级复用同一目录和同一 key，不再生成新 key。运行 `tools/check-upstream.sh` 只拉取并查看更新，不自动合并、推送或提交官方 PR。适配在自己的分支做，检查文案键、模板变量、权限与构建后再发布。

验证记录与构建说明见 `docs/personal-build.md`。构建及静态检查不等于真实浏览器加载、词典首次导入或视频/制卡运行验收。

---

以下保留上游原始说明。

<p align="center">
    <img src="https://raw.githubusercontent.com/asbplayer/asbplayer/main/extension/public/icon/icon128.png" width="75" height="75" style="border-radius: 16px" alt="asbplayer" />
</p>

<div align="center">

[![GitHub Workflow Status (with event)](https://img.shields.io/github/actions/workflow/status/asbplayer/asbplayer/verify.yml)](https://github.com/asbplayer/asbplayer/actions/workflows/verify.yml)
[![Github All Releases](https://img.shields.io/github/downloads/asbplayer/asbplayer/total.svg)](https://github.com/asbplayer/asbplayer/releases)
[![GitHub License](https://img.shields.io/github/license/asbplayer/asbplayer)](LICENSE)
[![Discord](https://img.shields.io/discord/962412001810849814?color=%237785cc)](https://discord.gg/ad7VAQru7m)

</div>

# asbplayer

**asbplayer** is a browser-based media player and Chrome extension developed for language learners who learn their target language through subtitled media. With asbplayer, you can:

- **Easily create high-quality, multimedia flashcards** out of subtitled videos.
- **Load text-selectable subtitles onto most video sources**, including streaming sources. You can use **auto-detected subtitles** on popular streaming services like Netflix and YouTube, or your own **subtitle files**. A generic fallback subtitle detection algorithm allows asbplayer to detect subtitles on 85% of all other streaming services.
- **Seek through subtitles** using a **navigable subtitle list**.
- **Optimize language acquisition** with **playback modes** like:
    - **Condensed playback**: Skip unsubtitled sections of video.
    - **Fast-forward playback**: Fast-forward through unsubtitled sections of video.
    - **Auto-pause**: Automatically pause at the beginning or end of every subtitle.
    - **Repeat**: Automatically repeat subtitles indefinitely or for a specified number of times.
- **Use customizable keyboard shortcuts** to access most of asbplayer's features.
- **Annotate subtitles** with the help of tools such as [Yomitan](https://yomitan.wiki/)
    - **Word styling** (color/underline/outline, etc.) based on a word's status (uncollected/unknown/learning, etc.) synced from Anki, WaniKani, and/or tracked locally in asbplayer.
    - **Reading annotation** for reading displayed above each word or based on status.
    - **Accent annotation** such as pitch accent.
    - **Frequency annotation** for rank-based frequency displayed below each word or based on status.
    - **Glossary annotation** for a short definition or explanation of the word.
    - **Statistics and Comprehension** on your known words for the current media.
    - **Word browser** to manage local and view words synced from external sources.
    - Many more features for future releases! Some planned features include:
        - **Adaptive Playback** that uses **playback modes** and the annotation data to optimize your learning experience.
        - **Auto mining** on uncollected/unknown/learning words.
        - **Rich Anki Card Creation** for generating high-quality flashcards from annotated subtitles.
        - **Statistics and Comprehension** on your known words across media.

## Thanks

Thank you to everyone who has sponsored the project:

[@vivekchoksi](https://www.github.com/vivekchoksi),
[@nzarbayezid](https://www.github.com/nzarbayezid),
[@ManuJapan](https://www.github.com/ManuJapan),
AdamM,
realgoodsmiley,
Alex,
[@m4eko](https://github.com/m4eko),
Simon,
Attenius,
medyas,
[@zaerald](https://github.com/zaerald),
Suna,
[@tony7253](https://github.com/tony7253),
[@voothi](https://github.com/voothi),
kibo,
[@genericdave](https://github.com/genericdave),
Daniel,
Cristian,
Joey Potter,
[@InteractiveNinja](https://github.com/InteractiveNinja),
[@agloo](https://github.com/agloo),
[@Venous771](https://github.com/Venous771),
[@Viterkim](https://github.com/Viterkim),
Julian,
DanglingSabSuu,
[@nikkovc](https://github.com/nikkovc),
[@ganqqwerty](https://github.com/ganqqwerty),
[@mathiaslovnes](https://github.com/mathiaslovnes),
[@MF-Billings](https://github.com/MF-Billings),
[@festivity9139](https://github.com/festivity9139),
Phos,
AstralDice,
[@east825](https://github.com/east825),
[@Astr0ddity](https://github.com/Astr0ddity),
[@NirDafnai](https://github.com/NirDafnai),
[@henryfl](https://github.com/henryfl),
トム,
Peter,
[@825i](https://github.com/825i),
ags,
Vannde3,
Champ,
marcman3001,
[@vladysor](https://github.com/vladysor),
[@Otto-Deviant1904](https://github.com/Otto-Deviant1904),
[@Ayase-the-Dark](https://github.com/Ayase-the-Dark),
shiki,
kansha-gratitude

and to those who have donated privately.

Thank you to all those who have contributed to asbplayer:

[@Renji-XD](https://www.github.com/Renji-XD),
[@MatiasIslaA](https://www.github.com/MatiasIslaA),
[@cyphar](https://www.github.com/cyphar),
[@alexbofa](https://www.github.com/alexbofa),
[@Zyphdoz](https://github.com/Zyphdoz),
[@artjomsR](https://github.com/artjomsR),
[@iam6lake](https://github.com/iam6lake),
[@bpwhelan](https://github.com/bpwhelan),
[@pooky-programs](https://github.com/pooky-programs),
[@m-edlund](https://github.com/m-edlund),
[@nekorushi](https://github.com/nekorushi),
[@Viterkim](https://github.com/Viterkim),
[@s-cork](https://github.com/s-cork),
[@shekhirin](https://github.com/shekhirin),
[@ShanaryS](https://github.com/ShanaryS),
[@kayden1940](https://github.com/kayden1940),
[@eltociear](https://github.com/eltociear),
[@MarvNC](https://github.com/MarvNC),
[@mcgrizzz](https://github.com/mcgrizzz),
[@mwojick](https://github.com/mwojick),
[@kowasaur](https://github.com/kowasaur),
[@NirDafnai](https://github.com/NirDafnai),
[@miroshQa](https://github.com/miroshQa),
[@RicBent](https://github.com/RicBent),
[@fuyuka1d3su](https://github.com/fuyuka1d3su),
[@SpazzTL](https://github.com/SpazzTL),
[@mseh1128](https://github.com/mseh1128),
[@LuqueDaniel](https://github.com/LuqueDaniel),
[@agloo](https://github.com/agloo),
[@Bennycopter](https://github.com/Bennycopter),
[@extremq](https://github.com/extremq),
[@iamllama](https://github.com/iamllama),
[@danthemango](https://github.com/danthemango),
[@L-M-Sherlock](https://github.com/L-M-Sherlock),
[@Hit2Skill](https://github.com/Hit2Skill),
[@khajiitvaper2017](https://github.com/khajiitvaper2017),
[@saifkaral](https://github.com/saifkaral),
[@xwxb](https://github.com/xwxb),
[@yqmmm](https://github.com/yqmmm),
[@jprostko](https://github.com/jprostko),
[@rodrigo-suarezmajor](https://github.com/rodrigo-suarezmajor),
[@Roka20012](https://github.com/Roka20012),
[@RonzyOnGIT](https://github.com/RonzyOnGIT),
[@Dr-TNineS](https://github.com/Dr-TNineS),
[@thntx](https://github.com/thntx),
[@Otto-Deviant1904](https://github.com/Otto-Deviant1904),
[@Ayase-the-Dark](https://github.com/Ayase-the-Dark),
[@aramrw](https://github.com/aramrw),
[@steckums](https://github.com/steckums),
[@eXaminator](https://github.com/eXaminator),
[@rajpiskala](https://github.com/rajpiskala),
[@gpressutto5](https://github.com/gpressutto5),
[@chadzimmerman](https://github.com/chadzimmerman)

Thank you to all those who have translated asbplayer:

**Mana Tsutsumi** (Japanese, initial translation),
**Kai Böse** (German),
**Triline**, **[@nekorushi](https://github.com/nekorushi)** (Polish),
**NeverWinterSwor** (Simplified Chinese),
**[@AkihaZhang](https://github.com/AkihaZhang)** (Simplified Chinese),
**senorli** (Simplified Chinese),
**Yagxter**, **[@chatterine](https://github.com/chatterine)** (Brazilian Portuguese),
**Leo Gonzalez** (Spanish),
**[@NovaKing007](https://github.com/NovaKing007)** (Spanish),
**Yuri ([@ganqqwerty](https://github.com/ganqqwerty))** (Russian),
**Kellen (kputuhuk)** (Russian),
**Vladislav Kochetkov (vakochetkov)** (Russian),
**[@825i](https://github.com/825i)** (Finnish),
**[@Jaybird1291](https://github.com/jaybird1291)** (French),
**Tigerbabe aka Gyaru Jinsei Juku** (Korean),
**yaacha** (Indonesian),
**[@NeriSal](https://github.com/nerisal)** (Italian)

If you are a non-English native, and would like to help translate asbplayer, join the [Crowdin project](https://crowdin.com/project/asbplayer). If your language isn't there, feel free to create an issue to add it on the [issues page](https://github.com/asbplayer/asbplayer/issues).

## Contributing

Before contributing, please read the [contribution guidelines](https://github.com/asbplayer/asbplayer/blob/main/CONTRIBUTING.md).

## User guide

asbplayer's complete user guide is [here](https://docs.asbplayer.dev/docs/intro).

## Getting Started

> [!NOTE]  
> asbplayer is both a subtitle control and flashcard creation tool. If you are not interested in flashcards, and only want to use asbplayer's subtitle features, just follow step 5.

1. Install and set up a dictionary tool for your target language that allows you to do instant lookups such as [Yomitan](https://chromewebstore.google.com/detail/yomitan/likgccmbimhjbgkjambclfkhldnlhbnn).
2. Install [Anki](https://apps.ankiweb.net/), and create a deck and note type. More details on [Refold's guide](https://refold.la/roadmap/stage-1/a/anki-setup).
3. Install the [AnkiConnect](https://ankiweb.net/shared/info/2055492159) plugin for Anki.
4. [Configure](https://app.asbplayer.dev/?view=settings) asbplayer to create cards via AnkiConnect using your deck and note type.
5. Enhance a video using asbplayer and subtitle files.
    - **For streaming video:** After installing the [browser extension](https://github.com/asbplayer/asbplayer/releases/latest), drag-and-drop a subtitle file into the streaming video you want to mine.
    - **For local files:** Drag-and-drop media/subtitle files into the [asbplayer website](https://app.asbplayer.dev).

    You may have to [adjust the subtitle offset](https://docs.asbplayer.dev/docs/guides/subtitle-timing) to get the subtitles in sync.

6. When a subtitle appears that you want to mine, use <kbd>Ctrl + Shift + X</kbd> to open the flashcard creator.
7. Fill in the definition and word fields and then export the card. To fill in the definition field you may use the dictionary you installed in step 1.

## Contact

Submit bugs or feature requests from the [issues page](https://github.com/asbplayer/asbplayer/issues). Join the [Discord](https://discord.gg/ad7VAQru7m) server to talk with me and other language learners.

## Notes for AMO source code reviewers

### Environment

node 24.21.0
pnpm 11.27.0

### Building

```sh
# Install dependencies
pnpm install

# Builds Firefox extension to extension/.output/asbplayer-<version>-firefox.zip
pnpm --filter @project/extension run wxt zip -b firefox

# Builds Firefox for Android extension to extension/.output/asbplayer-<version>-firefox-android.zip
pnpm --filter @project/extension run wxt zip -b firefox-android --mv2
```

## License

asbplayer is licensed under the GNU Affero General Public License version 3 or later (AGPL-3.0-or-later). Portions of this software are licensed under the MIT License.
