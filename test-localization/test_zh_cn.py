import json, re, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def flatten(d,p=''):
    out={}
    for k,v in d.items():
        key=f'{p}.{k}' if p else k
        if isinstance(v,dict): out.update(flatten(v,key))
        else: out[key]=v
    return out
class ChineseResourceTests(unittest.TestCase):
    def test_basic_actions_are_chinese(self):
        zh=flatten(json.loads((ROOT/'common/locales/zh_CN.json').read_text()))
        for k in ['action.close','action.search','action.reload','settings.dictionaryBrowser.title']:
            self.assertRegex(zh[k],r'[\u4e00-\u9fff]',k)
    def test_keys_and_translation_placeholders_match(self):
        en=flatten(json.loads((ROOT/'common/locales/en.json').read_text()))
        zh=flatten(json.loads((ROOT/'common/locales/zh_CN.json').read_text()))
        self.assertEqual(set(en),set(zh))
        for k in ['ankiDialog.updateSelectedCards','info.resumePlaybackPrompt','settings.dictionaryBrowser.results','settings.dictionaryBrowser.yomitanWarning']:
            self.assertEqual(sorted(re.findall(r'{{.*?}}|</?\d+>',en[k])),sorted(re.findall(r'{{.*?}}|</?\d+>',zh[k])),k)
    def test_new_install_defaults_are_preconfigured(self):
        text=(ROOT/'common/settings/settings-provider.ts').read_text()
        for value in ["ankiConnectUrl: 'http://127.0.0.1:8766'", "deck: '外语::英语语境'", "noteType: '外语语境卡'", "sentenceField: 'Sentence'", "wordField: 'Word'", "language: 'zh_CN'"]:
            self.assertIn(value,text)
    def test_all_overrides_preserve_interpolation(self):
        en=flatten(json.loads((ROOT/'common/locales/en.json').read_text()))
        patch=json.loads((ROOT/'localization/zh-cn-overrides.json').read_text())
        for k,v in patch.items():
            self.assertIn(k,en,k)
            self.assertEqual(sorted(re.findall(r'{{.*?}}|</?\d+>',en[k])),sorted(re.findall(r'{{.*?}}|</?\d+>',v)),k)
    def test_welcome_uses_saved_language_not_browser_language(self):
        text=(ROOT/'extension/src/ui/components/FtueUi.tsx').read_text()
        self.assertNotIn('browser.i18n.getUILanguage()',text)
        self.assertIn("getSingle('language')",text)
        zh=flatten(json.loads((ROOT/'common/locales/zh_CN.json').read_text()))
        for key in ['ftue.welcome','ftue.welcomeBody2']:
            self.assertRegex(zh[key],r'[\u4e00-\u9fff]')
    def test_welcome_document_title_is_chinese(self):
        html=(ROOT/'extension/src/entrypoints/ftue-ui/index.html').read_text()
        self.assertIn('<html lang="zh-CN">',html)
        self.assertIn('<title>asbplayer · 入门指南</title>',html)
    def test_visible_page_titles_and_tutorial_confirmation_are_chinese(self):
        for path in (ROOT/'extension/src/entrypoints').glob('*/index.html'):
            match=re.search(r'<title>(.*?)</title>',path.read_text())
            if match and match.group(1)!='asbplayer':
                self.assertRegex(match.group(1),r'[\u4e00-\u9fff]',str(path))
        tutorial=(ROOT/'extension/src/ui/components/Tutorial.tsx').read_text()
        self.assertNotIn('<Button onClick={onClose}>OK</Button>',tutorial)
        self.assertIn("t('action.ok')",tutorial)
if __name__=='__main__': unittest.main()
