import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace renderCenterPanel
old_rcp = """    function renderCenterPanel() {
      let centerContent = '';
      if (currentLead.bucket === 'New') {
        centerContent = renderNewStage();
      } else if (currentLead.bucket === 'Contacted') {
        centerContent = renderContactedStage();
      } else if (currentLead.bucket === 'Quote') {
        centerContent = renderQuoteStage();
      } else if (currentLead.bucket === 'Payment Link') {
        centerContent = renderPaymentDoneStage();
      } else if (currentLead.bucket === 'Processing') {
        centerContent = renderProcessingStage();
      } else if (currentLead.bucket === 'Policy Issued') {
        centerContent = renderPolicyIssuedStage();
      }
      document.getElementById('detail-center').innerHTML = centerContent;
    }"""

new_rcp = """    function renderAccordion(stageName, contentHtml) {
        let isExpanded = window.accordionState[stageName] || false;
        let color = '#473391';
        if(stageName==='Contacted') color='#2563EB';
        if(stageName==='Quote') color='#D97706';
        if(stageName==='Payment Link') color='#10B981';
        
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
      let centerContent = '';
      let stages = ['New', 'Contacted', 'Quote', 'Payment Link', 'Processing', 'Policy Issued'];
      let currentIdx = stages.indexOf(currentLead.bucket);
      
      if (currentLead.status === 'Lost') {
          // Render everything in readonly accordions if lost
          for (let i = 0; i <= currentIdx; i++) {
              if (stages[i] === 'New') centerContent += renderAccordion('New', renderNewStage(true));
              if (stages[i] === 'Contacted') centerContent += renderAccordion('Contacted', renderContactedStage(true));
              if (stages[i] === 'Quote') centerContent += renderAccordion('Quote', renderQuoteStage(true));
              if (stages[i] === 'Payment Link') centerContent += renderAccordion('Payment Link', renderPaymentDoneStage(true));
              if (stages[i] === 'Processing') centerContent += renderAccordion('Processing', renderProcessingStage(true));
          }
          centerContent += `<div style="padding: 24px; text-align: center; color: #C0392B; font-weight: 600; background: #FEF2F2; border-radius: 8px; margin-top: 16px;">This lead was marked as Lost.</div>`;
          document.getElementById('detail-center').innerHTML = centerContent;
          return;
      }
      
      // Render previous stages as accordions
      for (let i = 0; i < currentIdx; i++) {
          if (stages[i] === 'New') centerContent += renderAccordion('New', renderNewStage(true));
          if (stages[i] === 'Contacted') centerContent += renderAccordion('Contacted', renderContactedStage(true));
          if (stages[i] === 'Quote') centerContent += renderAccordion('Quote', renderQuoteStage(true));
          if (stages[i] === 'Payment Link') centerContent += renderAccordion('Payment Link', renderPaymentDoneStage(true));
      }
      
      // Render current stage active
      let activeContent = '';
      if (currentLead.bucket === 'New') activeContent = renderNewStage(false);
      else if (currentLead.bucket === 'Contacted') activeContent = renderContactedStage(false);
      else if (currentLead.bucket === 'Quote') activeContent = renderQuoteStage(false);
      else if (currentLead.bucket === 'Payment Link') activeContent = renderPaymentDoneStage(false);
      else if (currentLead.bucket === 'Processing') activeContent = renderProcessingStage(false);
      else if (currentLead.bucket === 'Policy Issued') activeContent = renderPolicyIssuedStage(false);
      
      centerContent += activeContent;
      document.getElementById('detail-center').innerHTML = centerContent;
    }"""

if old_rcp in html:
    html = html.replace(old_rcp, new_rcp)
else:
    print("Could not find old renderCenterPanel")

# Inject isReadOnly defaults to the render functions
html = html.replace("function renderNewStage() {", "function renderNewStage(isReadOnly = false) {\n      let inputClass = isReadOnly ? 'new-form-input form-readonly' : 'new-form-input new-stage-track';\n      let clickEvent = isReadOnly ? 'pointer-events:none;' : 'cursor:pointer;';")
html = html.replace("function renderContactedStage() {", "function renderContactedStage(isReadOnly = false) {\n      let inputClass = isReadOnly ? 'new-form-input form-readonly' : 'new-form-input new-stage-track';\n      let clickEvent = isReadOnly ? 'pointer-events:none;' : 'cursor:pointer;';")
html = html.replace("function renderQuoteStage() {", "function renderQuoteStage(isReadOnly = false) {\n      let inputClass = isReadOnly ? 'new-form-input form-readonly' : 'new-form-input new-stage-track';\n      let clickEvent = isReadOnly ? 'pointer-events:none;' : 'cursor:pointer;';")
html = html.replace("function renderPaymentDoneStage() {", "function renderPaymentDoneStage(isReadOnly = false) {\n      let inputClass = isReadOnly ? 'new-form-input form-readonly' : 'new-form-input new-stage-track';\n      let clickEvent = isReadOnly ? 'pointer-events:none;' : 'cursor:pointer;';")
html = html.replace("function renderProcessingStage() {", "function renderProcessingStage(isReadOnly = false) {\n      let inputClass = isReadOnly ? 'new-form-input form-readonly' : 'new-form-input new-stage-track';\n      let clickEvent = isReadOnly ? 'pointer-events:none;' : 'cursor:pointer;';")
html = html.replace("function renderPolicyIssuedStage() {", "function renderPolicyIssuedStage(isReadOnly = false) {")

# Need to replace some generic button tags with conditionals for isReadOnly
html = re.sub(r'(<button[^>]*>Generate Quote &rarr;</button>)', r'${isReadOnly ? "" : `\1`}', html)
html = re.sub(r'(<button[^>]*>Share Payment Link &rarr;</button>)', r'${isReadOnly ? "" : `\1`}', html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Accordion logic applied.")
