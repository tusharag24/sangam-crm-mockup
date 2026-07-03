import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

new_rcp = """
    function renderAccordion(stageName, contentHtml) {
        let isExpanded = window.accordionState[stageName] || false;
        let color = '#473391';
        if(stageName==='Contacted') color='#2563EB';
        if(stageName==='Quote') color='#D97706';
        if(stageName==='Payment Done') color='#10B981';
        
        let expandedClass = isExpanded ? 'expanded' : '';
        return `
            <div class="accordion-section">
                <div class="accordion-header" onclick="toggleAccordion('${stageName}')">
                    <div class="accordion-header-left">
                        <div class="accordion-header-icon" style="background: ${color};"></div>
                        <div class="accordion-header-title">${stageName} Stage</div>
                        <div class="accordion-header-summary">Completed</div>
                    </div>
                    <div class="accordion-header-chevron ${expandedClass}">▾</div>
                </div>
                <div class="accordion-content ${expandedClass}">
                    ${contentHtml}
                </div>
            </div>
        `;
    }

    function renderCenterPanel() {
      const l = currentLead;
      let stages = ['New', 'Contacted', 'Quote', 'Payment Done', 'Policy Issued'];
      let currentIdx = stages.indexOf(l.bucket);
      if(currentIdx === -1) currentIdx = 0;
      
      let stageHtml = stages.map((s, idx) => {
        let isActive = idx === currentIdx;
        let isCompleted = idx < currentIdx;
        let bg = 'white'; let text = '#9CA3AF'; let border = '1px solid #E5E7EB';
        if(isActive) { bg = '#473391'; text = 'white'; border = '1px solid #473391'; }
        else if (isCompleted) { bg = '#F0EEFB'; text = '#473391'; border = '1px solid #F0EEFB'; }
        let chevron = `<div style="background: ${bg}; color: ${text}; border: ${border}; border-radius: 4px; padding: 6px 14px; font-size: 12px; font-weight: 600;">${s}</div>`;
        let arrow = idx < stages.length - 1 ? `<div style="color: #D1D5DB; margin: 0 8px; font-weight: 700;">></div>` : '';
        return chevron + arrow;
      }).join('');
      
      let centerContent = '';
      
      if (currentLead.status === 'Lost') {
          for (let i = 0; i <= currentIdx; i++) {
              if (stages[i] === 'New') centerContent += renderAccordion('New', `<div style="font-size: 13px; color: #9CA3AF; text-align: center;">Call the customer and record the outcome in Update Status.</div>`);
              if (stages[i] === 'Contacted') centerContent += renderAccordion('Contacted', renderProductSelection(true));
              if (stages[i] === 'Quote') centerContent += renderAccordion('Quote', renderQuoteStage(true));
              if (stages[i] === 'Payment Done') centerContent += renderAccordion('Payment Done', renderPaymentStage(true));
          }
          centerContent += `<div style="padding: 24px; text-align: center; color: #C0392B; font-weight: 600; background: #FEF2F2; border-radius: 8px; margin-top: 16px;">This lead was marked as Lost.</div>`;
      } else {
          for (let i = 0; i < currentIdx; i++) {
              if (stages[i] === 'New') centerContent += renderAccordion('New', `<div style="font-size: 13px; color: #9CA3AF; text-align: center;">Call the customer and record the outcome in Update Status.</div>`);
              if (stages[i] === 'Contacted') centerContent += renderAccordion('Contacted', renderProductSelection(true));
              if (stages[i] === 'Quote') centerContent += renderAccordion('Quote', renderQuoteStage(true));
              if (stages[i] === 'Payment Done') centerContent += renderAccordion('Payment Done', renderPaymentStage(true));
          }
          
          let activeContent = '';
          if (l.bucket === 'New') {
            activeContent = `
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 40px;">
                <div style="font-size: 13px; color: #9CA3AF; text-align: center;">Call the customer and record the outcome in Update Status.</div>
              </div>
            `;
          } else if (l.bucket === 'Contacted') activeContent = renderProductSelection(false);
          else if (l.bucket === 'Quote') activeContent = renderQuoteStage(false);
          else if (l.bucket === 'Payment Done') activeContent = renderPaymentStage(false);
          else if (l.bucket === 'Policy Issued') activeContent = renderPolicyIssuedStage();
          centerContent += activeContent;
      }

      let html = `
        <div style="background: white; border-bottom: 1px solid #E5E7EB; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
          <div style="display: flex; align-items: center;">
            ${stageHtml}
          </div>
          ${currentLead.status === 'Lost' 
             ? `<button style="border: 1.5px solid #10B981; color: white; background: #10B981; border-radius: 6px; padding: 7px 16px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="reopenLead()">Reopen Lead</button>`
             : `<button style="border: 1.5px solid #C0392B; color: #C0392B; background: white; border-radius: 6px; padding: 7px 16px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="openLostModal()">Mark as Lost</button>`
          }
        </div>
        <div style="flex: 1; overflow-y: auto; padding: 24px; background: #FAFAFA;">
          ${centerContent}
        </div>
      `;
      document.getElementById('detail-center').innerHTML = html;
    }
"""

# We'll use regex to replace from `function renderCenterPanel() {` up to `document.getElementById('detail-center').innerHTML = html;\n    }`
# Let's just find `function renderCenterPanel() {` and replace up to its end.
import re
pattern = re.compile(r'    function renderCenterPanel\(\) \{.*?(?:document\.getElementById\(\'detail-center\'\)\.innerHTML = [\s\S]*?;|document\.getElementById\(\'detail-center\'\)\.innerHTML = html;\n    \})', re.DOTALL)

match = pattern.search(html)
if match:
    html = html[:match.start()] + new_rcp + html[match.end():]
    
    # Inject isReadOnly defaults to the render functions
    html = html.replace("function renderProductSelection() {", "function renderProductSelection(isReadOnly = false) {\n      let inputClass = isReadOnly ? 'new-form-input form-readonly' : 'new-form-input';\n      let clickEvent = isReadOnly ? 'pointer-events:none;' : 'cursor:pointer;';")
    html = html.replace("function renderQuoteStage() {", "function renderQuoteStage(isReadOnly = false) {\n      let inputClass = isReadOnly ? 'new-form-input form-readonly' : 'new-form-input';\n      let clickEvent = isReadOnly ? 'pointer-events:none;' : 'cursor:pointer;';")
    html = html.replace("function renderPaymentStage() {", "function renderPaymentStage(isReadOnly = false) {\n      let inputClass = isReadOnly ? 'new-form-input form-readonly' : 'new-form-input';\n      let clickEvent = isReadOnly ? 'pointer-events:none;' : 'cursor:pointer;';")
    
    # Apply readonly conditionals to buttons inside stages
    html = re.sub(r'(<button[^>]*>Generate Quote[^<]*</button>)', r'${isReadOnly ? "" : `\1`}', html)
    html = re.sub(r'(<button[^>]*>Share Quote[^<]*</button>)', r'${isReadOnly ? "" : `\1`}', html)
    html = re.sub(r'(<button[^>]*>Send Payment Link[^<]*</button>)', r'${isReadOnly ? "" : `\1`}', html)

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Rebuilt renderCenterPanel with Accordions.")
else:
    print("Failed to match renderCenterPanel.")

