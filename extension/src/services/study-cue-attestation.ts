/** Private extension-to-extension cue confirmation. Never grants persistence or Native capabilities. */
export const YOMITAN_ID = 'fdibnlkfllnojcmhcghkmdlceeegmhpf';
export const CUE_FIELDS = [
    'version',
    'sourceRevision',
    'text',
    'cueIndex',
    'trackIndex',
    'trackName',
    'language',
    'originalStartMs',
    'originalEndMs',
    'subtitleOffsetMs',
    'url',
    'selectionStart',
    'selectionEnd',
    'word',
] as const;
export type CueHint = Record<(typeof CUE_FIELDS)[number], any>;
export type CueSource = { tabId: number; frameId: number; documentId: string; url: string };
type Request = { kind: string; phase: string; queryId: string; source: CueSource; cue: CueHint; receipt?: string };
type Check = { ok: boolean; cue?: CueHint; video?: string };
type Api = {
    getTab: (id: number) => Promise<{ url?: string; title?: string }>;
    check: (source: CueSource, cue: CueHint, phase?: string) => Promise<Check>;
};
const denied = () => ({ ok: false, writeAuthorized: false });

export function validCue(c: CueHint): boolean {
    return (
        !!c &&
        c.version === 1 &&
        typeof c.sourceRevision === 'string' &&
        c.sourceRevision.length > 0 &&
        c.sourceRevision.length <= 100 &&
        typeof c.text === 'string' &&
        c.text.length > 0 &&
        c.text.length <= 2000 &&
        Number.isInteger(c.cueIndex) &&
        c.cueIndex >= 0 &&
        Number.isInteger(c.trackIndex) &&
        c.trackIndex >= 0 &&
        typeof c.trackName === 'string' &&
        c.trackName.length > 0 &&
        c.trackName.length <= 200 &&
        ['en', 'ja'].includes(c.language) &&
        [c.originalStartMs, c.originalEndMs, c.subtitleOffsetMs].every(Number.isFinite) &&
        c.originalStartMs >= 0 &&
        c.originalEndMs > c.originalStartMs &&
        c.originalEndMs <= 604800000 &&
        Math.abs(c.subtitleOffsetMs) <= 604800000 &&
        typeof c.url === 'string' &&
        /^https?:\/\//.test(c.url) &&
        c.url.length <= 2000 &&
        Number.isInteger(c.selectionStart) &&
        Number.isInteger(c.selectionEnd) &&
        c.selectionStart >= 0 &&
        c.selectionEnd > c.selectionStart &&
        c.selectionEnd <= c.text.length &&
        typeof c.word === 'string' &&
        c.text.slice(c.selectionStart, c.selectionEnd) === c.word
    );
}

