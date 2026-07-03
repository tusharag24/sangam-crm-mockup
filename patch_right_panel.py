import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# I need to remove the tabs section from renderRightPanel.
# In previous versions, it looked like:
# <div style="display: flex; background: #F9FAFB; border-bottom: 1px solid #E5E7EB;">
#   <div style="flex: 1; text-align: center; padding: 12px 0; font-size: 13px; font-weight: 600; color: #473391; border-bottom: 2px solid #473391; cursor: pointer;" onclick="setMainTab('History')">Activity History</div>
#   ... Follow Ups, Documents ...
# </div>

# We can just remove the tabs div and the content container that switches between them.
# The user wants to "remove the activity history, follow up, document from below the update status panel on right".
# The update status panel is the `<div style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; margin-bottom: 20px;">` stuff.
# Let's see if we can find the exact text in the file.

count = html.count("Activity History")
print(f"Found 'Activity History' {count} times.")

# The tabs might be implemented differently. Let's find "setMainTab" usage.
count_set_tab = html.count("setMainTab")
print(f"Found 'setMainTab' {count_set_tab} times.")

# Let's write a regex that matches the tab row and the container that follows.
# Wait, let's just find the exact block and replace it with empty.
tab_pattern = re.compile(r'<div style="display: flex; background: #F9FAFB; border-bottom: 1px solid #E5E7EB;">.*?</div>\s*<div style="flex: 1; overflow-y: auto; background: #FAFAFA;">.*?</div>', re.DOTALL)

match = tab_pattern.search(html)
if match:
    # Just remove it.
    html = html[:match.start()] + html[match.end():]
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Removed tabs from right panel.")
else:
    print("Could not find tabs pattern in right panel.")
