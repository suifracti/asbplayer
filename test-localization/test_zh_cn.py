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
if __name__=='__main__': unittest.main()
