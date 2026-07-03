import re
html = open('index.html').read()
match = re.search(r'function renderPaymentDoneStage\(.*?\{.*?\}', html, re.DOTALL)
if match: print(match.group(0)[:500])
