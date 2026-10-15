import { runSubtitleJob } from '@project/extension/src/services/study-video-job';

interface Cue {
    start: number;
    end: number;
    text: string;
    track: number;
    originalStart?: number;
    originalEnd?: number;
}
interface Source {
    start: number;
    end: number;
    text: string;
}
interface Saved {
    id: string;
    videoId: string;
    path: string;
    url: string;
    done: number;
    total: number;
    requests: number;
    interrupted: boolean;
    openUrl: string;
}
interface PendingTask {
    task: Task;
    id?: string;
    loaded?: boolean;
    at: number;
    eventId: string;
    position: number;
}
interface Task {
    action: 'videoSave';
    url: string;
    title: string;
    language: string;
    track: string;
    config: { model: string; effort: string };
    subtitles: Source[];
}
const PREFIX = 'study-video-v1:';
const EVENT = 'study-video-event-v1:';

export async function studyCall(payload: object): Promise<Saved> {
    const response = await browser.runtime.sendMessage({ sender: 'study-video', payload });
    if (!response?.ok) throw new Error(response?.error || '暂未连接本机学习服务；原字幕仍可正常使用。');
    return response.result;
}

/** Lives with the loaded video, never observes browser history or arbitrary page messages. */
export class StudyVideoController {
    private root?: HTMLDivElement;
    private primary?: HTMLButtonElement;
    private openNote?: HTMLButtonElement;
    private status?: HTMLElement;
    private translated?: HTMLElement;
    private track?: HTMLSelectElement;
    private language?: HTMLSelectElement;
    private remember?: HTMLInputElement;
    private cues: Cue[] = [];
    private names: string[] = [];
    private result?: Saved;
    private sources: Source[] = [];
    private taskKey?: string;
    private generation = 0;
    private running = false;
    private paused = true;
    private recording = false;
    private suppressed = false;
    private loadedAt = Date.now();
    private url = '';
    private src = '';
    private sourcePromise?: Promise<{ url: string; title: string }>;
    private lastCheckpoint = 0;
    private page = -1;
    private pageDone = -1;
    private translations: Record<string, string> = {};
    private fetching = false;
    private flushing = false;
    private autoTimer?: ReturnType<typeof setTimeout>;
    private readonly onPlay = () => {
        void this.event('play');
    };
    private readonly onPause = () => {
        void this.event('pause');
    };
    private readonly onTime = () => {
        if (!this.valid()) {
            this.paused = true;
            this.recording = false;
            return;
        }
        void this.showTranslation();
        if (!this.video.paused && Date.now() - this.lastCheckpoint > 60000) {
            this.lastCheckpoint = Date.now();
            void this.event('position');
        }
    };
    private readonly onOnline = () => {
        void this.flush();
    };
    private readonly onFullscreen = () => {
        if (this.root)
            (document.fullscreenElement && document.fullscreenElement !== this.video
                ? document.fullscreenElement
                : document.body
            ).append(this.root);
    };

    constructor(private readonly video: HTMLMediaElement) {
        video.addEventListener('play', this.onPlay);
        video.addEventListener('pause', this.onPause);
        video.addEventListener('timeupdate', this.onTime);
        window.addEventListener('online', this.onOnline);
        document.addEventListener('fullscreenchange', this.onFullscreen);
    }

    updateTiming(cues: Cue[]) {
        this.cues = cues;
        void this.showTranslation();
    }

