import re
html = open('index.html').read()

# Make renderOutreachStage take isReadOnly
old_outreach = "function renderOutreachStage() {"
new_outreach = "function renderOutreachStage(isReadOnly = false) {"
if old_outreach in html:
    html = html.replace(old_outreach, new_outreach)

# Add pointer-events: none when isReadOnly
# The buttons are inside renderOutreachStage
# "Copy" button: <button class="btn btn-ghost btn-small" ... onclick="showToast('Number copied')">Copy</button>
html = html.replace(
    '''<button class="btn btn-ghost btn-small" style="margin-left:8px; vertical-align:middle;" onclick="showToast('Number copied')">Copy</button>''',
    '''${isReadOnly ? '' : `<button class="btn btn-ghost btn-small" style="margin-left:8px; vertical-align:middle;" onclick="showToast('Number copied')">Copy</button>`}'''
)

# And update renderCenterPanel
# For accordion:
html = html.replace(
    "if (stages[i] === 'New') centerContent += renderAccordion('New', `<div style=\\\"font-size: 13px; color: #9CA3AF; text-align: center;\\\">Call the customer and record the outcome in Update Status.</div>`);",
    "if (stages[i] === 'New') centerContent += renderAccordion('New', renderOutreachStage(true));"
)

# For active:
html = html.replace(
    "if (l.bucket === 'New') { activeContent = ''; }",
    "if (l.bucket === 'New') { activeContent = renderOutreachStage(false); }"
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
