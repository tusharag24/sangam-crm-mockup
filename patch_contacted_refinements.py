import re

html = open("index.html").read()

# 1. We need to implement validation state in the UI.
# Let's add a state flag `currentLead.contactedValidationFailed = true` if fields are empty when Generate Quote is clicked.
# Since this is a mockup, we can just say if `currentLead.contactedValidationFailed` is true, show the error below the first field (or specific fields).

# Actually, the user wants "show inline validation errors below the empty fields".
# I'll update handleGenerateQuoteFromContacted to toggle the validation state, wait 2 seconds, and then show results to simulate the flow, OR I can just make the first click show validation errors, and second click pass?
# Or I can just make the fields required, and if any is empty, show error. But they are already populated in my mockup!
# Wait, if they are already populated, validation wouldn't fail!
# "All previously filled data from NEW stage is retained and pre-populated"
# So if they are pre-populated, they are NOT empty.
# But the user still wants the logic: "if any required fields for that product are empty, show inline validation errors... Button does not proceed until all required fields are filled."
# To demonstrate this, I can empty one of the fields by default in the mockup, or provide a function that actually checks the input values.
# Let's just write a JS function that checks the inputs in the DOM.

validation_logic = """
    window.handleGenerateQuoteFromContacted = function() {
        let tabBox = document.getElementById('new-stage-content');
        let inputs = tabBox.querySelectorAll('input:not([readonly]), select:not([readonly])');
        let isValid = true;
        
        inputs.forEach(inp => {
            if (inp.type === 'radio' || inp.type === 'checkbox') return; // skip for mockup simplicity
            let valContainer = inp.nextElementSibling;
            if (valContainer && valContainer.className === 'val-err') {
                valContainer.remove();
            }
            if (!inp.value || inp.value === 'Select...') {
                isValid = false;
                let err = document.createElement('div');
                err.className = 'val-err';
                err.style = 'font-size: 11px; color: #C0392B; margin-top: 4px;';
                err.innerText = 'This field is required';
                inp.parentNode.appendChild(err);
                inp.style.borderColor = '#C0392B';
            } else {
                inp.style.borderColor = '#E5E7EB';
            }
        });

        if (isValid) {
            let tab = currentLead.newStageActiveTab || currentLead.finalProduct || currentLead.initialProduct || 'lp';
            const TABS = { 'lp': 'Loan Protection', 'property': 'Property Insurance', 'cl': 'Credit Life', 'term': 'Term Plan' };
            currentLead.contactedShowResults = true;
            addActivity('System', 'Quotes generated', `Product: ${TABS[tab] || tab}`, 'Just now');
            renderLeadDetail();
        }
    };
"""

html = re.sub(r'    window\.handleGenerateQuoteFromContacted = function\(\) \{.*?\n    \};\n', validation_logic, html, flags=re.DOTALL)

# 2. Update "Share All" to show inline dropdown
# 3. Update PB extracted quote cards to have WhatsApp+Email per card

share_all_logic = """
                <div style="position: relative; width: 100%;">
                    <button style="width: 100%; padding: 10px; border: 1.5px solid #473391; background: white; color: #473391; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;" onclick="document.getElementById('share-all-dropdown').style.display = document.getElementById('share-all-dropdown').style.display === 'block' ? 'none' : 'block'">Share All Quotes</button>
                    <div id="share-all-dropdown" style="display: none; position: absolute; top: 100%; left: 0; width: 100%; background: white; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-top: 4px; z-index: 10;">
                        <div style="padding: 12px 16px; font-size: 13px; color: #111827; cursor: pointer; border-bottom: 1px solid #E5E7EB; display: flex; align-items: center; gap: 8px;" onclick="handleShareQuote('WhatsApp')"><span style="color:#10B981; font-weight:bold;">WA</span> Share via WhatsApp</div>
                        <div style="padding: 12px 16px; font-size: 13px; color: #111827; cursor: pointer; display: flex; align-items: center; gap: 8px;" onclick="handleShareQuote('Email')"><span style="color:#C0392B; font-weight:bold;">@</span> Share via Email</div>
                    </div>
                </div>
"""

html = re.sub(r'<button style="width: 100%; padding: 10px; border: 1\.5px solid #473391.*?Share All Quotes</button>', share_all_logic, html, flags=re.DOTALL)

pb_extracted_logic = """
                        <div style="margin-bottom: 16px;">
                          <div style="font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 12px;">Extracted Quotes</div>
                          <div style="border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px; background: white; margin-bottom: 12px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <input type="checkbox" checked style="width: 16px; height: 16px;">
                                    <div style="width: 40px; height: 40px; border-radius: 50%; background: #F3F4F6; display: flex; align-items: center; justify-content: center; font-size: 20px;">🛡️</div>
                                    <div>
                                        <div style="font-size: 13px; font-weight: 700; color: #111827;">HDFC Ergo</div>
                                        <div style="font-size: 11px; color: #9CA3AF;">Home Shield Plus</div>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 18px; font-weight: 700; color: #473391;">₹4,200</div>
                                    <div style="font-size: 10px; color: #9CA3AF;">one-time premium</div>
                                </div>
                            </div>
                            <hr style="border: none; border-top: 1px solid #E5E7EB; margin-bottom: 12px;">
                            <div style="display: flex; gap: 8px;">
                                <button style="flex: 1; height: 32px; background: #E6F4ED; color: #1A7A4A; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="handleShareQuote('WhatsApp')">WhatsApp</button>
                                <button style="flex: 1; height: 32px; background: #FDECEA; color: #C0392B; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="handleShareQuote('Email')">Email</button>
                            </div>
                          </div>
                          
                          <div style="border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px; background: white; margin-bottom: 12px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <input type="checkbox" style="width: 16px; height: 16px;">
                                    <div style="width: 40px; height: 40px; border-radius: 50%; background: #F3F4F6; display: flex; align-items: center; justify-content: center; font-size: 20px;">🏢</div>
                                    <div>
                                        <div style="font-size: 13px; font-weight: 700; color: #111827;">Bajaj Allianz</div>
                                        <div style="font-size: 11px; color: #9CA3AF;">My Home Insurance</div>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 18px; font-weight: 700; color: #473391;">₹380</div>
                                    <div style="font-size: 10px; color: #9CA3AF;">monthly premium</div>
                                </div>
                            </div>
                            <hr style="border: none; border-top: 1px solid #E5E7EB; margin-bottom: 12px;">
                            <div style="display: flex; gap: 8px;">
                                <button style="flex: 1; height: 32px; background: #E6F4ED; color: #1A7A4A; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="handleShareQuote('WhatsApp')">WhatsApp</button>
                                <button style="flex: 1; height: 32px; background: #FDECEA; color: #C0392B; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="handleShareQuote('Email')">Email</button>
                            </div>
                          </div>
                          
                          <button style="width: 100%; padding: 10px; border: none; background: #473391; color: white; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;" onclick="handleShareQuote('WhatsApp')">Share Selected Quotes</button>
                        </div>
"""

html = re.sub(r'                        <div style="margin-bottom: 16px;">\n                          <div style="font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 12px;">Extracted Quotes</div>.*?Share Selected Quotes</button>\n                        </div>', pb_extracted_logic, html, flags=re.DOTALL)

with open("index.html", "w") as f:
    f.write(html)

