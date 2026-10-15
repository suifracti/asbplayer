let mockHooks: any;
jest.mock(
    '@/pages/util',
    () => ({
        inferTracks: (hooks: any) => {
            mockHooks = hooks;
        },
        extractExtension: (url: string, fallback: string) => url.split(/[?#]/)[0].split('.').pop() || fallback,
    }),
    { virtual: true }
);
jest.mock('../services/study-api-subtitles', () => ({ discoverStudyApiTracks: async () => [] }));
beforeAll(() => {
    (globalThis as any).defineUnlistedScript = (callback: () => void) => callback();
    require('../entrypoints/bilibili-page');
});
afterAll(() => {
    delete (globalThis as any).defineUnlistedScript;
});
test('detects mainland native CC response with English and English US, not only international fields', () => {
    const add = jest.fn();
    mockHooks.onJson(
        {
            data: {
                subtitle: {
                    subtitles: [
                        { lan: 'en', lan_doc: 'English', subtitle_url: '//aisubtitle.hdslb.com/a.json' },
                        { lan: 'en-US', lan_doc: 'English(US)', subtitle_url: 'https://aisubtitle.hdslb.com/b.json' },
                    ],
                },
            },
        },
        add
    );
    expect(add.mock.calls.map(([t]) => [t.language, t.extension])).toEqual([
        ['en', 'bbjson'],
        ['en-US', 'bbjson'],
    ]);
    expect(add.mock.calls[0][0].url).toBe('https://aisubtitle.hdslb.com/a.json');
});
test('keeps international Bilibili discovery and rejects malformed mainland rows', () => {
    const add = jest.fn();
    mockHooks.onJson(
        { data: { subtitles: [{ lang: 'English', lang_key: 'en', url: 'https://example.com/a.srt' }] } },
        add
    );
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ language: 'en', extension: 'srt' }));
    add.mockClear();
    mockHooks.onJson(
        { data: { subtitle: { subtitles: [{ lan: 'en' }, { subtitle_url: 'https://aisubtitle.hdslb.com/a.json' }] } } },
        add
    );
    expect(add).not.toHaveBeenCalled();
});