    load(cues: Cue[], names: string[]) {
        this.generation++;
        this.paused = true;
        this.recording = false;
        this.suppressed = false;
        this.loadedAt = Date.now();
        this.result = undefined;
        this.taskKey = undefined;
        this.page = -1;
        this.translations = {};
        this.cues = cues;
        this.names = names;
        this.url = location.href;
        this.src = this.video.currentSrc || this.video.src;
        if (this.autoTimer) clearTimeout(this.autoTimer);
        this.root?.remove();
        this.root = undefined;
        this.primary = undefined;
        this.openNote = undefined;
        if (!cues.length) return;
        this.sourcePromise = browser.runtime
            .sendMessage({ sender: 'study-video', payload: { action: 'videoSource' } })
            .then((r) => {
                if (!r?.ok || !r.result?.url) throw new Error(r?.error || '未取得视频所在页面的来源。');
                return r.result;
            });
        // Observe early rejection until the user starts; no model or Vault operation here.
        void this.sourcePromise.catch(() => {});
        this.render();
        const token = this.generation;
        void browser.storage.local
            .get(PREFIX + 'enabled')
            .then((s) => {
                if (token !== this.generation) return;
                if (s[PREFIX + 'enabled'] === true) {
                    this.remember!.checked = true;
                    this.say('已启用自动整条翻译；3秒后保存并开始，可点“本次不记录”。');
                    this.autoTimer = setTimeout(() => {
                        void this.start(false);
                    }, 3000);
                }
            })
            .catch((e) => this.say(String(e)));
    }

    private valid() {
        return this.url === location.href && this.src === (this.video.currentSrc || this.video.src);
    }
    private say(s: string) {
        if (this.status) this.status.textContent = s;
    }
    private updateActions() {
        if (this.openNote) this.openNote.hidden = !this.result;
        if (!this.primary) return;
        const complete = !!this.result && this.result.done === this.result.total;
        this.primary.disabled = (this.running && this.paused) || (!this.running && complete);
        this.primary.textContent = this.running
            ? this.paused
                ? '正在暂停…'
                : '暂停翻译'
            : complete
              ? '翻译已完成'
              : '翻译整条字幕并保存';
    }
    private render() {
        const root = document.createElement('div');
        this.root = root;
        root.style.cssText = 'position:fixed;right:12px;top:64px;z-index:2147483646;max-width:min(410px,90vw);';
        const shadow = root.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent =
            ':host{font:13px/1.5 system-ui;color:#173d39}details{background:#f5faf9;border:1px solid #9cbcb6;border-radius:8px;padding:8px;box-shadow:0 2px 7px #0002}summary{cursor:pointer}button,select{font:inherit;margin:4px;padding:4px}p{margin:5px 0;overflow-wrap:anywhere}.study-video-translation:empty{display:none}[role=status]{background:#f5faf9;border-radius:5px;padding:5px}label{display:block}';
        shadow.append(style);
        const details = document.createElement('details');
        details.style.cssText = 'background:#f5faf9;border:1px solid #9cbcb6;border-radius:8px;padding:8px';
        shadow.append(details);
        const summary = document.createElement('summary');
        summary.textContent = `字幕工具 · ${this.cues.length} 条字幕`;
        details.append(summary);
        const more = document.createElement('details');
        const moreTitle = document.createElement('summary');
        moreTitle.textContent = '语言、字幕轨与更多';
        more.append(moreTitle);
        const info = document.createElement('p');
        info.textContent = '查词直接使用字幕上的 Yomitan；这里是可选的整轨翻译与观看记录。';
        details.append(info);
        const track = document.createElement('select');
        track.setAttribute('aria-label', '要翻译的字幕轨');
        this.track = track;
        for (const n of [...new Set(this.cues.map((c) => c.track))]) {
            const o = document.createElement('option');
            o.value = String(n);
            o.textContent = this.names[n] || `字幕轨 ${n + 1}`;
            track.append(o);
        }
        more.append(track);
        const language = document.createElement('select');
        language.setAttribute('aria-label', '原字幕语言');
        this.language = language;
        for (const [value, label] of [
            ['en', '英语 → 中文'],
            ['ja', '日语 → 中文'],
        ]) {
            const o = document.createElement('option');
            o.value = value;
            o.textContent = label;
            language.append(o);
        }
        more.append(language);
        const changed = () => {
            this.paused = true;
            this.recording = false;
            this.result = undefined;
            this.translations = {};
            this.page = -1;
            this.updateActions();
            this.say('字幕轨/语言已改变，请点击开始保存新版本。');
        };
        track.addEventListener('change', changed);
        language.addEventListener('change', changed);
        const label = document.createElement('label');
        const remember = document.createElement('input');
        remember.type = 'checkbox';
        this.remember = remember;
        label.append(remember, '以后载入时自动翻译并记录（默认第一轨、英语）');
        more.append(label);
        remember.addEventListener('change', () => {
            void browser.storage.local.set({ [PREFIX + 'enabled']: remember.checked });
            if (!remember.checked && this.autoTimer) clearTimeout(this.autoTimer);
        });
        const button = (name: string, fn: () => void, parent: HTMLElement = details) => {
            const b = document.createElement('button');
            b.textContent = name;
            b.onclick = fn;
            parent.append(b);
            return b;
        };
        this.primary = button('翻译整条字幕并保存', () => {
            if (this.running) {
                this.paused = true;
                this.updateActions();
                this.say('暂停后续批次；当前批完成后保存，观看记录继续。');
            } else void this.start(true);
        });
        button('本次不记录', () => {
            if (this.autoTimer) clearTimeout(this.autoTimer);
            this.paused = true;
            this.recording = false;
            this.suppressed = true;
            this.updateActions();
            this.say('本次已停止后续翻译和记录；已经保存的内容保留。');
        });
        this.openNote = button('打开 Obsidian', () => {
            if (this.result) window.open(this.result.openUrl, '_blank', 'noopener');
            else this.say('还没有保存成功的笔记。');
        });
        button(
            '下载双语 SRT',
            () => {
                void this.download();
            },
            more
        );
        button(
            '补交待存记录',
            () => {
                void this.flush();
            },
            more
        );
        const limits = document.createElement('p');
        limits.textContent =
            'gpt-6.1-sol / low；每批最多30条/6000字，每次确认最多60请求。只发送字幕、标题及相邻语境，不发音视频，不自动制卡；暂停后当前批仍会完成保存。';
        more.append(limits);
        details.append(more);
        this.status = document.createElement('p');
        this.status.setAttribute('role', 'status');
        shadow.append(this.status);
        this.translated = document.createElement('p');
        this.translated.className = 'study-video-translation';
        this.translated.style.cssText = 'background:#f5faf9;padding:5px;border-radius:5px';
        shadow.append(this.translated);
        this.say('选中字幕中的词，使用原查词方式；需要整轨翻译时再展开。');
        this.updateActions();
        document.body.append(root);
        this.onFullscreen();
    }

