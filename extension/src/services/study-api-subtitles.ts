/** Extension-owned provider retrieval. DOM metadata is only an untrusted track-selection hint. */
export type ApiTrackProof = { pageKey: string; language: string };
export const studyApiFiles = new WeakMap<File, ApiTrackProof>();
export const studyApiSerialized = new WeakMap<object, ApiTrackProof>();

export function studyPageKey(raw: string): string | undefined {
    try {
        const u = new URL(raw);
        if (u.protocol !== 'https:') return;
        if (['www.youtube.com', 'youtube.com', 'm.youtube.com'].includes(u.hostname)) {
            const id =
                u.pathname === '/watch'
                    ? u.searchParams.get('v')
                    : /^\/(?:shorts|embed)\/([\w-]{11})$/.exec(u.pathname)?.[1];
            if (id && /^[\w-]{11}$/.test(id)) return `youtube:${id}`;
        }
        if (u.hostname === 'www.bilibili.com' || u.hostname === 'bilibili.com') {
            const id = /^\/video\/(BV[\w]{10})(?:\/|$)/.exec(u.pathname)?.[1];
            const part = Number(u.searchParams.get('p') ?? 1);
            if (id && Number.isInteger(part) && part >= 1 && part <= 10000) return `bilibili:${id}:${part}`;
        }
    } catch {
        /* Unknown source is lookup-only. */
    }
}

function initialPlayer(html: string): any {
    const match = /(?:var\s+ytInitialPlayerResponse\s*=|window\["ytInitialPlayerResponse"\]\s*=)\s*/.exec(html);
    if (!match) return;
    const begin = match.index + match[0].length;
    if (html[begin] !== '{') return;
    let depth = 0,
        quoted = false,
        escaped = false;
    for (let i = begin; i < html.length; i++) {
        const c = html[i];
        if (quoted) {
            if (escaped) escaped = false;
            else if (c === '\\') escaped = true;
            else if (c === '"') quoted = false;
        } else if (c === '"') quoted = true;
        else if (c === '{') depth++;
        else if (c === '}' && --depth === 0) return JSON.parse(html.slice(begin, i + 1));
    }
}

const readProvider = async (url: string, limit: number, fetcher: typeof fetch, json = false) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
        const response = await fetcher(url, { credentials: 'include', redirect: 'error', signal: controller.signal });
        if (!response.ok || (response.url && new URL(response.url).origin !== new URL(url).origin))
            throw new Error('Provider response rejected');
        const value = await response.text();
        if (!value || value.length > limit) throw new Error('Empty or oversized provider response');
        return json ? JSON.parse(value) : value;
    } finally {
        clearTimeout(timeout);
    }
};

export async function retrieveStudyApiTrack(
    pageUrl: string,
    trackUrl: string,
    language: string,
    fetcher: typeof fetch = fetch
): Promise<{ text: string; language: string; pageKey: string } | undefined> {
    const pageKey = studyPageKey(pageUrl);
    if (!pageKey || !/^en(?:-|$)/.test(language)) return;
    try {
        const requested = new URL(trackUrl, pageUrl);
        if (requested.protocol !== 'https:' || requested.username || requested.password) return;
        const tracks = await discoverStudyApiTracks(pageUrl, fetcher);
        if (!tracks) return;
        const matches = tracks.filter((t) => {
            if (t.language !== language) return false;
            const candidate = new URL(t.url);
            return pageKey.startsWith('youtube:')
                ? ['v', 'lang', 'name', 'kind'].every(
                      (k) => candidate.searchParams.get(k) === requested.searchParams.get(k)
                  ) &&
                      candidate.origin === requested.origin &&
                      candidate.pathname === requested.pathname &&
                      !requested.searchParams.has('tlang')
                : candidate.href === requested.href;
        });
        if (matches.length !== 1) return;
        const verified = new URL(matches[0].url);
        if (pageKey.startsWith('youtube:')) {
            verified.searchParams.set('fmt', 'srv3');
            // PoToken is runtime routing, never identity or authority.
            if (requested.searchParams.has('pot')) verified.searchParams.set('pot', requested.searchParams.get('pot')!);
        }
        const verifiedUrl = verified.href;
        return { text: await readProvider(verifiedUrl, 2000000, fetcher), language: language.split('-')[0], pageKey };
    } catch {
        return;
    }
}

