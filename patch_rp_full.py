import re

html = open("index.html").read()

# 1. Read old functions
old_rp = open("old_rp.js").read()
old_h1 = open("old_h1.js").read()
old_h2 = open("old_h2.js").read()
old_s = open("old_s.js").read()

# 2. Modify old_rp to remove the bottom half (the tabs and getRightPanelTabContent)
# The string to replace is from `<div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; background: white;">` to `${getRightPanelTabContent(activeTab)}\n          </div>\n        </div>`
rp_modified = re.sub(r'<div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; background: white;">.*?</div>\n        </div>', '', old_rp, flags=re.DOTALL)

# 3. Replace the current renderRightPanel, handleDetailStatusChange, handleDetailSubStatusChange, saveDetailStatusUpdate
# We'll just replace the whole block in index.html from renderRightPanel to saveDetailStatusUpdate.
# Wait, in the current index.html, there's window.completeTask too.

current_rp_block = re.search(r'    function renderRightPanel\(\) \{.*?\n    window\.saveDetailStatusUpdate = function\(\) \{.*?\n    \};\n', html, re.DOTALL)
if current_rp_block:
    new_block = rp_modified + "\n" + old_h1 + "\n" + old_h2 + "\n" + old_s
    html = html.replace(current_rp_block.group(0), new_block)
else:
    print("Could not find current block!")

with open("index.html", "w") as f:
    f.write(html)
