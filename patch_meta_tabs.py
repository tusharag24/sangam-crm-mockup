import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# I need to replace the content of ROW 2 in renderMetaStrip.
# Let's find ROW 2 inside renderMetaStrip.

row2_start = "<!-- ROW 2 -->"
row2_old_pattern = re.compile(r'<!-- ROW 2 -->\s*<div style="background: #FAFAFA; border-top: 1px solid #F3F4F6; padding: 7px 20px; display: flex; align-items: center;">[\s\S]*?<div style="margin-left: auto; display: flex; gap: 6px;">')

new_row2 = """<!-- ROW 2 -->
          <div style="background: #FAFAFA; border-top: 1px solid #F3F4F6; padding: 0 20px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 0;">
              <div style="padding: 10px 20px; font-size: 13px; font-weight: 600; color: #473391; border-bottom: 2px solid #473391; cursor: pointer;">Insurance Details</div>
              <div style="padding: 10px 20px; font-size: 13px; font-weight: 600; color: #9CA3AF; border-bottom: 2px solid transparent; cursor: pointer;" onmouseover="this.style.color='#473391'" onmouseout="this.style.color='#9CA3AF'">Activity History</div>
              <div style="padding: 10px 20px; font-size: 13px; font-weight: 600; color: #9CA3AF; border-bottom: 2px solid transparent; cursor: pointer;" onmouseover="this.style.color='#473391'" onmouseout="this.style.color='#9CA3AF'">Follow Ups</div>
              <div style="padding: 10px 20px; font-size: 13px; font-weight: 600; color: #9CA3AF; border-bottom: 2px solid transparent; cursor: pointer;" onmouseover="this.style.color='#473391'" onmouseout="this.style.color='#9CA3AF'">Documents</div>
            </div>

            <div style="margin-left: auto; display: flex; gap: 6px;">"""

match = row2_old_pattern.search(html)
if match:
    html = html[:match.start()] + new_row2 + html[match.end():]
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Row 2 tabs updated successfully.")
else:
    print("Could not find ROW 2 pattern.")

