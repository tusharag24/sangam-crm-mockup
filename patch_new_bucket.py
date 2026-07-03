import re
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace the text from activeContent for 'New' bucket.
html = re.sub(r'if \(l\.bucket === \'New\'\) \{\s*activeContent = `\s*<div.*?Call the customer.*?</div>\s*</div>\s*`;\s*\}', 'if (l.bucket === \'New\') { activeContent = \'\'; }', html, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
