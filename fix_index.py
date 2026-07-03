with open('recovered.js', 'r', encoding='utf-8') as f:
    recovered = f.read()

# find index of "function renderPolicyStage() {"
idx = recovered.find('    function renderPolicyStage() {')
rest_of_file = recovered[idx:]

with open('index.html', 'a', encoding='utf-8') as f:
    f.write("\n\n" + rest_of_file)
