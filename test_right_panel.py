import re
html = open('index.html').read()
matches = list(re.finditer(r'function renderRightPanel', html))
for m in matches:
    start = m.start()
    end = start + 800
    print("---")
    print(html[start:end])