export class StudyCueAttestation {
    private receipts = new Map<string, { request: Request; expires: number; generation: number; video: string }>();
    private latest = new Map<string, { generation: number; expires: number }>();
    private generation = 0;
    private sessions = new Map<string, { request: Request; expires: number; video: string }>();
    constructor(
        private api: Api,
        private now = () => Date.now(),
        private token: () => string = () => crypto.randomUUID()
    ) {}
    get size() {
        return this.receipts.size;
    }
    allowed(sender: { id?: string }) {
        return sender.id === YOMITAN_ID;
    }
    private key(source: CueSource) {
        return `${source.tabId}:${source.documentId}`;
    }
    private prune() {
        for (const [k, v] of this.receipts) if (v.expires <= this.now()) this.receipts.delete(k);
        for (const [k, v] of this.latest) if (v.expires <= this.now()) this.latest.delete(k);
        for (const [k, v] of this.sessions) if (v.expires <= this.now()) this.sessions.delete(k);
    }
    private async check(request: Request, phase?: string) {
        const { source, cue } = request;
        const tab = await this.api.getTab(source.tabId);
        if (tab.url !== source.url || cue.url !== tab.url) return null;
        const after = await this.api.getTab(source.tabId);
        if (after.url !== tab.url) return null;
        // The final awaited observation must be private cue state, never an unrelated metadata read.
        const result = await this.api.check(source, cue, phase);
        // Content reply is extension-owned, but enforce the complete agreed identity here too.
        if (
            !result.ok ||
            typeof result.video !== 'string' ||
            !result.video ||
            !result.cue ||
            !CUE_FIELDS.every((k) => result.cue![k] === cue[k])
        )
            return null;
        return { video: result.video, title: (after.title ?? '').slice(0, 300) };
    }
    async handle(request: Request, sender: { id?: string }): Promise<any> {
        this.prune();
        if (
            !this.allowed(sender) ||
            request?.kind !== 'study-cue-attest' ||
            typeof request.queryId !== 'string' ||
            !/^[a-zA-Z0-9-]{1,100}$/.test(request.queryId) ||
            !request.source ||
            !Number.isInteger(request.source.tabId) ||
            request.source.tabId < 0 ||
            request.source.frameId !== 0 ||
            typeof request.source.documentId !== 'string' ||
            !request.source.documentId ||
            request.source.documentId.length > 100 ||
            !validCue(request.cue) ||
            request.source.url !== request.cue.url
        )
            return denied();
        // Only checked fields may cross the privileged boundary; neighbors/page extras are not attested.
        request = {
            ...request,
            cue: Object.fromEntries(CUE_FIELDS.map((k) => [k, request.cue[k]])) as CueHint,
            source: {
                tabId: request.source.tabId,
                frameId: 0,
                documentId: request.source.documentId,
                url: request.source.url,
            },
        };
        const key = this.key(request.source);
        const sessionKey = `${key}:${request.queryId}`;
        try {
            if (request.phase === 'revalidate' || request.phase === 'seek') {
                const session = this.sessions.get(sessionKey);
                if (
                    !session ||
                    session.request.queryId !== request.queryId ||
                    JSON.stringify(session.request.source) !== JSON.stringify(request.source) ||
                    !CUE_FIELDS.every((k) => session.request.cue[k] === request.cue[k])
                )
                    return denied();
                const checked = await this.check(request, request.phase);
                if (!checked || checked.video !== session.video || this.sessions.get(sessionKey) !== session) {
                    if (this.sessions.get(sessionKey) === session) this.sessions.delete(sessionKey);
                    return denied();
                }
                session.expires = this.now() + 1800000;
                return {
                    ok: true,
                    queryId: request.queryId,
                    cue: request.cue,
                    source: { ...request.source, title: checked.title },
                    expires: this.now() + 5000,
                    writeAuthorized: false,
                };
            }
            if (request.phase === 'prepare') {
                if (this.latest.size >= 128 || this.receipts.size >= 128) return denied();
                const generation = ++this.generation;
                const expires = this.now() + 5000;
                this.latest.set(key, { generation, expires });
                const checked = await this.check(request);
                if (!checked || this.now() >= expires || this.latest.get(key)?.generation !== generation)
                    return denied();
                const receipt = this.token();
                this.receipts.set(receipt, {
                    request: structuredClone(request),
                    expires,
                    generation,
                    video: checked.video,
                });
                return { ok: true, receipt, queryId: request.queryId, expires, writeAuthorized: false };
            }
            if (request.phase !== 'consume' || typeof request.receipt !== 'string') return denied();
            const stored = this.receipts.get(request.receipt);
            this.receipts.delete(request.receipt); // Single use even when revalidation fails.
            if (
                !stored ||
                stored.expires <= this.now() ||
                this.latest.get(key)?.generation !== stored.generation ||
                JSON.stringify(stored.request.source) !== JSON.stringify(request.source) ||
                stored.request.queryId !== request.queryId ||
                !CUE_FIELDS.every((k) => stored.request.cue[k] === request.cue[k])
            )
                return denied();
            const checked = await this.check(request);
            if (
                !checked ||
                checked.video !== stored.video ||
                this.now() >= stored.expires ||
                this.latest.get(key)?.generation !== stored.generation
            )
                return denied();
            if (this.sessions.size >= 128 && !this.sessions.has(sessionKey)) return denied();
            this.sessions.set(sessionKey, {
                request: structuredClone(request),
                expires: this.now() + 1800000,
                video: checked.video,
            });
            return {
                ok: true,
                queryId: request.queryId,
                cue: request.cue,
                source: { ...request.source, title: checked.title },
                expires: stored.expires,
                writeAuthorized: false,
            };
        } catch {
            return denied();
        }
    }
}

export function installStudyCueAttestation() {
    const service = new StudyCueAttestation({
        getTab: (id) => browser.tabs.get(id),
        check: (source, cue, phase) =>
            browser.tabs.sendMessage(
                source.tabId,
                { sender: 'study-cue-private', cue, phase },
                { frameId: 0, documentId: source.documentId }
            ),
    });
    browser.runtime.onMessageExternal.addListener((request, sender, reply) => {
        if (request?.kind !== 'study-cue-attest') return false;
        void service.handle(request, sender).then(reply);
        return true;
    });
}
