/** @jest-environment-options {"url":"https://www.youtube.com/watch?v=abcdefghijk"} */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { ASB_TOKEN_SELECTED_CLASS, selectTokenInRoot } from '@project/common/annotations';
import {
    makeDictionaryTrack,
    makeDictionaryTracks,
    makeSubtitle,
    makeToken,
} from '@project/common/annotations/annotations-test-utils';
import type { DictionaryProvider } from '@project/common/dictionary-db';
import { defaultSettings, TokenStatus } from '@project/common/settings';
import type { SettingsProvider, SubtitlesWidthUnit } from '@project/common/settings';
import SubtitleController from '@project/extension/src/controllers/subtitle-controller';
import type Binding from '@project/extension/src/services/binding';
import { studyApiFiles } from '../services/study-api-subtitles';

describe('SubtitleController appearance rendering', () => {
    const controllers: SubtitleController[] = [];

    afterEach(() => {
        for (const controller of controllers) controller.unbind();
        controllers.length = 0;
        document.body.replaceChildren();
        jest.useRealTimers();
    });

    const controllerForVideo = () => {
        const video = document.createElement('video');
        video.getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 360 }) as DOMRect;
        const controller = new SubtitleController(
            {
                video,
                registeredVideoSrc: 'https://example.com/video.mp4',
                currentTimeMs: 0,
            } as unknown as Binding,
            { publishStatisticsSnapshot: async () => {} } as unknown as DictionaryProvider,
            {
                activeProfile: async () => undefined,
                getAll: async () => defaultSettings,
                getSingle: async (key: keyof typeof defaultSettings) => defaultSettings[key],
            } as unknown as SettingsProvider
        );
        controllers.push(controller);
        return controller;
    };

    it('privately retrieved API files attest own rendered cue without native TextTrack and invalidate on track replacement', async () => {
        const controller = controllerForVideo();
        const video = (controller as any).context.video;
        document.body.append(video);
        Object.defineProperty(video, 'textTracks', { value: [], configurable: true });
        const seek = jest.fn(async (_target: number) => {});
        (controller as any).context.seek = seek;
        controller.setSubtitleSettings(defaultSettings);
        controller.subtitles = [
            {
                text: 'Can you bank on him?',
                start: 12750,
                end: 15250,
                originalStart: 12000,
                originalEnd: 14500,
                track: 0,
                index: 0,
            },
        ];
        controller.subtitleFileNames = ['English.ytsrv3'];
        const file = new File(['provider bytes'], 'English.ytsrv3');
        studyApiFiles.set(file, { pageKey: 'youtube:abcdefghijk', language: 'en' });
        (controller as any).adoptStudyApiFiles?.([file], false);
        const c = controller as any;
        c._forceHideSubtitles = false;
        c._displaySubtitles = true;
        c.showingLoadedMessage = false;
        controller.cacheHtml();
        controller.playbackStateChanged({
            timestampMs: 12750,
            paused: true,
            showingSubtitleIndexes: [0],
            invisibleSubtitleIndexes: [],
        });
        const node = [...document.querySelectorAll<HTMLElement>('[data-asb-study-cue]')].find((n) =>
            c.studyCueNodes.has(n)
        )!;
        expect(node).toBeDefined();
        const hint = JSON.parse(node.dataset.asbStudyCue!);
        expect(hint.language).toBe('en');
        node.getClientRects = () => [{ left: 0, right: 100, top: 0, bottom: 20 }] as any;
        const text = document.createTreeWalker(node, NodeFilter.SHOW_TEXT).nextNode()!;
        const range = document.createRange();
        range.setStart(text, 8);
        range.setEnd(text, 15);
        getSelection()!.removeAllRanges();
        getSelection()!.addRange(range);
        Object.assign(hint, { selectionStart: 8, selectionEnd: 15, word: 'bank on' });
        expect(controller.confirmStudyCue(hint).ok).toBe(true);
        expect((await controller.returnToStudyCue(hint)).ok).toBe(true);
        expect(seek).toHaveBeenCalledWith(12750);
        controller.offset(1000, true);
        expect(c.studyLanguage(controller.subtitles[0])).toBe('en');
        expect(controller.revalidateStudyCue(hint).ok).toBe(false);
        controller.subtitles = [...controller.subtitles];
        expect(controller.revalidateStudyCue(hint).ok).toBe(false);
        controller.cacheHtml();
        expect(c.studyLanguage(controller.subtitles[0])).toBeUndefined();
    });

    it('publishes actual offset-adjusted subtitle timing for the selected text, not original SRT time', () => {
        const controller = controllerForVideo();
        controller.setSubtitleSettings(defaultSettings);
        controller.subtitles = [
            {
                text: 'A real sentence.',
                start: 12500,
                end: 16400,
                originalStart: 10000,
                originalEnd: 13900,
                track: 0,
                index: 0,
            },
        ];
        controller.cacheHtml();
        const cue = document.querySelector<HTMLElement>('[data-asb-study-start-ms]');
        expect(cue?.dataset.asbStudyStartMs).toBe('12500');
        expect(cue?.dataset.asbStudyEndMs).toBe('16400');
        expect(cue?.textContent).toContain('A real sentence.');
        controller.offset(5000, true);
        const updated = document.querySelector<HTMLElement>('[data-asb-study-start-ms]');
        expect(updated?.dataset.asbStudyStartMs).toBe('15000');
        expect(updated?.dataset.asbStudyEndMs).toBe('18900');
    });

    it('publishes original cue ms, offset, clean text and bounded same-track neighbours', () => {
        const controller = controllerForVideo();
        controller.setSubtitleSettings(defaultSettings);
        controller.subtitleFileNames = ['synthetic-en.srt', 'synthetic-ja.srt'];
        controller.subtitles = [
            { text: 'Before.', start: 10750, end: 11750, originalStart: 10000, originalEnd: 11000, track: 0, index: 0 },
            {
                text: 'Can you bank on him?',
                start: 12750,
                end: 15250,
                originalStart: 12000,
                originalEnd: 14500,
                track: 0,
                index: 1,
            },
            {
                text: '別の字幕',
                start: 12750,
                end: 15250,
                originalStart: 12000,
                originalEnd: 14500,
                track: 1,
                index: 2,
            },
            { text: 'After.', start: 15750, end: 16750, originalStart: 15000, originalEnd: 16000, track: 0, index: 3 },
        ];
        controller.cacheHtml();
        const cue = document.querySelector<HTMLElement>('[data-asb-subtitle-index="1"]');
        const snapshot = JSON.parse(cue?.dataset.asbStudyCue ?? 'null');
        expect(snapshot).toMatchObject({
            version: 1,
            text: 'Can you bank on him?',
            trackIndex: 0,
            cueIndex: 1,
            originalStartMs: 12000,
            originalEndMs: 14500,
            subtitleOffsetMs: 750,
            language: null,
        });
        expect(snapshot.adjacentCues.map((c: { text: string }) => c.text)).toEqual(['Before.', 'After.']);
        expect(snapshot.trackName).toBe('synthetic-en.srt');
        expect(JSON.stringify(snapshot)).not.toContain('別の字幕');
    });

    it('does not fabricate a native language or original timing from a filename/display time', () => {
        const controller = controllerForVideo();
        controller.setSubtitleSettings(defaultSettings);
        controller.subtitleFileNames = ['English.en.srt'];
        controller.subtitles = [{ text: 'Synthetic.', start: 12750, end: 15250, track: 0, index: 0 } as any];
        controller.cacheHtml();
        const snapshot = JSON.parse(
            document.querySelector<HTMLElement>('[data-asb-subtitle-index]')?.dataset.asbStudyCue ?? 'null'
        );
        expect(snapshot).toMatchObject({
            language: null,
            originalStartMs: null,
            originalEndMs: null,
            subtitleOffsetMs: null,
        });
    });

    it('keeps cached image subtitle width responsive and rebuilds its ratio when image scale changes', () => {
        const controller = controllerForVideo();
        controller.setSubtitleSettings({ ...defaultSettings, imageBasedSubtitleScaleFactor: 2 });
        controller.subtitles = [
            {
                text: '',
                textImage: {
                    dataUrl: 'data:image/png;base64,image',
                    screen: { width: 100, height: 50 },
                    image: { width: 25, height: 10 },
                },
                start: 0,
                end: 1000,
                originalStart: 0,
                originalEnd: 1000,
                track: 0,
                index: 0,
            },
        ];
        controller.cacheHtml();

        let imageContainer = document.querySelector<HTMLImageElement>('img[alt="subtitle"]')?.parentElement;
        expect(imageContainer?.dataset.asbVideoWidthRatio).toBe('0.5');
        expect(imageContainer?.style.maxWidth).toBe('100%');
        expect(imageContainer?.getAttributeNames()).not.toContain('}');

        controller.setSubtitleSettings({ ...defaultSettings, imageBasedSubtitleScaleFactor: 4 });

        imageContainer = document.querySelector<HTMLImageElement>('img[alt="subtitle"]')?.parentElement;
        expect(imageContainer?.dataset.asbVideoWidthRatio).toBe('1');
    });

    it('falls back to track zero subtitle classes for tracks without appearance settings', () => {
        const controller = controllerForVideo();
        controller.setSubtitleSettings({ ...defaultSettings, subtitleBlur: true });
        controller.subtitles = [
            {
                text: 'subtitle',
                start: 0,
                end: 1000,
                originalStart: 0,
                originalEnd: 1000,
                track: 5,
                index: 0,
            },
            {
                text: '',
                textImage: {
                    dataUrl: 'data:image/png;base64,image',
                    screen: { width: 100, height: 50 },
                    image: { width: 25, height: 10 },
                },
                start: 0,
                end: 1000,
                originalStart: 0,
                originalEnd: 1000,
                track: 6,
                index: 1,
            },
        ];
        controller.cacheHtml();

        expect(document.querySelector('span[data-track="5"]')?.className).toBe('asbplayer-subtitles-blurred');
        expect(document.querySelector('div[data-track="6"]')?.className).toBe('asbplayer-subtitles-blurred');
    });

    it('identifies rendered text subtitles for token selection', () => {
        const controller = controllerForVideo();
        controller.setSubtitleSettings(defaultSettings);
        controller.subtitles = [
            {
                text: 'subtitle',
                start: 0,
                end: 1000,
                originalStart: 0,
                originalEnd: 1000,
                track: 0,
                index: 0,
            },
        ];
        controller.cacheHtml();

        expect(document.querySelector('span[data-track="0"]')?.getAttribute('data-asb-subtitle-index')).toBe('0');
    });

    it('reapplies a selected token highlight after its annotations update', () => {
        const controller = controllerForVideo();
        controller.dictionaryTrackSettings = makeDictionaryTracks(
            makeDictionaryTrack({ dictionaryColorizeSubtitles: true })
        );
        controller.setSubtitleSettings(defaultSettings);
        controller.subtitles = [
            makeSubtitle({
                index: 0,
                text: 'word',
                tokenization: { tokens: [makeToken({ pos: [0, 4], status: TokenStatus.UNKNOWN })] },
            }),
        ];
        controller.subtitles[0].tokenization!.tokens[0].status = TokenStatus.UNKNOWN;
        controller.cacheHtml();
        controller.playbackStateChanged({ timestampMs: 0, showingSubtitleIndexes: [0], paused: true });
        expect(selectTokenInRoot(document, { subtitleIndex: 0, tokenStart: 0 })).toBe(true);
        const originalToken = document.querySelector(`.${ASB_TOKEN_SELECTED_CLASS}`);
        const focusedElement = document.createElement('button');
        document.body.append(focusedElement);
        focusedElement.focus();

        controller.subtitles[0].tokenization!.tokens[0].status = TokenStatus.LEARNING;
        controller.cacheHtml();
        controller.refreshCurrentSubtitle = true;
        controller.refreshShowingSubtitles();

        const updatedToken = document.querySelector(`.${ASB_TOKEN_SELECTED_CLASS}`);
        expect(updatedToken).not.toBeNull();
        expect(updatedToken).not.toBe(originalToken);
        expect(document.getSelection()?.toString()).toBe('word');
        expect(document.activeElement).toBe(focusedElement);
    });

    it('selects tokens only in this controller when multiple video bindings share a document', () => {
        const firstController = controllerForVideo();
        const secondController = controllerForVideo();
        for (const controller of [firstController, secondController]) {
            controller.dictionaryTrackSettings = makeDictionaryTracks(
                makeDictionaryTrack({ dictionaryColorizeSubtitles: true })
            );
            controller.setSubtitleSettings(defaultSettings);
            controller.subtitles = [
                makeSubtitle({
                    index: 0,
                    text: 'word',
                    tokenization: { tokens: [makeToken({ pos: [0, 4], status: TokenStatus.UNKNOWN })] },
                }),
            ];
            controller.subtitles[0].tokenization!.tokens[0].status = TokenStatus.UNKNOWN;
            controller.cacheHtml();
            controller.playbackStateChanged({ timestampMs: 0, showingSubtitleIndexes: [0], paused: true });
        }

        const containers = document.querySelectorAll('.asbplayer-subtitles-container-bottom');
        expect(containers).toHaveLength(2);
        expect(Array.from(containers, (container) => container.querySelectorAll('.asb-token').length)).toEqual([1, 1]);
        expect(firstController.selectToken({ subtitleIndex: 0, tokenStart: 0 })).toBe(true);
        expect(containers[0].querySelector(`.${ASB_TOKEN_SELECTED_CLASS}`)).not.toBeNull();
        expect(containers[1].querySelector(`.${ASB_TOKEN_SELECTED_CLASS}`)).toBeNull();
        expect(firstController.currentTokenSelectionLocation()).toEqual({ subtitleIndex: 0, tokenStart: 0 });
        expect(secondController.currentTokenSelectionLocation()).toBeUndefined();
    });

    it('rerenders the current subtitle when appearance or alignment settings change', () => {
        const controller = controllerForVideo();
        controller.setSubtitleSettings({ ...defaultSettings, subtitleColor: '#ff0000' });
        controller.subtitles = [
            {
                text: 'subtitle',
                start: 0,
                end: 1000,
                originalStart: 0,
                originalEnd: 1000,
                track: 0,
                index: 0,
            },
        ];
        controller.cacheHtml();
        controller.playbackStateChanged({ timestampMs: 0, showingSubtitleIndexes: [0], paused: false });

        expect(document.querySelector('.asbplayer-subtitles-container-bottom span')?.getAttribute('style')).toContain(
            'color: #ff0000'
        );

        controller.setSubtitleSettings({
            ...defaultSettings,
            subtitleColor: '#0000ff',
            subtitleAlignment: 'top',
        });

        expect(document.querySelector('.asbplayer-subtitles-container-bottom span')).toBeNull();
        expect(document.querySelector('.asbplayer-subtitles-container-top span')?.getAttribute('style')).toContain(
            'color: #0000ff'
        );
    });

    it('clears the loaded subtitle filename after its timeout when no subtitle is showing', () => {
        jest.useFakeTimers();
        const controller = controllerForVideo();
        controller.subtitleFileNames = ['episode.srt'];
        controller.playbackStateChanged({
            timestampMs: 0,
            showingSubtitleIndexes: [],
            invisibleSubtitleIndexes: [],
            paused: true,
        });

        controller.showLoadedMessage([]);
        expect(document.querySelector('.asbplayer-subtitles-container-bottom')?.textContent).toContain('episode.srt');

        jest.advanceTimersByTime(1000);

        expect(document.querySelector('.asbplayer-subtitles-container-bottom')?.textContent).not.toContain(
            'episode.srt'
        );
    });

    it('renders layout placeholders invisibly and supports playback states from older clients', () => {
        const controller = controllerForVideo();
        controller.setSubtitleSettings(defaultSettings);
        controller.subtitles = [
            {
                text: 'primary',
                start: 0,
                end: 3000,
                originalStart: 0,
                originalEnd: 3000,
                track: 0,
                index: 0,
            },
            {
                text: 'secondary',
                start: 1000,
                end: 2000,
                originalStart: 1000,
                originalEnd: 2000,
                track: 1,
                index: 1,
            },
        ];
        controller.cacheHtml();

        controller.playbackStateChanged({
            timestampMs: 0,
            showingSubtitleIndexes: [0],
            invisibleSubtitleIndexes: [1],
            paused: false,
        });

        const secondary = document.querySelector<HTMLElement>('span[data-track="1"]')?.parentElement;
        const container = document.querySelector<HTMLElement>('.asbplayer-subtitles-container-bottom');
        const primary = document.querySelector<HTMLElement>('span[data-track="0"]')?.parentElement;
        expect(container?.style.getPropertyValue('pointer-events')).toBe('none');
        expect(primary?.style.pointerEvents).toBe('auto');
        expect(secondary?.style.visibility).toBe('hidden');
        expect(secondary?.style.pointerEvents).toBe('none');
        expect(secondary?.getAttribute('aria-hidden')).toBe('true');

        controller.playbackStateChanged({ timestampMs: 1000, showingSubtitleIndexes: [0, 1], paused: false });

        expect(document.querySelector<HTMLElement>('span[data-track="1"]')?.parentElement?.style.visibility).toBe('');
    });

    it('excludes invisible layout placeholders from hover hit testing', () => {
        const controller = controllerForVideo();
        controller.setSubtitleSettings(defaultSettings);
        controller.subtitles = [
            {
                text: 'visible',
                start: 0,
                end: 3000,
                originalStart: 0,
                originalEnd: 3000,
                track: 0,
                index: 0,
            },
            {
                text: 'placeholder',
                start: 1000,
                end: 2000,
                originalStart: 1000,
                originalEnd: 2000,
                track: 1,
                index: 1,
            },
        ];
        controller.cacheHtml();
        controller.playbackStateChanged({
            timestampMs: 0,
            showingSubtitleIndexes: [0],
            invisibleSubtitleIndexes: [1],
            paused: false,
        });

        const container = document.querySelector<HTMLElement>('.asbplayer-subtitles-container-bottom')!;
        const visible = document.querySelector<HTMLElement>('span[data-track="0"]')!.parentElement!;
        const placeholder = document.querySelector<HTMLElement>('span[data-track="1"]')!.parentElement!;
        container.getBoundingClientRect = () => ({ x: 100, y: 100, width: 100, height: 80 }) as DOMRect;
        visible.getBoundingClientRect = () => ({ x: 100, y: 100, width: 100, height: 20 }) as DOMRect;
        placeholder.getBoundingClientRect = () => ({ x: 100, y: 140, width: 100, height: 20 }) as DOMRect;

        expect(controller.intersects(110, 110)).toBe(true);
        expect(controller.intersects(110, 155)).toBe(false);
    });

    it('filters hidden subtitles without removing unhidden layout placeholders', () => {
        const controller = controllerForVideo();
        controller.setSubtitleSettings(defaultSettings);
        controller.subtitles = [
            {
                text: 'primary',
                start: 0,
                end: 3000,
                originalStart: 0,
                originalEnd: 3000,
                track: 0,
                index: 0,
            },
            {
                text: 'placeholder',
                start: 1000,
                end: 2000,
                originalStart: 1000,
                originalEnd: 2000,
                track: 1,
                index: 1,
            },
        ];
        controller.cacheHtml();

        controller.playbackStateChanged({
            timestampMs: 0,
            showingSubtitleIndexes: [0],
            invisibleSubtitleIndexes: [1],
            hiddenSubtitleIndexes: [0],
            paused: false,
        });

        const container = document.querySelector('.asbplayer-subtitles-container-bottom');
        expect(container?.querySelector('span[data-track="0"]')).toBeNull();
        expect(container?.querySelector<HTMLElement>('span[data-track="1"]')?.parentElement?.style.visibility).toBe(
            'hidden'
        );

        controller.playbackStateChanged({
            timestampMs: 0,
            showingSubtitleIndexes: [0],
            invisibleSubtitleIndexes: [1],
            hiddenSubtitleIndexes: [0, 1],
            paused: false,
        });

        expect(container?.querySelector('span[data-track="0"]')).toBeNull();
        expect(container?.querySelector('span[data-track="1"]')).toBeNull();
    });

    // The video is 640px wide and the viewport is 1024px wide in these tests
    const containerWidthFor = (width: number, unit: SubtitlesWidthUnit) => {
        const controller = controllerForVideo();
        controller.setSubtitleSettings({ ...defaultSettings, subtitlesWidth: width, subtitlesWidthUnit: unit });
        controller.setSubtitlesWidth(width, unit);
        controller.subtitles = [
            {
                text: 'subtitle',
                start: 0,
                end: 1000,
                originalStart: 0,
                originalEnd: 1000,
                track: 0,
                index: 0,
            },
        ];
        controller.playbackStateChanged({ timestampMs: 0, showingSubtitleIndexes: [0], paused: false });
        controller.refresh();

        const containers = document.querySelectorAll<HTMLElement>('.asbplayer-subtitles-container-bottom');
        return containers[containers.length - 1]?.style.width;
    };

    it('applies the subtitle width as a percentage of the video', () => {
        expect(containerWidthFor(50, '%')).toBe('320px');
    });

    it('applies the subtitle width in pixels', () => {
        expect(containerWidthFor(800, 'px')).toBe('800px');
    });

    it('caps the subtitle width at the viewport width', () => {
        expect(containerWidthFor(2000, 'px')).toBe(`${Math.min(window.innerWidth, 2000)}px`);
    });
});

