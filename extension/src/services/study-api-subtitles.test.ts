import { retrieveStudyApiTrack, studyPageKey } from './study-api-subtitles';
const page = 'https://www.youtube.com/watch?v=abcdefghijk';
const url = 'https://www.youtube.com/api/timedtext?v=abcdefghijk&lang=en&fmt=srv3';
const player = {
    videoDetails: { videoId: 'abcdefghijk' },
    captions: { playerCaptionsTracklistRenderer: { captionTracks: [{ baseUrl: url, languageCode: 'en' }] } },
};
const fetcher = (payload = player, caption = '<timedtext>real API content</timedtext>') =>
    (async (input: any) => ({
        ok: true,
        url: String(input),
        text: async () =>
            String(input).includes('/api/timedtext')
                ? caption
                : `var ytInitialPlayerResponse = ${JSON.stringify(payload)};`,
        json: async () => payload,
    })) as typeof fetch;
test('independent HTTPS provider response, not DOM metadata, authorizes the selected YouTube API track', async () => {
    const result = await retrieveStudyApiTrack(page, url, 'en', fetcher());
    expect(result?.text).toBe('<timedtext>real API content</timedtext>');
    expect(result?.language).toBe('en');
    expect(result?.pageKey).toBe('youtube:abcdefghijk');
});
test('wrong video, unadvertised URL/language, translations, hostile host and empty body fail closed', async () => {
    for (const [p, u, lang, f] of [
        [page, url, 'en', fetcher({ ...player, videoDetails: { videoId: 'other' } })],
        [page, url.replace('lang=en', 'lang=ja'), 'en', fetcher()],
        [page, url, 'ja', fetcher()],
        [page, url + '&tlang=en', 'en', fetcher()],
        [page, url.replace('www.youtube.com', 'evil.example'), 'en', fetcher()],
        [page, url, 'en', fetcher(player, '')],
    ] as const)
        expect(await retrieveStudyApiTrack(p, u, lang, f)).toBeUndefined();
});
test('Bilibili independently binds bvid, selected part/cid and advertised subtitle URL', async () => {
    const bili = 'https://www.bilibili.com/video/BV1abcdefghi?p=2';
    const captionUrl = 'https://aisubtitle.hdslb.com/bfs/subtitle/test.json';
    const f = (async (input: any) => {
        const u = String(input);
        const data = u.includes('/view?')
            ? { code: 0, data: { bvid: 'BV1abcdefghi', aid: 123, pages: [{ cid: 7 }, { cid: 8 }] } }
            : { code: 0, data: { subtitle: { subtitles: [{ lan: 'en', subtitle_url: captionUrl }] } } };
        return {
            ok: true,
            url: u,
            json: async () => data,
            text: async () =>
                u.includes('api.bilibili.com')
                    ? JSON.stringify(data)
                    : '{"body":[{"from":1,"to":2,"content":"A real cue."}]}',
        };
    }) as typeof fetch;
    expect((await retrieveStudyApiTrack(bili, captionUrl, 'en', f))?.pageKey).toBe('bilibili:BV1abcdefghi:2');
    expect(studyPageKey(bili.replace('p=2', 'p=1'))).not.toBe(studyPageKey(bili));
    expect(await retrieveStudyApiTrack(bili, captionUrl.replace('hdslb.com', 'evil.example'), 'en', f)).toBeUndefined();
});

test('provider catalog supplies actual Bilibili tracks without trusting page discovery events', async () => {
    const { discoverStudyApiTracks } = await import('./study-api-subtitles');
    const f = (async (input: any) => {
        const u = String(input);
        const data = u.includes('/view?')
            ? { code: 0, data: { bvid: 'BV1abcdefghi', aid: 123, pages: [{ cid: 7 }] } }
            : {
                  code: 0,
                  data: {
                      subtitle: {
                          subtitles: [{ lan: 'en', lan_doc: 'English', subtitle_url: '//aisubtitle.hdslb.com/a.json' }],
                      },
                  },
              };
        return { ok: true, url: u, text: async () => JSON.stringify(data) };
    }) as typeof fetch;
    const catalog = await discoverStudyApiTracks('https://www.bilibili.com/video/BV1abcdefghi', f);
    expect(catalog?.[0]?.language).toBe('en');
    expect(catalog?.[0]?.extension).toBe('bbjson');
});

test('uses native mainland wbi player metadata when legacy player endpoint has no CC tracks', async () => {
    const { discoverStudyApiTracks } = await import('./study-api-subtitles');
    const f = (async (input: any) => {
        const u = String(input);
        const data = u.includes('/view?')
            ? { code: 0, data: { bvid: 'BV1abcdefghi', aid: 123, pages: [{ cid: 7 }] } }
            : {
                  code: 0,
                  data: {
                      subtitle: {
                          subtitles: u.includes('/wbi/')
                              ? [{ lan: 'en', lan_doc: 'English', subtitle_url: '//aisubtitle.hdslb.com/a.json' }]
                              : [],
                      },
                  },
              };
        return { ok: true, url: u, text: async () => JSON.stringify(data) };
    }) as typeof fetch;
    expect((await discoverStudyApiTracks('https://www.bilibili.com/video/BV1abcdefghi', f))?.[0]?.language).toBe('en');
});
