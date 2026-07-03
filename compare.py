import re
html = open('index.html').read()
match1 = re.search(r'function renderInterestStage\(\) \{.*?\}', html, re.DOTALL)
if match1: print("Interest Stage Size:", len(match1.group(0)))
match2 = re.search(r'function renderProductSelection\(.*?\{.*?\}\n\s*\}', html, re.DOTALL)
if match2: print("Product Selection Size:", len(match2.group(0)))
