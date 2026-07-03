import re

html = open("index.html").read()

# 1. Fix accordion in renderCenterPanel
html = html.replace("if (stages[i] === 'New') centerContent += renderAccordion('New', renderOutreachStage(true));", "if (stages[i] === 'New') centerContent += renderAccordion('New', renderNewStage(true));")

# 2. Delete the old duplicate renderContactedStage.
# Let's find it. It looks like:
#     function renderContactedStage(isReadOnly = false) {
#       let inputClass = isReadOnly ? 'new-form-input form-readonly' : 'new-form-input';
#       ...
#     function renderQuoteStage(isReadOnly = false) {

# Actually, the old renderContactedStage was followed by renderQuoteStage, wait, no, renderQuoteStage was already rewritten.
# Let's use regex to wipe out the old renderContactedStage down to just before the next function.
html = re.sub(r'    function renderContactedStage\(isReadOnly = false\) \{\n      let inputClass.*?    \}\n\n    function ', '    function ', html, flags=re.DOTALL)

with open("index.html", "w") as f:
    f.write(html)
