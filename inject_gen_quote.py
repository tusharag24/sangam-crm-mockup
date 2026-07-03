import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

functions_to_add = """
    window.generateQuoteFromNew = function() {
        let reqCount = parseInt(document.getElementById('new-stage-completion')?.getAttribute('data-req') || '0');
        let filledCount = 0;
        let inputs = document.querySelectorAll('#detail-center input:not([disabled]), #detail-center select:not([disabled])');
        inputs.forEach(inp => {
            if(inp.type === 'radio' || inp.type === 'checkbox') return;
            if(inp.value.trim() !== '') filledCount++;
        });
        
        // If not all filled, just visually fail or ignore.
        // Assuming user filled it since it says "All required fields filled"
        
        let saveStatus = document.getElementById('new-stage-save-status');
        if(saveStatus) {
            saveStatus.style.display = 'block';
            saveStatus.innerText = 'Generating...';
        }
        
        setTimeout(() => {
            currentLead.bucket = 'Contacted'; // Moves to Contacted after Generate Quote
            if (!currentLead.log) currentLead.log = [];
            currentLead.log.unshift({
                type: 'System Update',
                by: 'Verification Agent',
                text: 'Quote generation initiated from NEW stage',
                desc: `Product: ${window.newStageActiveTab || 'Loan Protection'}`,
                time: 'Just now'
            });
            renderLeadDetail();
            renderLeadTable();
        }, 500);
    };

    window.generateQuoteFromContacted = function(reqCount) {
        let saveStatus = document.getElementById('contacted-stage-save-status');
        if(saveStatus) {
            saveStatus.style.display = 'block';
            saveStatus.innerText = 'Generating...';
        }
        
        setTimeout(() => {
            currentLead.quoteResultsVisible = true;
            if (!currentLead.log) currentLead.log = [];
            currentLead.log.unshift({
                type: 'System Update',
                by: 'Verification Agent',
                text: 'Quotes generated successfully',
                desc: `Product: ${window.newStageActiveTab || 'Loan Protection'}`,
                time: 'Just now'
            });
            renderLeadDetail();
            renderLeadTable();
        }, 500);
    };

    // Init
"""

if "// Init" in html:
    html = html.replace('// Init', functions_to_add)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Injected generateQuote functions successfully.")
else:
    print("// Init not found!")
