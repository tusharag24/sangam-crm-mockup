import re

html = open("index.html").read()

# 1. First, let's extract the body of renderNewStage because it's massive and perfectly styled.
# We will rename it to `renderProductTabsUI(isContacted, isReadOnly)`
# and have `renderNewStage()` call `renderProductTabsUI(false, isReadOnly)`
# and `renderContactedStage()` call `renderProductTabsUI(true, isReadOnly)`

# Wait, instead of complicated regex extraction, I will just redefine them entirely by hardcoding the updated content block since I have it from the previous script!

new_functions = """
    window.handleGenerateQuoteFromNew = function() {
        currentLead.bucket = 'Contacted';
        let tab = currentLead.newStageActiveTab || currentLead.finalProduct || currentLead.initialProduct || 'lp';
        const TABS = { 'lp': 'Loan Protection', 'property': 'Property Insurance', 'cl': 'Credit Life', 'term': 'Term Plan' };
        addActivity('System', 'Quote generation initiated from NEW stage', `Product: ${TABS[tab] || tab}`, 'Just now');
        currentLead.contactedShowResults = false;
        renderLeadDetail();
    };

    window.handleGenerateQuoteFromContacted = function() {
        let tab = currentLead.newStageActiveTab || currentLead.finalProduct || currentLead.initialProduct || 'lp';
        const TABS = { 'lp': 'Loan Protection', 'property': 'Property Insurance', 'cl': 'Credit Life', 'term': 'Term Plan' };
        
        // Validation check (mockup assumes pass)
        let isValid = true;
        
        if (isValid) {
            currentLead.contactedShowResults = true;
            addActivity('System', 'Quotes generated', `Product: ${TABS[tab] || tab}`, 'Just now');
            renderLeadDetail();
        }
    };
    
    window.handleShareQuote = function(method) {
        showToast('Quote shared successfully');
        currentLead.bucket = 'Quote';
        currentLead.status = 'Quote Shared';
        currentLead.subStatus = 'Consent Pending';
        addActivity('System', 'Quote shared with customer', `CARE Health Insurance · ₹12,500 · via ${method}`, 'Just now');
        renderLeadDetail();
        renderRightPanel();
    };
    
    window.handleOpenPB = function() {
        showToast('Saving details and opening PolicyBazaar...');
        currentLead.contactedShowPBStep2 = true;
        renderLeadDetail();
        window.open('https://partners.policybazaar.com', '_blank');
    };
    
    window.handleExtractPBQuotes = function() {
        showToast('Extracting quotes via AI...');
        setTimeout(() => {
            currentLead.contactedPBQuotesExtracted = true;
            renderLeadDetail();
        }, 1500);
    };

    window.renderProductTabsUI = function(isContacted, isReadOnly = false) {
      let isLinked = true; 
      
      let inputClass = isReadOnly ? 'new-form-input form-readonly' : 'new-form-input new-stage-track';
      let clickEvent = isReadOnly ? 'pointer-events:none;' : 'cursor:pointer;';
      let disabledAttr = isReadOnly ? 'disabled' : '';
      let readonlyAttr = isReadOnly ? 'readonly' : '';
      
      let activeTab = currentLead.newStageActiveTab || currentLead.finalProduct || currentLead.initialProduct || 'lp';
      
      let hlIndicator = `
          <div style="background: #F0EEFB; border: 1px solid #C5C0F5; border-radius: 8px; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="color: #473391; font-size: 16px;">🔗</div>
              <div>
                <div style="font-size: 12px; font-weight: 600; color: #473391;">Linked Home Loan Lead</div>
                <div style="font-size: 11px; color: #6B5CC4;">HL-49201 · ${currentLead.name} · ${formatLakhs(currentLead.si)} · ICICI Bank · Sanctioned</div>
              </div>
            </div>
            <div style="font-size: 12px; font-weight: 600; color: #473391; text-decoration: underline; cursor: pointer;">View HL Lead →</div>
          </div>`;
      
      const TABS = [
          {id: 'lp', label: 'Loan Protection'},
          {id: 'property', label: 'Property Insurance'},
          {id: 'cl', label: 'Credit Life'},
          {id: 'term', label: 'Term Plan'}
      ];
      
      let tabsHtml = `<div style="display: flex; gap: 8px; margin-bottom: 12px;">`;
      TABS.forEach(t => {
          let isSel = activeTab === t.id;
          let bg = isSel ? '#473391' : '#F3F4F6';
          let color = isSel ? 'white' : '#6B7280';
          tabsHtml += `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
              <div onclick="${isReadOnly ? '' : `handleNewStageTabClick('${t.id}')`}" style="background: ${bg}; color: ${color}; border-radius: 20px; padding: 7px 16px; font-size: 12px; font-weight: 600; ${clickEvent}">
                ${t.label}
              </div>
              ${isSel ? `<div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #473391;">Selected</div>` : `<div style="height: 13px;"></div>`}
            </div>
          `;
      });
      tabsHtml += `</div>`;
      
      let hlBadge = `<span style="background: #EEF0FD; color: #473391; font-size: 9px; font-weight: 700; border-radius: 3px; padding: 1px 4px; margin-left: 6px; display: inline-block; vertical-align: middle;">HL</span>`;
      let labelStyle = `font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 5px; display: block;`;
      let inputStyle = `height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; width: 100%; box-sizing: border-box; outline: none;`;
      let lockedStyle = `height: 38px; border: 1.5px solid #F3F4F6; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #F9FAFB; padding: 0 10px; width: 100%; box-sizing: border-box; cursor: not-allowed; color: #6B7280;`;
      let lockIcon = `<span style="position: absolute; right: 10px; top: 32px; color: #C5C0F5; font-size: 12px;">🔒</span>`;
      
      let contentHtml = '';
      let reqCount = 0;
      
      if (activeTab === 'lp') {
          reqCount = 2;
          contentHtml = `
            <div style="margin-bottom: 16px;">
              <div style="font-size: 13px; font-weight: 700; color: #111827;">Loan Protection Details</div>
              <div style="font-size: 11px; color: #9CA3AF;">Required for CARE Health & TATA AIG quote generation</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div>
                <label style="${labelStyle}">DATE OF BIRTH *</label>
                <input type="date" style="${inputStyle}" ${readonlyAttr} value="1985-06-15">
              </div>
              <div style="position: relative;">
                <label style="${labelStyle}">LOAN AMOUNT ${hlBadge}</label>
                <input type="text" value="₹ ${formatLakhs(currentLead.si)}" style="${lockedStyle}" readonly>
                ${lockIcon}
              </div>
            </div>
            <div style="margin-bottom: 14px; grid-column: span 2;">
                <label style="${labelStyle}">PLAN TYPE *</label>
                <div style="display: flex; gap: 8px; margin-top: 4px;">
                  <div style="background: #473391; color: white; border: 1.5px solid #473391; border-radius: 20px; padding: 7px 20px; font-size: 12px; font-weight: 600;">PA Only</div>
                  <div style="background: white; color: #6B7280; border: 1.5px solid #E5E7EB; border-radius: 20px; padding: 7px 20px; font-size: 12px; font-weight: 600;">PA + CI</div>
                </div>
            </div>
            <div style="grid-column: span 2;">
              <label style="${labelStyle}">ADD-ONS (OPTIONAL)</label>
              <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 8px;">
                <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #111827; font-weight: 500;">
                  <input type="checkbox" style="width: 16px; height: 16px;" ${disabledAttr}> EMI Protection
                </label>
                <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #111827; font-weight: 500;">
                  <input type="checkbox" style="width: 16px; height: 16px;" ${disabledAttr}> Loss of Employment
                </label>
                <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #111827; font-weight: 500;">
                  <input type="checkbox" style="width: 16px; height: 16px;" ${disabledAttr}> Seasonal Disease Hospitalisation
                </label>
              </div>
            </div>
          `;
      } else if (activeTab === 'property') {
          reqCount = 4;
          contentHtml = `
            <div style="margin-bottom: 16px;">
              <div style="font-size: 13px; font-weight: 700; color: #111827;">Property Insurance Details</div>
              <div style="font-size: 11px; color: #9CA3AF;">Required for PolicyBazaar quote generation</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div>
                <label style="${labelStyle}">CITY *</label>
                <input type="text" placeholder="Enter city" style="${inputStyle}" ${readonlyAttr} value="Mumbai">
              </div>
              <div>
                <label style="${labelStyle}">PROPERTY TYPE *</label>
                <select style="${inputStyle}" ${disabledAttr}>
                  <option selected>Flat</option><option>Independent House</option>
                </select>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div>
                <label style="${labelStyle}">MARKET VALUE *</label>
                <input type="number" placeholder="₹ Market value" style="${inputStyle}" ${readonlyAttr} value="6500000">
              </div>
              <div>
                <label style="${labelStyle}">HOUSEHOLD ITEMS VALUE *</label>
                <input type="number" placeholder="₹ Household items value" style="${inputStyle}" ${readonlyAttr} value="1500000">
              </div>
            </div>
          `;
      } else if (activeTab === 'cl' || activeTab === 'term') {
          reqCount = 6;
          let title = activeTab === 'cl' ? 'Credit Life Details' : 'Term Plan Details';
          contentHtml = `
            <div style="margin-bottom: 16px;">
              <div style="font-size: 13px; font-weight: 700; color: #111827;">${title}</div>
              <div style="font-size: 11px; color: #9CA3AF;">Required for PolicyBazaar quote generation</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div>
                <label style="${labelStyle}">DATE OF BIRTH *</label>
                <input type="date" style="${inputStyle}" ${readonlyAttr} value="1985-06-15">
              </div>
              <div>
                <label style="${labelStyle}">GENDER *</label>
                <div style="display: flex; gap: 8px; margin-top: 4px;">
                  <div style="background: #473391; color: white; border: 1.5px solid #473391; border-radius: 20px; padding: 7px 20px; font-size: 12px; font-weight: 600;">Male</div>
                  <div style="background: white; color: #6B7280; border: 1.5px solid #E5E7EB; border-radius: 20px; padding: 7px 20px; font-size: 12px; font-weight: 600;">Female</div>
                </div>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div>
                <label style="${labelStyle}">EDUCATIONAL QUALIFICATION *</label>
                <select style="${inputStyle}" ${disabledAttr}>
                  <option>Below 10th</option><option>10th</option><option>12th</option><option selected>Graduate</option><option>Post Graduate</option>
                </select>
              </div>
              <div>
                <label style="${labelStyle}">ANNUAL INCOME *</label>
                <select style="${inputStyle}" ${disabledAttr}>
                  <option>Below 5L</option><option>5L–10L</option><option selected>10L–25L</option><option>25L–50L</option><option>50L+</option>
                </select>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div>
                <label style="${labelStyle}">EMPLOYMENT TYPE *</label>
                <select style="${inputStyle}" ${disabledAttr}>
                  <option selected>Salaried</option><option>Self Professional</option>
                </select>
              </div>
              <div>
                <label style="${labelStyle}">SMOKES OR CHEW TOBACCO? *</label>
                <div style="display: flex; gap: 8px; margin-top: 4px;">
                  <div style="background: #E6F4ED; color: #1A7A4A; border: 1.5px solid #1A7A4A; border-radius: 20px; padding: 7px 20px; font-size: 12px; font-weight: 600;">No</div>
                  <div style="background: white; color: #6B7280; border: 1.5px solid #E5E7EB; border-radius: 20px; padding: 7px 20px; font-size: 12px; font-weight: 600;">Yes</div>
                </div>
              </div>
            </div>
          `;
      }
      
      let btnAction = isContacted ? 'handleGenerateQuoteFromContacted()' : 'handleGenerateQuoteFromNew()';
      
      let tabBox = `
        <div id="new-stage-content" style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin-top: 12px; position: relative;">
          <div id="new-stage-saving" style="position: absolute; right: 20px; top: 20px; font-size: 10px; color: #9CA3AF; font-weight: 600;"></div>
          ${contentHtml}
          <div style="display: flex; flex-direction: column; align-items: flex-end;">
              <div id="new-stage-completion" style="margin-top: 16px; font-size: 11px; color: #9CA3AF; margin-bottom: 20px;">
                 ${reqCount} of ${reqCount} fields filled
              </div>
          </div>
          ${isReadOnly ? '' : `
          <button id="new-stage-generate-btn" style="width: 100%; height: 44px; background: #473391; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;" onclick="${btnAction}">
            Generate Quote →
          </button>`}
        </div>
      `;
      
      let resultsHtml = '';
      if (isContacted && currentLead.contactedShowResults) {
          if (activeTab === 'lp') {
              resultsHtml = `
              <div style="margin-top: 24px;">
                <div style="font-size: 13px; font-weight: 700; color: #111827;">Generated Quotes</div>
                <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 12px;">CARE Health & TATA AIG · Based on details filled above</div>
                
                <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                    <!-- CARE Health Card -->
                    <div style="flex: 1; border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 16px; background: white;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                            <div style="width: 40px; height: 40px; border-radius: 50%; background: #F3F4F6; display: flex; align-items: center; justify-content: center; font-size: 20px;">🏥</div>
                            <div style="font-size: 13px; font-weight: 700; color: #111827;">CARE Health</div>
                        </div>
                        <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 4px;">Group Credit Protect Plus</div>
                        <div style="font-size: 22px; font-weight: 700; color: #473391;">₹12,500</div>
                        <div style="font-size: 10px; color: #9CA3AF; margin-bottom: 12px;">incl. GST</div>
                        <div style="font-size: 11px; color: #4B5563; margin-bottom: 12px;">Cover: ₹${formatLakhs(currentLead.si)}</div>
                        <hr style="border: none; border-top: 1px solid #E5E7EB; margin-bottom: 12px;">
                        <div style="display: flex; gap: 8px;">
                            <button style="flex: 1; height: 32px; background: #E6F4ED; color: #1A7A4A; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="handleShareQuote('WhatsApp')">WhatsApp</button>
                            <button style="flex: 1; height: 32px; background: #FDECEA; color: #C0392B; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="handleShareQuote('Email')">Email</button>
                        </div>
                    </div>
                    
                    <!-- TATA AIG Card -->
                    <div style="flex: 1; border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 16px; background: white;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                            <div style="width: 40px; height: 40px; border-radius: 50%; background: #F3F4F6; display: flex; align-items: center; justify-content: center; font-size: 20px;">🛡️</div>
                            <div style="font-size: 13px; font-weight: 700; color: #111827;">TATA AIG</div>
                        </div>
                        <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 4px;">Home Guard Shield</div>
                        <div style="font-size: 22px; font-weight: 700; color: #473391;">₹14,200</div>
                        <div style="font-size: 10px; color: #9CA3AF; margin-bottom: 12px;">incl. GST</div>
                        <div style="font-size: 11px; color: #4B5563; margin-bottom: 12px;">Cover: ₹${formatLakhs(currentLead.si)}</div>
                        <hr style="border: none; border-top: 1px solid #E5E7EB; margin-bottom: 12px;">
                        <div style="display: flex; gap: 8px;">
                            <button style="flex: 1; height: 32px; background: #E6F4ED; color: #1A7A4A; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="handleShareQuote('WhatsApp')">WhatsApp</button>
                            <button style="flex: 1; height: 32px; background: #FDECEA; color: #C0392B; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="handleShareQuote('Email')">Email</button>
                        </div>
                    </div>
                </div>
                
                <button style="width: 100%; padding: 10px; border: 1.5px solid #473391; background: white; color: #473391; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;" onclick="handleShareQuote('Both')">Share All Quotes</button>
              </div>
              `;
          } else {
              if (currentLead.contactedShowPBStep2) {
                  resultsHtml = `
                    <div style="margin-top: 24px;">
                      <div style="background: #FFFBEB; border: 1px solid #FCD34D; border-radius: 8px; padding: 12px; color: #92400E; font-size: 12px; font-weight: 500; margin-bottom: 16px;">
                        PolicyBazaar opened in a new tab. Take a screenshot of the quotes list and upload below.
                      </div>
                      
                      <div style="border: 2px dashed #D1D5DB; border-radius: 12px; padding: 32px; text-align: center; background: white; margin-bottom: 16px;">
                        <div style="font-size: 24px; margin-bottom: 12px;">📸</div>
                        <div style="font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 4px;">Upload Quotes Screenshot</div>
                        <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 16px;">Paste (Cmd+V) or click to browse</div>
                        <button style="background: #473391; color: white; border: none; border-radius: 6px; padding: 8px 16px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="handleExtractPBQuotes()">Extract Quotes with AI</button>
                      </div>
                  `;
                  
                  if (currentLead.contactedPBQuotesExtracted) {
                      resultsHtml += `
                        <div style="margin-bottom: 16px;">
                          <div style="font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 12px;">Extracted Quotes</div>
                          <div style="border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px; background: white; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" checked style="width: 16px; height: 16px;">
                                <div style="width: 40px; height: 40px; border-radius: 50%; background: #F3F4F6; display: flex; align-items: center; justify-content: center; font-size: 20px;">🛡️</div>
                                <div>
                                    <div style="font-size: 13px; font-weight: 700; color: #111827;">HDFC Ergo</div>
                                    <div style="font-size: 11px; color: #9CA3AF;">Home Shield Plus</div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 18px; font-weight: 700; color: #473391;">₹4,200/yr</div>
                            </div>
                          </div>
                          
                          <button style="width: 100%; padding: 10px; border: none; background: #473391; color: white; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;" onclick="handleShareQuote('WhatsApp')">Share Selected Quotes</button>
                        </div>
                      `;
                  }
                  resultsHtml += `</div>`;
              } else {
                  resultsHtml = `
                  <div style="margin-top: 24px; background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px;">
                    <div style="font-size: 13px; font-weight: 700; color: #111827;">Ready to generate quotes on PolicyBazaar</div>
                    <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 14px;">The details below will be pre-filled on PolicyBazaar</div>
                    
                    <div style="background: #F9FAFB; border-radius: 6px; padding: 10px 14px; font-size: 12px; color: #4B5563;">
                      ${activeTab === 'property' 
                        ? 'City: Mumbai · Type: Flat · Market Value: ₹6500000 · Household Items: ₹1500000'
                        : 'DOB: 1985-06-15 · Gender: Male · Income: 10L–25L · Employment: Salaried · Tobacco: No'
                      }
                    </div>
                    
                    <button style="width: 100%; height: 44px; background: #473391; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; margin-top: 16px; cursor: pointer;" onclick="handleOpenPB()">
                      Open PolicyBazaar Workspace →
                    </button>
                  </div>
                  `;
              }
          }
      }
      
      return `
        <div style="margin-bottom: 24px;">
          ${hlIndicator}
          ${tabsHtml}
          ${tabBox}
          ${resultsHtml}
        </div>
      `;
    }

    function renderNewStage(isReadOnly = false) {
        return renderProductTabsUI(false, isReadOnly);
    }
    
    function renderContactedStage(isReadOnly = false) {
        return renderProductTabsUI(true, isReadOnly);
    }
"""

# Find and replace all the old rendering functions: 
# renderNewStage, renderContactedStage, renderProductSelection (if it still exists and is not used elsewhere)
# Actually, let's just replace from renderNewStage down to just before renderLostStage or renderQuoteStage

html = re.sub(r'    function renderNewStage.*?function renderLostStage', new_functions + '\n    function renderLostStage', html, flags=re.DOTALL)

with open("index.html", "w") as f:
    f.write(html)
