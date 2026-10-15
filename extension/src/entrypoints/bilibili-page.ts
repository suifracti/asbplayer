import { discoverStudyApiTracks } from '../services/study-api-subtitles';
import { extractExtension, inferTracks } from '@/pages/util';

export default defineUnlistedScript(() => {
    inferTracks({
        onJson: (value, addTrack) => {
            // Native mainland CC metadata. Page observations are discovery hints only;
            // the private background provider independently verifies any R2 authority.
            const nativeTracks = value?.data?.subtitle?.subtitles;
            if (Array.isArray(nativeTracks)) {
                for (const track of nativeTracks) {
                    if (typeof track.lan !== 'string' || typeof track.subtitle_url !== 'string') continue;
                    try {
                        const url = new URL(track.subtitle_url, 'https://www.bilibili.com');
                        if (
                            url.protocol !== 'https:' ||
                            !(url.hostname === 'hdslb.com' || url.hostname.endsWith('.hdslb.com')) ||
                            url.username ||
                            url.password
                        )
                            continue;
                        addTrack({
                            label: track.lan_doc || track.lan,
                            language: track.lan,
                            url: url.href,
                            extension: 'bbjson',
                        });
                    } catch {
                        /* Ignore malformed discovery hints. */
                    }
                }
            }
            if (value?.data?.subtitles instanceof Array) {
                for (const track of value.data.subtitles) {
                    if (
                        typeof track.lang === 'string' &&
                        typeof track.lang_key === 'string' &&
                        ((typeof track.srt === 'object' && typeof track.srt.url === 'string') ||
                            typeof track.url === 'string')
                    ) {
                        const url = track.srt?.url ?? track.url;
                        const extension = extractExtension(url, 'srt');

                        addTrack({
                            label: track.lang,
                            language: track.lang_key,
                            url,
                            extension: extension === 'json' ? 'bbjson' : extension,
                        });
                    }
                }
            }
        },
        onRequest: async (addTrack, setBasename) => {
            setBasename(document.title);
            // Cover discovery opened after the player's initial metadata response.
            const tracks = await discoverStudyApiTracks(location.href);
            for (const track of tracks ?? []) addTrack(track);
        },
        waitForBasename: false,
    });
});
