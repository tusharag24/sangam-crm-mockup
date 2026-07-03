import re
import json

html = open("index.html").read()

# Extract LEADS array from HTML
match = re.search(r'const LEADS = (\[.*?\]);\n\n    // === APP STATE ===', html, flags=re.DOTALL)
if not match:
    # Try another regex
    match = re.search(r'const LEADS = (\[.*?\]\n      \}\n    \]);', html, flags=re.DOTALL)

# Let's just manually inspect if l.name, l.phone, l.si, l.loanAmount, l.hlLead, l.bucket, l.status, l.subStatus, l.source, l.subSource, l.partner, l.rmName, l.followUpDate are accessed safely.
# Yes, they are all accessed using optional chaining or logical OR.
# `l.finalProduct || l.initialProduct` -> Safe.
# `l.si ? formatLakhs(l.si) : (l.loanAmount ? formatLakhs(l.loanAmount) : '-')` -> Safe.
# `l.hlLead ? l.hlLead.bank : (l.loanBank || '-')` -> Safe.

