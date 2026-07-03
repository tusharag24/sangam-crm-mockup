import re

html = open("index.html").read()

# We want to remove the block starting with:
#     function renderContactedStage(isReadOnly = false) {
#       let inputClass = isReadOnly ? 'new-form-input form-readonly' : 'new-form-input';
# down to the end of window.generateQuote.

regex_pattern = r'    function renderContactedStage\(isReadOnly = false\) \{\n      let inputClass.*?    window\.generateQuote = function\(\) \{.*?\n    \};\n'

match = re.search(regex_pattern, html, flags=re.DOTALL)
if match:
    print("Found the exact old renderContactedStage and its helpers. Removing.")
    html = html.replace(match.group(0), "")
    with open("index.html", "w") as f:
        f.write(html)
else:
    print("Could not find the block to delete.")
