import re

with open('index.html', 'r') as f:
    content = f.read()

# We want to find renderCenterPanel and extract the New bucket logic
match = re.search(r'(function renderCenterPanel\(\) \{[\s\S]*?)function renderQuoteStage\(\) \{', content)
if match:
    # the whole renderCenterPanel block
    pass

