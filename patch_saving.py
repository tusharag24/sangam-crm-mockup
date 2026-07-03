import re

html = open("index.html").read()

new_click = """
    window.handleNewStageTabClick = function(tabKey) {
        currentLead.newStageActiveTab = tabKey;
        renderLeadDetail();
        
        // Show saving after render
        let savingEl = document.getElementById('new-stage-saving');
        if (savingEl) {
            savingEl.innerHTML = 'Saving...';
            setTimeout(() => {
                savingEl.innerHTML = '<span style="color:#10B981;">✓ Saved</span>';
                setTimeout(() => {
                    savingEl.innerHTML = '';
                }, 2000);
            }, 600);
        }
    };
"""

html = re.sub(r'    window\.handleNewStageTabClick = function\(tabKey\) \{.*?\n    \};\n', new_click, html, flags=re.DOTALL)

with open("index.html", "w") as f:
    f.write(html)
