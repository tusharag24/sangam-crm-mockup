import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace the contacted stage condition in renderProductTabsUI to always show results when in Contacted stage
old_cond = 'if (isContacted && currentLead.contactedShowResults) {'
new_cond = 'if (isContacted) {'
if old_cond in content:
    content = content.replace(old_cond, new_cond)
    print("Replaced condition successfully.")
else:
    print("WARNING: old condition not found!")

# 2. Make renderContactedStage always pass isReadOnly = true to renderProductTabsUI
old_render = """    function renderContactedStage(isReadOnly = false) {
        return renderProductTabsUI(true, isReadOnly);
    }"""
new_render = """    function renderContactedStage(isReadOnly = false) {
        return renderProductTabsUI(true, true);
    }"""
if old_render in content:
    content = content.replace(old_render, new_render)
    print("Replaced renderContactedStage successfully.")
else:
    # Try with different whitespace or find a looser match
    pattern = r'function renderContactedStage\s*\(\s*isReadOnly\s*=\s*false\s*\)\s*\{\s*return renderProductTabsUI\(\s*true\s*,\s*isReadOnly\s*\);\s*\}'
    if re.search(pattern, content):
        content = re.sub(pattern, 'function renderContactedStage(isReadOnly = false) {\n        return renderProductTabsUI(true, true);\n    }', content)
        print("Replaced renderContactedStage with regex successfully.")
    else:
        print("WARNING: renderContactedStage not found!")

# 3. Clean up the duplicate handleGenerateQuoteFromNew definitions
# We keep the first one, but delete the second and third ones.
# Let's find all window.handleGenerateQuoteFromNew definitions.
# The second one:
second_dup = """    window.handleGenerateQuoteFromNew = function() {
        currentLead.bucket = 'Contacted';
        let tab = currentLead.newStageActiveTab || currentLead.finalProduct || currentLead.initialProduct || 'lp';
        const TABS = { 'lp': 'Loan Protection', 'property': 'Property Insurance', 'cl': 'Credit Life', 'term': 'Term Plan' };
        addActivity('System', 'Quote generation initiated from NEW stage', `Product: ${TABS[tab] || tab}`, 'Just now');
        currentLead.contactedShowResults = false;
        renderLeadDetail();
    };"""

if second_dup in content:
    content = content.replace(second_dup, '')
    print("Removed second duplicate handleGenerateQuoteFromNew.")
else:
    print("WARNING: Second duplicate handleGenerateQuoteFromNew not found!")

# Let's find and remove updateNewStageCompletion duplicate at the end of the file.
# The block at the end:
duplicate_end_block = """     window.handleGenerateQuoteFromNew = function() {
         // Move to Contacted
         currentLead.bucket = 'Contacted';
         
         let tab = currentLead.newStageActiveTab || currentLead.finalProduct || currentLead.initialProduct || 'lp';
         const TABS = { 'lp': 'Loan Protection', 'property': 'Property Insurance', 'cl': 'Credit Life', 'term': 'Term Plan' };
         
         addActivity('System', 'Quote generation initiated from NEW stage', `Product: ${TABS[tab] || tab}`, 'Just now');
         
         renderLeadDetail();
     };


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
     };"""

if duplicate_end_block in content:
    content = content.replace(duplicate_end_block, '')
    print("Removed duplicate end block successfully.")
else:
    # Try finding it with slightly different formatting or regex
    # We can match: window.handleGenerateQuoteFromNew = function() { ... } followed by window.updateNewStageCompletion = function() { ... }
    print("WARNING: duplicate_end_block not found exactly!")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
