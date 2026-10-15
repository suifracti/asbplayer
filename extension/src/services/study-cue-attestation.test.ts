/** @jest-environment node */
import { StudyCueAttestation, YOMITAN_ID, type CueHint } from './study-cue-attestation';

const url = 'https://example.test/video';
const cue: CueHint = {
    version: 1,
    sourceRevision: 'private-revision',
    text: 'Can you bank on him?',
    cueIndex: 1,
    trackIndex: 0,
    trackName: 'English',
    language: 'en',
    originalStartMs: 12000,
    originalEndMs: 14500,
    subtitleOffsetMs: 750,
    url,
    selectionStart: 8,
    selectionEnd: 15,
    word: 'bank on',
};
const source = { tabId: 3, frameId: 0, documentId: 'doc-1', url };
const sender = { id: YOMITAN_ID };
const request = { kind: 'study-cue-attest', phase: 'prepare', queryId: 'query-1', source, cue };

describe('private cue attestation, never persistence', () => {
    let now: number;
    let live: boolean;
    let service: StudyCueAttestation;
    beforeEach(() => {
        now = 1000;
        live = true;
        let tokens = 0;
        service = new StudyCueAttestation(
            {
                getTab: async () => ({ url, title: 'Synthetic' }),
                check: async (_s, h) => (live ? { ok: true, cue: h, video: 'private-video' } : { ok: false }),
            },
            () => now,
            () => `token-${++tokens}`
        );
    });
    test('only pinned extension can prepare', async () => {
        expect((await service.handle(request, { id: 'foreign' })).ok).toBe(false);
        expect((await service.handle(request, sender)).ok).toBe(true);
    });
    test('real cue consumes once, binds browser source, grants no write', async () => {
        const prepared = await service.handle(request, sender);
        const consume = { ...request, phase: 'consume', receipt: prepared.receipt };
        const result = await service.handle(consume, sender);
        expect(result.ok).toBe(true);
        expect(result.source.url).toBe(url);
        expect(result.writeAuthorized).toBe(false);
        expect((await service.handle(consume, sender)).ok).toBe(false);
    });
    test.each([
        ['foreign URL', { url: 'https://evil.test' }],
        ['unknown language', { language: null }],
        ['unknown track', { trackName: null }],
        ['selected mismatch', { word: 'fake' }],
        ['invalid time', { originalEndMs: NaN }],
        ['reversed selection', { selectionEnd: 0 }],
    ])('%s rejected', async (_name, change) => {
        expect((await service.handle({ ...request, cue: { ...cue, ...change } }, sender)).ok).toBe(false);
    });
    test('cross frame rejected', async () => {
        expect((await service.handle({ ...request, source: { ...source, frameId: 2 } }, sender)).ok).toBe(false);
    });
    test('expiry and changed current cue rejected on consume', async () => {
        let prepared = await service.handle(request, sender);
        now += 5001;
        expect((await service.handle({ ...request, phase: 'consume', receipt: prepared.receipt }, sender)).ok).toBe(
            false
        );
        prepared = await service.handle(request, sender);
        live = false;
        expect((await service.handle({ ...request, phase: 'consume', receipt: prepared.receipt }, sender)).ok).toBe(
            false
        );
    });
    test('new query invalidates old receipt', async () => {
        const prepared = await service.handle(request, sender);
        await service.handle({ ...request, queryId: 'query-2' }, sender);
        expect((await service.handle({ ...request, phase: 'consume', receipt: prepared.receipt }, sender)).ok).toBe(
            false
        );
    });
    test('changed video binding rejected', async () => {
        let video = 'video-A';
        service = new StudyCueAttestation(
            { getTab: async () => ({ url }), check: async (_s, h) => ({ ok: true, cue: h, video }) },
            () => now,
            () => 'video-token'
        );
        const prepared = await service.handle(request, sender);
        video = 'video-B';
        expect((await service.handle({ ...request, phase: 'consume', receipt: prepared.receipt }, sender)).ok).toBe(
            false
        );
    });
    test('unvalidated extra page fields cannot become confirmed cue facts', async () => {
        const req = { ...request, cue: { ...cue, adjacentCues: ['forged neighbor'], publisher: 'fake' } };
        const prepared = await service.handle(req, sender);
        const result = await service.handle({ ...req, phase: 'consume', receipt: prepared.receipt }, sender);
        expect(result.ok).toBe(true);
        expect(result.cue.adjacentCues).toBeUndefined();
        expect(result.cue.publisher).toBeUndefined();
    });
    test('no awaited browser metadata read after final private consume observation', async () => {
        let privateChecks = 0;
        let current = true;
        service = new StudyCueAttestation(
            {
                getTab: async () => {
                    if (privateChecks === 2) current = false;
                    return { url, title: 'Synthetic' };
                },
                check: async (_s, h) => {
                    ++privateChecks;
                    return current ? { ok: true, cue: h, video: 'private-video' } : { ok: false };
                },
            },
            () => now,
            () => 'last-observation-token'
        );
        const prepared = await service.handle(request, sender);
        const result = await service.handle({ ...request, phase: 'consume', receipt: prepared.receipt }, sender);
        expect(result.ok && !current).toBe(false);
    });
});

