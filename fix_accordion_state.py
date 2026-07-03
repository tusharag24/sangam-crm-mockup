with open("index.html", "r") as f:
    content = f.read()

# Add window.accordionState initialization to renderAccordion
old_render = """    function renderAccordion(stageName, contentHtml) {
        let isExpanded = window.accordionState[stageName] || false;"""
new_render = """    window.accordionState = window.accordionState || {};
    window.toggleAccordion = function(stageName) {
        window.accordionState[stageName] = !window.accordionState[stageName];
        renderLeadDetail();
    };

    function renderAccordion(stageName, contentHtml) {
        let isExpanded = window.accordionState[stageName] || false;"""

if old_render in content:
    content = content.replace(old_render, new_render)
    print("Fixed renderAccordion")
else:
    print("Could not find old_render")

with open("index.html", "w") as f:
    f.write(content)