describe('frozen attested discussion and return to original cue', () => {
    it('survives normal playback without DOM selection, but refuses changed source/track and arbitrary seek', async () => {
        const video = document.createElement('video');
        document.body.append(video);
        video.getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 360 }) as DOMRect;
        const seek = jest.fn(async (_timestamp: number) => {});
        const context = { video, registeredVideoSrc: 'https://example.com/video.mp4', currentTimeMs: 12750, seek };
        const controller = new SubtitleController(
            context as unknown as Binding,
            { publishStatisticsSnapshot: async () => {} } as unknown as DictionaryProvider,
            {
                activeProfile: async () => undefined,
                getAll: async () => defaultSettings,
                getSingle: async (key: keyof typeof defaultSettings) => defaultSettings[key],
            } as unknown as SettingsProvider
        );
        try {
            class Cue {
                constructor(
                    public startTime: number,
                    public endTime: number,
                    public text: string
                ) {}
            }
            Object.defineProperty(globalThis, 'VTTCue', { value: Cue, configurable: true });
            Object.defineProperty(video, 'textTracks', {
                value: [{ label: 'English', language: 'en', cues: [new Cue(12, 14.5, 'Can you bank on him?')] }],
                configurable: true,
            });
            controller.setSubtitleSettings(defaultSettings);
            controller.subtitleFileNames = ['English'];
            controller.subtitles = [
                {
                    text: 'Can you bank on him?',
                    start: 12750,
                    end: 15250,
                    originalStart: 12000,
                    originalEnd: 14500,
                    track: 0,
                    index: 0,
                },
            ];
            const c = controller as any;
            c._forceHideSubtitles = false;
            c._displaySubtitles = true;
            c.showingLoadedMessage = false;
            controller.cacheHtml();
            controller.playbackStateChanged({
                timestampMs: 12750,
                paused: false,
                showingSubtitleIndexes: [0],
                invisibleSubtitleIndexes: [],
            });
            const node = [...document.querySelectorAll<HTMLElement>('[data-asb-study-cue]')].find((n) =>
                c.studyCueNodes.has(n)
            )!;
            expect(node).toBeDefined();
            node.getClientRects = () => [{ left: 0, right: 100, top: 0, bottom: 20 }] as any;
            const text = document.createTreeWalker(node, NodeFilter.SHOW_TEXT).nextNode()!;
            const range = document.createRange();
            range.setStart(text, 8);
            range.setEnd(text, 15);
            getSelection()!.removeAllRanges();
            getSelection()!.addRange(range);
            const { adjacentCues, ...hint } = JSON.parse(node.dataset.asbStudyCue!);
            Object.assign(hint, { selectionStart: 8, selectionEnd: 15, word: 'bank on' });
            // Provider/API subtitles or external overlays are not native TextTrack proof.
            const nativeTrack = { label: 'English', language: 'en', cues: [new Cue(12, 14.5, 'Can you bank on him?')] };
            for (const tracks of [
                [],
                [{ ...nativeTrack, label: 'English.vtt' }],
                [{ ...nativeTrack, language: 'ja' }],
                [{ ...nativeTrack, cues: [new Cue(12, 14.6, 'Can you bank on him?')] }],
            ]) {
                Object.defineProperty(video, 'textTracks', { value: tracks, configurable: true });
                expect(controller.confirmStudyCue(hint).ok).toBe(false);
            }
            Object.defineProperty(video, 'textTracks', { value: [nativeTrack], configurable: true });
            expect(controller.confirmStudyCue(hint).ok).toBe(true);
            getSelection()!.removeAllRanges();
            node.remove();
            controller.playbackStateChanged({
                timestampMs: 20000,
                paused: false,
                showingSubtitleIndexes: [],
                invisibleSubtitleIndexes: [],
            });
            expect(controller.revalidateStudyCue(hint).ok).toBe(true);
            expect((await controller.returnToStudyCue(hint)).ok).toBe(true);
            expect(seek).toHaveBeenCalledWith(12750);
            expect((await controller.returnToStudyCue({ ...hint, originalStartMs: 10 })).ok).toBe(false);
            expect(seek).toHaveBeenCalledTimes(1);
            controller.subtitleFileNames = ['Other'];
            expect(controller.revalidateStudyCue(hint).ok).toBe(false);
            controller.subtitleFileNames = ['English'];
            controller.subtitles = [...controller.subtitles];
            expect(controller.revalidateStudyCue(hint).ok).toBe(false);
        } finally {
            controller.unbind();
            document.body.replaceChildren();
        }
    });
});
