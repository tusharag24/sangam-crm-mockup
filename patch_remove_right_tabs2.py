import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

pattern = re.compile(r'<div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; background: white;">\s*<div style="flex-shrink: 0; display: flex; background: white; border-bottom: 1px solid #E5E7EB; position: sticky; top: 0; z-index: 10;">\s*<div style="flex: 1; text-align: center; padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; color: \$\{activeTab === \'History\'.*?</div>\s*</div>', re.DOTALL)

# Let's count matches
matches = pattern.findall(html)
print(f"Found {len(matches)} matches")

html = pattern.sub('', html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Removed right panel tabs.")