describe('frozen cue private session, not DOM re-attestation', () => {
    test('only a consumed cue may revalidate or seek; playing ahead does not require a new selection', async () => {
        let mode: string | undefined;
        const service = new StudyCueAttestation({
            getTab: async () => ({ url }),
            check: async (_s, c, phase) => {
                mode = phase;
                return { ok: true, cue: c, video: 'owned' };
            },
        });
        expect((await service.handle({ ...request, phase: 'revalidate' }, sender)).ok).toBe(false);
        const p = await service.handle(request, sender);
        await service.handle({ ...request, phase: 'consume', receipt: p.receipt }, sender);
        expect((await service.handle({ ...request, phase: 'revalidate' }, sender)).ok).toBe(true);
        expect(mode).toBe('revalidate');
        expect((await service.handle({ ...request, phase: 'seek' }, sender)).ok).toBe(true);
        expect(mode).toBe('seek');
        expect(
            (await service.handle({ ...request, phase: 'seek', cue: { ...cue, originalStartMs: 123 } }, sender)).ok
        ).toBe(false);
        expect((await service.handle({ ...request, phase: 'seek', source: { ...source, tabId: 4 } }, sender)).ok).toBe(
            false
        );
        expect((await service.handle({ ...request, phase: 'seek' }, { id: 'page' })).ok).toBe(false);
    });
    test('source replacement or late revalidation invalidates a session', async () => {
        let live = true,
            clock = 1000;
        const service = new StudyCueAttestation(
            {
                getTab: async () => ({ url }),
                check: async (_s, c) => (live ? { ok: true, cue: c, video: 'owned' } : { ok: false }),
            },
            () => clock
        );
        const p = await service.handle(request, sender);
        await service.handle({ ...request, phase: 'consume', receipt: p.receipt }, sender);
        live = false;
        expect((await service.handle({ ...request, phase: 'revalidate' }, sender)).ok).toBe(false);
        live = true;
        expect((await service.handle({ ...request, phase: 'seek' }, sender)).ok).toBe(false);
        const q = await service.handle(request, sender);
        await service.handle({ ...request, phase: 'consume', receipt: q.receipt }, sender);
        clock += 1800001;
        expect((await service.handle({ ...request, phase: 'revalidate' }, sender)).ok).toBe(false);
    });
});
test('repeated same-cue lookup does not revoke an already open privately bound card', async () => {
    const service = new StudyCueAttestation({
        getTab: async () => ({ url }),
        check: async (_s, c) => ({ ok: true, cue: c, video: 'owned' }),
    });
    for (const queryId of ['query-1', 'query-2']) {
        const r = { ...request, queryId };
        const p = await service.handle(r, sender);
        expect((await service.handle({ ...r, phase: 'consume', receipt: p.receipt }, sender)).ok).toBe(true);
    }
    expect((await service.handle({ ...request, phase: 'revalidate' }, sender)).ok).toBe(true);
});
