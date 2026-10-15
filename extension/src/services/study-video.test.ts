import { runSubtitleJob } from '@project/extension/src/services/study-video-job';

describe('whole subtitle job', () => {
    test('runs every batch without manual paging', async () => {
        let done = 0;
        const seen: number[] = [];
        await runSubtitleJob(
            { done: 0, total: 65 },
            async () => ({ done: (done = Math.min(65, done + 30)), total: 65 }),
            () => false,
            (s) => seen.push(s.done)
        );
        expect(seen).toEqual([30, 60, 65]);
    });
    test('pause keeps the completed batch and stops the next', async () => {
        let paused = false;
        let count = 0;
        await runSubtitleJob(
            { done: 0, total: 60 },
            async () => {
                count++;
                paused = true;
                return { done: 30, total: 60 };
            },
            () => paused,
            () => {}
        );
        expect(count).toBe(1);
    });
    test('completed cached job makes no requests', async () => {
        const next = jest.fn();
        await runSubtitleJob(
            { done: 20, total: 20 },
            next,
            () => false,
            () => {}
        );
        expect(next).not.toHaveBeenCalled();
    });
    test('failure stops instead of silently dropping rows', async () => {
        const next = jest.fn().mockRejectedValue(new Error('missing lines'));
        await expect(
            runSubtitleJob(
                { done: 0, total: 40 },
                next,
                () => false,
                () => {}
            )
        ).rejects.toThrow('missing lines');
        expect(next).toHaveBeenCalledTimes(1);
    });
    test('non-progress and a hard request cap cannot loop forever', async () => {
        await expect(
            runSubtitleJob(
                { done: 0, total: 1 },
                async () => ({ done: 0, total: 1 }),
                () => false,
                () => {}
            )
        ).rejects.toThrow();
        let done = 0;
        await expect(
            runSubtitleJob(
                { done: 0, total: 100 },
                async () => ({ done: ++done, total: 100 }),
                () => false,
                () => {}
            )
        ).rejects.toThrow('60');
        expect(done).toBe(60);
    });
});

import { StudyVideoController } from '@project/extension/src/services/study-video';
import { TextEncoder } from 'node:util';
import { webcrypto } from 'node:crypto';