/** Only an ASB top-frame content script can request provider retrieval. No external or DOM entry point. */
export function installStudyApiRetrieval() {
    browser.runtime.onMessage.addListener((request, sender, reply) => {
        if (request?.kind !== 'study-api-track-private') return false;
        const { tab, frameId, documentId, url } = sender;
        if (
            sender.id !== browser.runtime.id ||
            frameId !== 0 ||
            !documentId ||
            !tab?.id ||
            typeof url !== 'string' ||
            (request.phase !== 'catalog' &&
                (typeof request.url !== 'string' || typeof request.language !== 'string' || request.url.length > 10000))
        ) {
            reply(undefined);
            return false;
        }
        void (async () => {
            if ((await browser.tabs.get(tab.id!)).url !== url) return;
            const result =
                request.phase === 'catalog'
                    ? await discoverStudyApiTracks(url)
                    : await retrieveStudyApiTrack(url, request.url, request.language);
            if ((await browser.tabs.get(tab.id!)).url !== url) return;
            // Document-targeted ping binds late replies to the original extension content world.
            const live = await browser.tabs.sendMessage(
                tab.id!,
                { sender: 'study-api-private-ping' },
                { frameId: 0, documentId }
            );
            if (live?.ok !== true) return;
            return result;
        })().then(reply, () => reply(undefined));
        return true;
    });
}

type ProviderTrack = { label: string; language: string; url: string; extension: string; id: string };
export async function discoverStudyApiTracks(
    pageUrl: string,
    fetcher: typeof fetch = fetch
): Promise<ProviderTrack[] | undefined> {
    const key = studyPageKey(pageUrl);
    if (!key) return;
    try {
        let tracks: ProviderTrack[];
        if (key.startsWith('youtube:')) {
            const id = key.slice(8);
            const payload = initialPlayer(
                await readProvider(`https://www.youtube.com/watch?v=${id}`, 6000000, fetcher)
            );
            if (
                payload?.videoDetails?.videoId !== id ||
                !Array.isArray(payload?.captions?.playerCaptionsTracklistRenderer?.captionTracks)
            )
                return;
            tracks = payload.captions.playerCaptionsTracklistRenderer.captionTracks.flatMap((t: any) => {
                if (
                    typeof t.baseUrl !== 'string' ||
                    typeof t.languageCode !== 'string' ||
                    !/^en(?:-|$)/.test(t.languageCode)
                )
                    return [];
                const u = new URL(t.baseUrl, 'https://www.youtube.com');
                if (
                    u.protocol !== 'https:' ||
                    u.hostname !== 'www.youtube.com' ||
                    u.pathname !== '/api/timedtext' ||
                    u.searchParams.get('v') !== id ||
                    u.searchParams.has('tlang')
                )
                    return [];
                u.searchParams.set('fmt', 'srv3');
                return [
                    {
                        label: t.name?.simpleText ?? t.name?.runs?.[0]?.text ?? t.languageCode,
                        language: t.languageCode,
                        url: u.href,
                        extension: 'ytsrv3',
                        id: u.href,
                    },
                ];
            });
        } else {
            const [, bvid, part] = key.split(':');
            const view = await readProvider(
                `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`,
                1000000,
                fetcher,
                true
            );
            const cid = view?.data?.pages?.[Number(part) - 1]?.cid,
                aid = view?.data?.aid;
            if (
                view?.code !== 0 ||
                view?.data?.bvid !== bvid ||
                !Number.isSafeInteger(cid) ||
                !Number.isSafeInteger(aid)
            )
                return;
            let player;
            for (const endpoint of ['x/player/wbi/v2', 'x/player/v2']) {
                try {
                    player = await readProvider(
                        `https://api.bilibili.com/${endpoint}?aid=${aid}&cid=${cid}`,
                        1000000,
                        fetcher,
                        true
                    );
                    if (player?.code === 0 && player?.data?.subtitle?.subtitles?.length > 0) break;
                } catch {
                    /* A blocked/unavailable endpoint does not authorize anything. */
                }
            }
            if (player?.code !== 0 || !Array.isArray(player?.data?.subtitle?.subtitles)) return;
            tracks = player.data.subtitle.subtitles.flatMap((t: any) => {
                if (typeof t.subtitle_url !== 'string' || typeof t.lan !== 'string' || !/^en(?:-|$)/.test(t.lan))
                    return [];
                const u = new URL(t.subtitle_url, 'https://www.bilibili.com');
                if (
                    u.protocol !== 'https:' ||
                    !(u.hostname === 'hdslb.com' || u.hostname.endsWith('.hdslb.com')) ||
                    u.username ||
                    u.password
                )
                    return [];
                return [{ label: t.lan_doc ?? t.lan, language: t.lan, url: u.href, extension: 'bbjson', id: u.href }];
            });
        }
        return tracks
            .filter((t) => typeof t.label === 'string' && t.label.length > 0 && t.label.length <= 200)
            .slice(0, 32);
    } catch {
        return;
    }
}
