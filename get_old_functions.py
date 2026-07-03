import re

html = open('0da598a_index.html', 'r').read()

def get_func(name):
    pattern = rf'function {name}\(.*?(?=\n    (?:window\.|function |\}\n    //))'
    match = re.search(pattern, html, re.DOTALL)
    if match:
        return match.group(0)
    return ""

print("Found right panel:", bool(get_func('renderRightPanel')))
print("Found handleStatus:", bool(get_func('handleDetailStatusChange')))
print("Found saveStatus:", bool(get_func('saveDetailStatusUpdate')))
