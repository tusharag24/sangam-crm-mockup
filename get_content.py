import re
html = open('index.html').read()
match = re.search(r'function renderContactedStage\(.*?\{.*?\}', html, re.DOTALL)
if match: print("Contacted:\n", match.group(0)[:200])

match = re.search(r'function renderPaymentDoneStage\(.*?\{.*?\}', html, re.DOTALL)
if match: print("Payment Done:\n", match.group(0)[:200])

match = re.search(r'function renderInterestStage\(.*?\{.*?\}', html, re.DOTALL)
if match: print("Interest:\n", match.group(0)[:200])
