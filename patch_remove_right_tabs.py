import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

pattern = re.compile(r'<div style="display: flex; border-bottom: 1px solid #E5E7EB; margin-bottom: 16px;">[\s\S]*?<div style="height: 12px;"></div>\n\s*</div>', re.DOTALL)
match = pattern.search(html)

if match:
    # wait, instead of removing it, maybe I can just find `<div style="display: flex; border-bottom: 1px solid #E5E7EB; margin-bottom: 16px;">` and the `<div id="tab-content">` block.
    pass

html = re.sub(r'<div style="display: flex; border-bottom: 1px solid #E5E7EB; margin-bottom: 16px;">.*?<div style="flex: 1; text-align: center; padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; color: \$\{activeTab === \'History\'.*?</script>\s*</div>\s*</div>', '', html, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Regex replace run.")
