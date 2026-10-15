const ACTIONS = new Set([
    'videoSource',
    'videoSave',
    'videoRead',
    'videoPage',
    'videoTranslate',
    'videoContinue',
    'videoEvent',
]);

/** No externally-connectable/page-message endpoint. Only our content scripts can use this route. */
export function handleStudyVideoMessage(
    request: { sender?: string; payload?: Record<string, unknown> },
    sender: Browser.runtime.MessageSender,
    respond: (r: unknown) => void
) {
    if (request?.sender !== 'study-video') return;
    if (sender.id !== browser.runtime.id || !sender.tab || !ACTIONS.has(String(request.payload?.action))) {
        respond({ ok: false, error: '不允许的视频桥来源或动作。' });
        return false;
    }
    const payload = { ...request.payload };
    if (payload.action === 'videoSource') {
        // Bind the long-term source to the owning tab, not a signed media URL or a frame's claim.
        const url = sender.tab.url;
        if (!url || !/^https?:\/\//.test(url)) {
            respond({ ok: false, error: '当前页没有可保存的 HTTP(S) 视频来源。' });
            return false;
        }
        respond({ ok: true, result: { url, title: (sender.tab.title || '视频').slice(0, 300) } });
        return false;
    }
    browser.runtime
        .sendNativeMessage('com.suifracti.study_translator', payload)
        .then(respond)
        .catch(() =>
            respond({ ok: false, error: '本机桥不可用；请安装更新后的桥，并重载 asbplayer 以启用本机通信。' })
        );
    return true;
}
