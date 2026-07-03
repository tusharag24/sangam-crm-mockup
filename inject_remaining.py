import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

missing_functions = """
    window.setSection = function(secName) {
        window.activeEditSection = secName;
        if (typeof renderRightPanel === 'function') renderRightPanel();
        else if (typeof updateRightPanel === 'function') updateRightPanel();
        else if (typeof renderLeadDetail === 'function') renderLeadDetail();
    };

    window.gCallOut = function(type) {
        if (type === 'call') {
            showToast('Dialing customer...');
        } else if (type === 'whatsapp') {
            showToast('Opening WhatsApp Web...');
        }
    };

    // Init
"""

if "// Init" in html:
    html = html.replace('// Init', missing_functions)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Injected remaining functions successfully.")
else:
    print("// Init not found!")