describe('video controller persistence and actual events', () => {
    let store: Record<string, unknown>;
    let sent: Record<string, unknown>[];
    let controller: StudyVideoController;
    const access = () =>
        controller as unknown as {
            start(explicit: boolean): Promise<void>;
            flush(): Promise<void>;
            event(kind: string): Promise<void>;
        };
    test('loading another subtitle while old save settles never leaves the new main action disabled', async () => {
        const task = access().start(true);
        controller.load([{ text: 'New subtitle', start: 0, end: 2000, track: 0 }], ['new.srt']);
        await task;
        const shadow = [...document.querySelectorAll('div')].map((x) => x.shadowRoot).find(Boolean)!;
        const main = [...shadow.querySelectorAll('button')].find((x) => x.textContent === '翻译整条字幕并保存')!;
        expect(main).toBeDefined();
        expect(main.disabled).toBe(false);
    });
    test('main action pauses after current batch and can resume without an extra pause button', async () => {
        const original = browser.runtime.sendMessage;
        let release!: () => void;
        const pending = new Promise<void>((resolve) => {
            release = resolve;
        });
        browser.runtime.sendMessage = jest.fn(async (request: { payload: { action: string } }) => {
            if (request.payload.action === 'videoTranslate') await pending;
            const response = await original<
                { payload: { action: string } },
                { result: { done: number; total: number } }
            >(request);
            if (request.payload.action === 'videoSave') response.result = { ...response.result, done: 0, total: 60 };
            if (request.payload.action === 'videoTranslate')
                response.result = { ...response.result, done: 30, total: 60 };
            return response;
        }) as unknown as typeof original;
        const task = access().start(true);
        for (let i = 0; i < 20 && !sent.some((x) => x.action === 'videoSave'); i++)
            await new Promise((r) => setTimeout(r, 0));
        const shadow = [...document.querySelectorAll('div')].map((x) => x.shadowRoot).find(Boolean)!;
        const main = [...shadow.querySelectorAll('button')].find((x) => x.textContent === '暂停翻译')!;
        main.click();
        expect(main.disabled).toBe(true);
        expect(main.textContent).toBe('正在暂停…');
        release();
        await task;
        expect(main.disabled).toBe(false);
        expect(main.textContent).toBe('翻译整条字幕并保存');
        expect(sent.filter((x) => x.action === 'videoTranslate').length).toBeLessThanOrEqual(1);
    });
    test('subtitle tools start folded, expose cue count, and keep status visible without starting translation', () => {
        const shadow = [...document.querySelectorAll('div')].map((x) => x.shadowRoot).find(Boolean)!;
        const panel = shadow.querySelector('details')!;
        expect(panel.querySelector('summary')!.textContent).toContain('2 条字幕');
        expect(panel.open).toBe(false);
        expect(shadow.querySelector('[role=status]')!.closest('details')).toBeNull();
        expect(sent.some((x) => ['videoSave', 'videoTranslate'].includes(String(x.action)))).toBe(false);
        panel.open = true;
        expect([...panel.querySelectorAll('button')].some((x) => x.textContent === '翻译整条字幕并保存')).toBe(true);
    });
    test('one main action changes to pause, saved note appears only after persistence', async () => {
        const shadow = [...document.querySelectorAll('div')].map((x) => x.shadowRoot).find(Boolean)!;
        const buttons = () => [...shadow.querySelectorAll('button')];
        expect(buttons().some((x) => x.textContent === '暂停翻译')).toBe(false);
        expect(buttons().find((x) => x.textContent === '打开 Obsidian')!.hidden).toBe(true);
        expect(shadow.querySelector('[role=status]')!.closest('details')).toBeNull();
        await access().start(true);
        expect(buttons().find((x) => x.textContent === '打开 Obsidian')!.hidden).toBe(false);
        expect(buttons().some((x) => x.textContent === '翻译已完成')).toBe(true);
    });
    beforeEach(() => {
        store = {};
        sent = [];
        Object.defineProperty(globalThis, 'TextEncoder', { value: TextEncoder, configurable: true });
        Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
        Object.defineProperty(globalThis, 'browser', {
            value: {
                storage: {
                    local: {
                        get: async (key: string | null) => (key ? { [key]: store[key] } : { ...store }),
                        set: async (data: Record<string, unknown>) => Object.assign(store, data),
                        remove: async (key: string) => {
                            delete store[key];
                        },
                    },
                },
                runtime: {
                    sendMessage: async ({ payload }: { payload: Record<string, unknown> }) => {
                        sent.push(payload);
                        return {
                            ok: true,
                            result: {
                                id: 'a'.repeat(32),
                                videoId: 'b'.repeat(32),
                                done: 2,
                                total: 2,
                                requests: 1,
                                interrupted: false,
                                url: 'https://www.youtube.com/watch?v=example',
                                title: 'Example',
                                path: 'video.md',
                                openUrl: 'obsidian://open',
                                translations: {},
                            },
                        };
                    },
                },
            },
            configurable: true,
        });
        const video = document.createElement('video');
        document.body.append(video);
        controller = new StudyVideoController(video);
        controller.load(
            [
                { start: 0, end: 1000, text: 'hello', track: 0 },
                { start: 1000, end: 2000, text: 'world', track: 0 },
            ],
            ['English']
        );
    });
    afterEach(() => {
        controller.dispose();
        document.body.innerHTML = '';
    });
    test('repeated save does not invent another loaded event', async () => {
        await access().start(true);
        await access().start(true);
        expect(sent.filter((p) => p.action === 'videoEvent' && p.kind === 'loaded')).toHaveLength(1);
        expect(sent.filter((p) => p.kind === 'play')).toHaveLength(0);
    });
    test('failed source saves can be submitted from the durable outbox', async () => {
        const runtime = browser.runtime.sendMessage;
        browser.runtime.sendMessage = async () => ({
            ok: false,
            error: 'offline',
        });
        await access().start(true);
        expect(Object.keys(store).some((k) => k.includes('job:'))).toBe(true);
        browser.runtime.sendMessage = runtime;
        await access().flush();
        expect(sent.some((p) => p.action === 'videoSave')).toBe(true);
    });
});

import { handleStudyVideoMessage } from '@project/extension/src/services/study-video-native';

test('native forwarding preserves the recorded source during offline replay on another page', async () => {
    const send = jest.fn(async (p: string, payload: unknown) => ({ ok: true, result: payload }));
    Object.defineProperty(globalThis, 'browser', {
        value: { runtime: { id: 'our-extension', sendNativeMessage: send } },
        configurable: true,
    });
    const response = jest.fn();
    handleStudyVideoMessage(
        {
            sender: 'study-video',
            payload: { action: 'videoSave', url: 'https://www.youtube.com/watch?v=OLD', title: 'Old video' },
        },
        {
            id: 'our-extension',
            tab: { id: 1, url: 'https://www.youtube.com/watch?v=NEW', title: 'New video' },
        } as Browser.runtime.MessageSender,
        response
    );
    await Promise.resolve();
    expect(send.mock.calls[0][1]).toMatchObject({ url: 'https://www.youtube.com/watch?v=OLD', title: 'Old video' });
});
