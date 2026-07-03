import re
html = open('old_index.html').read()
match = re.search(r'function renderCenterPanel\(\) \{.*?(?:document\.getElementById\(\'detail-center\'\)\.innerHTML = html;\s*\})', html, re.DOTALL)
if match:
    print(match.group(0))
