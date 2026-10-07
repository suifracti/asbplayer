"""Reapply personal translations after fetching upstream. Fail on renamed keys; never silently drop a translation."""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'common/locales/zh_CN.json'
d=json.loads(p.read_text());en=json.loads((ROOT/'common/locales/en.json').read_text())
for key,value in json.loads((ROOT/'localization/zh-cn-overrides.json').read_text()).items():
    target=d;original=en;keys=key.split('.')
    for k in keys[:-1]:target=target[k];original=original[k]
    old=original[keys[-1]]
    if sorted(re.findall(r'{{.*?}}|</?\d+>',old))!=sorted(re.findall(r'{{.*?}}|</?\d+>',value)):
        raise ValueError(f'Interpolation changed upstream: {key}')
    target[keys[-1]]=value
p.write_text(json.dumps(d,ensure_ascii=False,indent=4)+'\n')
print('Translations reapplied; run test-localization/test_zh_cn.py and build next.')
