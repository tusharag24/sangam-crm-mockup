import re
html = open('index.html').read()
match = re.search(r'function renderPolicyStage\(.*?\)', html)
if match: print(match.group(0))
