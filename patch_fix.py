import re

with open('index.html', 'r') as f:
    content = f.read()

# Check if switchNewBucketTab is missing
if 'function switchNewBucketTab' not in content:
    fix = """
    window.switchNewBucketTab = function(tab) {
        window.activeNewBucketTab = tab;
        renderLeadDetail();
    };
"""
    content = content.replace('window.generateQuoteNew = function() {', fix + '\n    window.generateQuoteNew = function() {')
    
    with open('index.html', 'w') as f:
        f.write(content)
    print("Fixed switchNewBucketTab")
else:
    print("switchNewBucketTab exists")

