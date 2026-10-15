"""Build a portable single-file edition (no Node or external packages)."""
from pathlib import Path
import re
root = Path(__file__).resolve().parent.parent
html = (root/'index.html').read_text('utf-8')
style = (root/'style.css').read_text('utf-8')
scripts = []
for name in ('converter','editor','main'):
    src = (root/'js'/f'{name}.js').read_text('utf-8')
    src = re.sub(r'^import .*?;\n', '', src, flags=re.M)
    src = re.sub(r'^export default .*?;\n', '', src, flags=re.M)
    src = re.sub(r'^export (?=(?:function|const|class|async))', '', src, flags=re.M)
    scripts.append(src)
html = re.sub(r'<link rel="stylesheet" href="\./style.css">', '<style>\n'+style+'\n</style>', html, count=1)
html = re.sub(r'<script type="module" src="\./js/main.js\?v=1\.2\.0"></script>', '', html, count=1)
html = html.replace('</body>', '<script>\n'+'\n'.join(scripts).replace('</script>', '<\\/script>')+'\n</script>\n</body>', 1)
assert 'main.js?v=' not in html
output=root.parent/'booru-wiki-converter-v1.2-standalone.html'
output.write_text(html,'utf-8')
print(output, len(html), 'chars')
