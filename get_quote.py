import re
html = open('index.html').read()
match = re.search(r'function renderQuoteStage\(.*?\{.*?\}', html, re.DOTALL)
if match: print("Quote:\n", match.group(0)[:500])
