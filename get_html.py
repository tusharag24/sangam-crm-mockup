import re

html = open("index.html").read()
# Let's extract the JS part and run it with node, wait, no node.
# Let's write a python port of renderLeadTable logic to see what it generates!

import json

leads_match = re.search(r'const LEADS = (\[.*?\]);', html, flags=re.DOTALL)
if leads_match:
    print("Found LEADS array.")
else:
    print("LEADS array not found!")
