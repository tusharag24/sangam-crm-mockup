import re
html = open('index.html').read()
match = re.search(r'function renderCenterPanel\(\) \{.*?(?:document\.getElementById\(\'detail-center\'\)\.innerHTML = html;\s*\})', html, re.DOTALL)
if match:
    print(match.group(0))
