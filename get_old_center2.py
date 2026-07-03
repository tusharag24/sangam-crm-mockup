import re
html = open('old_index.html').read()
matches = re.finditer(r'function renderCenterPanel\(\) \{.*?(?:document\.getElementById\(\'detail-center\'\)\.innerHTML = html;\s*\})', html, re.DOTALL)
for m in matches:
    print(m.group(0))