    private async start(explicit: boolean) {
        if (this.running) {
            if (!explicit && this.root)
                this.autoTimer = setTimeout(() => {
                    void this.start(false);
                }, 3000);
            else this.say('上一批仍在完成保存，请稍后继续。');
            return;
        }
        if (!this.valid()) {
            this.say('视频/页面已变化，请重新载入对应字幕。');
            return;
        }
        this.running = true;
        this.paused = false;
        this.suppressed = false;
        this.updateActions();
        const token = this.generation;
        this.track!.disabled = true;
        this.language!.disabled = true;
        try {
            if ([...document.querySelectorAll('video,audio')].filter((v) => v.getClientRects().length > 0).length > 1)
                throw new Error('当前页有多个可见媒体，无法唯一归属；请打开该视频的独立页面后加载字幕。');
            const source = await this.sourcePromise!;
            if (token !== this.generation || !this.valid()) return;
            const chosen = Number(this.track!.value);
            this.sources = this.cues
                .filter((c) => c.track === chosen)
                .map((c) => ({ start: c.originalStart ?? c.start, end: c.originalEnd ?? c.end, text: c.text }));
            if (!this.sources.length || this.sources.some((c) => !c.text.trim()))
                throw new Error('该轨含图片/空字幕，不能可靠整轨翻译；请选择文字字幕。');
            const task: Task = {
                action: 'videoSave',
                url: source.url,
                title: source.title,
                language: this.language!.value,
                track: this.names[chosen] || `字幕轨${chosen + 1}`,
                config: { model: 'gpt-6.1-sol', effort: 'low' },
                subtitles: this.sources,
            };
            const bytes = new TextEncoder().encode(JSON.stringify(task));
            if (bytes.length > 1500000 || this.sources.length > 5000)
                throw new Error('字幕超过当前安全上限；未截断、未发送。');
            const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
                .map((x) => x.toString(16).padStart(2, '0'))
                .join('');
            this.taskKey = PREFIX + 'job:' + hash;
            const previous = (await browser.storage.local.get(this.taskKey))[this.taskKey] as PendingTask | undefined;
            const sameDay = previous && new Date(previous.at).toDateString() === new Date(this.loadedAt).toDateString();
            // Preserve offline event time; a new day's successful load gets its own daily activity.
            const pending: PendingTask =
                previous && (!previous.id || sameDay)
                    ? { ...previous, task }
                    : {
                          task,
                          at: this.loadedAt,
                          eventId: crypto.randomUUID().replaceAll('-', ''),
                          position: this.video.currentTime,
                      };
            await browser.storage.local.set({ [this.taskKey]: pending });
            let saved = await studyCall(task);
            if (token !== this.generation || !this.valid() || this.suppressed) return;
            this.result = saved;
            this.updateActions();
            this.recording = true;
            await this.queueLoaded(pending, saved.id);
            await browser.storage.local.set({ [this.taskKey]: { ...pending, id: saved.id, loaded: true } });
            await this.flush();
            if (!this.video.paused) await this.event('position');
            if (saved.interrupted || saved.requests >= 60) {
                if (!explicit)
                    throw new Error('上次中断或已达60请求上限；点击继续确认补翻，可能重复消耗未确认批次额度。');
                saved = await studyCall({ action: 'videoContinue', id: saved.id });
            }
            const render = (s: Saved) => {
                if (token !== this.generation) return;
                this.result = s;
                this.updateActions();
                this.say(`译文 ${s.done}/${s.total} · 本轮 ${s.requests}/60 请求 · 已保存到 Obsidian`);
                void this.showTranslation();
            };
            render(saved);
            await runSubtitleJob(
                saved,
                () => studyCall({ action: 'videoTranslate', id: saved.id }),
                () => this.paused || token !== this.generation || !this.valid(),
                render
            );
            if (token === this.generation && this.result?.done === this.result?.total)
                this.say(`整轨 ${this.result.total} 条翻译完成并已保存。观看记录继续；未自动制卡。`);
        } catch (e) {
            if (token === this.generation)
                this.say(`已停止：${e instanceof Error ? e.message : String(e)} 原字幕和已存译文保留，点击继续重试。`);
        } finally {
            this.running = false;
            if (token === this.generation) {
                this.track!.disabled = false;
                this.language!.disabled = false;
            }
            this.updateActions();
        }
    }

