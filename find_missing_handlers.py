import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find all onclick attributes
onclicks = set(re.findall(r'onclick="([^"]+)"', html))

# Find all defined functions
# function foo()
func_defs = set(re.findall(r'function\s+([a-zA-Z0-9_]+)\s*\(', html))
# window.foo = function()
window_defs = set(re.findall(r'window\.([a-zA-Z0-9_]+)\s*=\s*function', html))

all_defs = func_defs.union(window_defs)

# Special cases or built-ins
built_ins = {'event.stopPropagation()', 'window.open', 'setTimeout'}

missing = []
for oc in onclicks:
    # Extract the function name being called
    # This regex looks for an identifier followed by (
    calls = re.findall(r'([a-zA-Z0-9_]+)\s*\(', oc)
    for call in calls:
        if call not in all_defs and call not in built_ins and call not in ('event', 'window', 'document', 'console'):
            missing.append(f"Missing: {call} in onclick: {oc}")

print("Missing handlers:")
for m in set(missing):
    print(m)
