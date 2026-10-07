import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const require = createRequire(new URL('extension/package.json', root));
const ts = require('typescript');

async function createFetcher() {
    let configReads = 0;
    const staleStrings = {action: {close: 'Close'}};
    const context = vm.createContext({
        URL,
        browser: {
            runtime: {getURL: (path) => `https://extension.test${path}`},
            storage: {local: {
                get: async (key) => ({[key]: key.startsWith('locStrings-') ? staleStrings : 1}),
                set: async () => {},
            }},
        },
        fetch: async (url) => ({json: async () => JSON.parse(readFileSync(new URL(`common/locales/${new URL(url).pathname.split('/').pop()}`, root), 'utf8'))}),
    });
    const mocks = {
        '@project/common/util/log': {asbError: () => {}},
        '@project/extension/src/services/extension-config': {fetchExtensionConfig: async () => {configReads++; return {languages: []};}},
        '@project/common/settings': {SettingsProvider: class {}, supportedLanguages: ['en', 'zh_CN']},
        '@project/extension/src/services/extension-settings-storage': {ExtensionSettingsStorage: class {}},
    };
    const source = readFileSync(new URL('extension/src/services/localization-fetcher.ts', root), 'utf8');
    const code = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}).outputText;
    const module = new vm.SourceTextModule(code, {context, initializeImportMeta: (meta) => {meta.env = {MODE: 'production'};}});
    await module.link((name) => {
        assert.ok(mocks[name], `Unexpected dependency: ${name}`);
        return new vm.SyntheticModule(Object.keys(mocks[name]), function () {
            for (const [key, value] of Object.entries(mocks[name])) {this.setExport(key, value);}
        }, {context});
    });
    await module.evaluate();
    return {api: module.namespace, configReads: () => configReads, staleStrings};
}

test('production Chinese lookup uses our bundled translations even with an old remote cache', async () => {
    const {api} = await createFetcher();
    const result = await api.fetchLocalization('zh_CN');
    assert.equal(result.strings.action.close, '关闭');
    assert.match(result.strings.ftue.welcome, /欢迎/);
});

test('personal Chinese resources are not replaced by remote language priming', async () => {
    const {api, configReads} = await createFetcher();
    await api.primeLocalization('zh_CN');
    assert.equal(configReads(), 0);
});

test('other languages retain the original cached-string precedence', async () => {
    const {api, staleStrings} = await createFetcher();
    const result = await api.fetchLocalization('en');
    assert.equal(result.strings, staleStrings);
});