    private async event(kind: string) {
        if (!this.recording || !this.result || !this.valid()) return;
        const p = {
            action: 'videoEvent',
            id: this.result.id,
            eventId: crypto.randomUUID().replaceAll('-', ''),
            at: Date.now(),
            kind,
            position: this.video.currentTime,
        };
        try {
            await browser.storage.local.set({ [EVENT + p.eventId]: p });
            await this.flush();
        } catch (e) {
            this.say('观看事件未能暂存：' + String(e));
        }
    }
    private async queueLoaded(pending: PendingTask, id: string) {
        if (pending.loaded) return;
        const p = {
            action: 'videoEvent',
            id,
            eventId: pending.eventId,
            at: pending.at,
            kind: 'loaded',
            position: pending.position,
        };
        await browser.storage.local.set({ [EVENT + p.eventId]: p });
    }
    private async flush() {
        if (this.flushing) return;
        this.flushing = true;
        try {
            const all = await browser.storage.local.get(null);
            for (const [key, value] of Object.entries(all))
                if (key.startsWith(PREFIX + 'job:')) {
                    const pending = value as PendingTask;
                    if (!pending.id) {
                        const saved = await studyCall(pending.task);
                        await this.queueLoaded(pending, saved.id);
                        await browser.storage.local.set({ [key]: { ...pending, id: saved.id, loaded: true } });
                    }
                }
            const events = await browser.storage.local.get(null);
            for (const [key, p] of Object.entries(events))
                if (key.startsWith(EVENT) && typeof p === 'object' && p !== null) {
                    await studyCall(p);
                    await browser.storage.local.remove(key);
                }
        } catch (e) {
            this.say('日记待补交（已在本机扩展暂存）：' + String(e));
        } finally {
            this.flushing = false;
        }
    }
    private async getPage(id: string, offset: number): Promise<Record<string, string>> {
        const r = await browser.runtime.sendMessage({
            sender: 'study-video',
            payload: { action: 'videoPage', id, offset },
        });
        if (!r?.ok) throw new Error(r?.error || '译文读取失败');
        return r.result.translations;
    }
    private async showTranslation() {
        if (!this.result || !this.translated || this.fetching) return;
        const chosen = Number(this.track!.value);
        const current = this.cues.filter((c) => c.track === chosen);
        const i = current.findIndex(
            (c) => c.start <= this.video.currentTime * 1000 && c.end >= this.video.currentTime * 1000
        );
        if (i < 0) {
            this.translated.textContent = '';
            return;
        }
        const offset = Math.floor(i / 30) * 30;
        const token = this.generation;
        const ident = this.result.id;
        if (this.page !== offset || this.pageDone !== this.result.done) {
            this.fetching = true;
            try {
                const rows = await this.getPage(ident, offset);
                if (token !== this.generation || this.result?.id !== ident) return;
                this.translations = rows;
                this.page = offset;
                this.pageDone = this.result.done;
            } catch {
                this.translated.textContent = '译文暂不可读，可打开 Obsidian 查看。';
                return;
            } finally {
                this.fetching = false;
            }
        }
        this.translated.textContent = 'AI 中文：' + (this.translations[String(i)] || '此句待翻译');
    }
    private async download() {
        const r = this.result;
        const sources = this.sources.slice();
        if (!r) {
            this.say('请先保存字幕。');
            return;
        }
        try {
            const translations: Record<string, string> = {};
            for (let i = 0; i < r.total; i += 30) Object.assign(translations, await this.getPage(r.id, i));
            const stamp = (ms: number) => {
                const total = Math.floor(ms);
                const h = Math.floor(total / 3600000);
                const m = Math.floor(total / 60000) % 60;
                const sec = Math.floor(total / 1000) % 60;
                return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(total % 1000).padStart(3, '0')}`;
            };
            const content = sources
                .map(
                    (c, i) =>
                        `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n${translations[String(i)] || '【待翻译】'}\n`
                )
                .join('\n');
            const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `字幕-${r.id}${r.done < r.total ? '-未完成' : ''}.srt`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        } catch (e) {
            this.say('下载未完成：' + String(e));
        }
    }
    dispose() {
        this.generation++;
        this.paused = true;
        this.recording = false;
        if (this.autoTimer) clearTimeout(this.autoTimer);
        this.root?.remove();
        this.video.removeEventListener('play', this.onPlay);
        this.video.removeEventListener('pause', this.onPause);
        this.video.removeEventListener('timeupdate', this.onTime);
        window.removeEventListener('online', this.onOnline);
        document.removeEventListener('fullscreenchange', this.onFullscreen);
    }
}
