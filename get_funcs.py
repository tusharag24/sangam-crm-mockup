import re
html = open('index.html').read()
for f in ['renderOutreachStage', 'renderInterestStage', 'renderContactedStage', 'renderProductSelection', 'renderPaymentStage', 'renderPaymentDoneStage']:
    match = re.search(r'function ' + f + r'\(.*?\)', html)
    if match: print(match.group(0))
