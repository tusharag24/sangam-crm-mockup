import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace class="new-form-input" with class="${inputClass}" in stage renderers
# But only inside the stage renderers!
# I can just globally replace it if it's mostly inside those functions.
# Let's check how many occurrences there are.
count = html.count('class="new-form-input')
print(f"Found {count} new-form-input classes")

# Replace class="new-form-input..." with class="${inputClass}..." in render functions
html = html.replace('class="new-form-input"', 'class="${inputClass}" ${isReadOnly ? "readonly disabled" : ""}')
html = html.replace("class='new-form-input'", "class='${inputClass}' ${isReadOnly ? 'readonly disabled' : ''}")

# For custom-radio pills:
html = html.replace("onclick=\"toggleCustomRadio", "style=\"${clickEvent}\" onclick=\"toggleCustomRadio")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Read-only attributes patched.")
