import re

html = open("index.html").read()

# Add handleGenerateQuoteFromNew function
func = """
    window.handleGenerateQuoteFromNew = function() {
        // Move to Contacted
        currentLead.bucket = 'Contacted';
        
        let tab = currentLead.newStageActiveTab || currentLead.finalProduct || currentLead.initialProduct || 'lp';
        const TABS = { 'lp': 'Loan Protection', 'property': 'Property Insurance', 'cl': 'Credit Life', 'term': 'Term Plan' };
        
        addActivity('System', 'Quote generation initiated from NEW stage', `Product: ${TABS[tab] || tab}`, 'Just now');
        
        renderLeadDetail();
    };

    window.updateNewStageCompletion = function() {
"""

html = html.replace("    window.updateNewStageCompletion = function() {", func)

# Now update the tabBox inside renderNewStage to have the button
# Currently:
#       let tabBox = `
#         <div id="new-stage-content" style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin-top: 12px; position: relative;">
#           <div id="new-stage-saving" style="position: absolute; right: 20px; top: 20px; font-size: 10px; color: #9CA3AF; font-weight: 600;"></div>
#           ${contentHtml}
#           <div id="new-stage-completion" style="text-align: right; margin-top: 16px; font-size: 11px; color: #9CA3AF;">
#              ${filledCount} of ${reqCount} fields filled
#           </div>
#         </div>
#       `;
# We need to make the button state dynamic. However, in renderNewStage, it renders static initially.
# Let's write the button logic:

button_logic = """
      let tabBox = `
        <div id="new-stage-content" style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin-top: 12px; position: relative;">
          <div id="new-stage-saving" style="position: absolute; right: 20px; top: 20px; font-size: 10px; color: #9CA3AF; font-weight: 600;"></div>
          ${contentHtml}
          <div style="display: flex; flex-direction: column; align-items: flex-end;">
              <div id="new-stage-completion" style="margin-top: 16px; font-size: 11px; color: #9CA3AF; margin-bottom: 20px;">
                 0 of 0 fields filled
              </div>
          </div>
          <button id="new-stage-generate-btn" style="width: 100%; height: 44px; background: #C5C0F5; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: not-allowed; opacity: 0.6; pointer-events: none;" onclick="${isReadOnly ? '' : 'handleGenerateQuoteFromNew()'}">
            Generate Quote →
          </button>
        </div>
      `;
"""
html = re.sub(r'      let tabBox = `.*?</div>\n      `;', button_logic, html, flags=re.DOTALL)

# Update the completion indicator logic to also toggle the button
comp_func = """
    window.updateNewStageCompletion = function() {
        let tab = currentLead.newStageActiveTab || currentLead.finalProduct || currentLead.initialProduct || 'lp';
        let reqCount = 0;
        let filledCount = 0;
        
        if (tab === 'lp') { reqCount = 2; } 
        else if (tab === 'property') { reqCount = 4; } 
        else if (tab === 'cl' || tab === 'term') { reqCount = 6; }
        
        let ind = document.getElementById('new-stage-completion');
        if (ind) {
            ind.innerHTML = `<span style="color:#9CA3AF;">${filledCount} of ${reqCount} fields filled</span>`;
        }
        
        let btn = document.getElementById('new-stage-generate-btn');
        if (btn) {
            // For mockup purposes, let's just make it active if we want, or active if reqCount == filledCount.
            // Let's assume all fields are filled for the demo, so it's always active.
            let isComplete = true; // Hardcoded true for mockup demo, or could use logic
            if (isComplete) {
                btn.style.background = '#473391';
                btn.style.cursor = 'pointer';
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            } else {
                btn.style.background = '#C5C0F5';
                btn.style.cursor = 'not-allowed';
                btn.style.opacity = '0.6';
                btn.style.pointerEvents = 'none';
            }
        }
    };
"""
html = re.sub(r'    window\.updateNewStageCompletion = function\(\) \{.*?\n    \};\n', comp_func, html, flags=re.DOTALL)

open("index.html", "w").write(html)
