import re

html = open("index.html").read()

# 1. Add currentLead.productStatus = 'locked'; to handleConfirmPayment
html = html.replace("currentLead.bucket = 'Payment Done';", "currentLead.bucket = 'Payment Done';\\n            currentLead.productStatus = 'locked';")

# 2. Update renderMetaStrip to render 'Locked' correctly
# Let's see what the current code is.
