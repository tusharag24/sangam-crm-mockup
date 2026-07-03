import re

html = open("index.html").read()

# 1. Update the 'RECOMMENDED' to 'SELECTED' and make it show on active tab
tabs_replacement = """
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
"""
html = re.sub(r'      let tabsHtml = `<div style="display: flex; gap: 8px; margin-bottom: 12px;">`;.*?tabsHtml \+= `</div>`;', tabs_replacement, html, flags=re.DOTALL)

# 2. Update completion indicator logic
completion_replacement = """
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
    };
"""
html = re.sub(r'    window\.updateNewStageCompletion = function\(\) \{.*?\n    \};\n', completion_replacement, html, flags=re.DOTALL)

# 3. Update the contentHtml block for the 4 tabs
contentHtml_replacement = """
      if (activeTab === 'lp') {
          contentHtml = `
            <div style="margin-bottom: 16px;">
              <div style="font-size: 13px; font-weight: 700; color: #111827;">Loan Protection Details</div>
              <div style="font-size: 11px; color: #9CA3AF;">Required for CARE Health & TATA AIG quote generation</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div>
                <label style="${labelStyle}">DATE OF BIRTH *</label>
                <input type="date" style="${inputStyle}" ${readonlyAttr}>
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
          contentHtml = `
            <div style="margin-bottom: 16px;">
              <div style="font-size: 13px; font-weight: 700; color: #111827;">Property Insurance Details</div>
              <div style="font-size: 11px; color: #9CA3AF;">Required for PolicyBazaar quote generation</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div>
                <label style="${labelStyle}">CITY *</label>
                <input type="text" placeholder="Enter city" style="${inputStyle}" ${readonlyAttr}>
              </div>
              <div>
                <label style="${labelStyle}">PROPERTY TYPE *</label>
                <select style="${inputStyle}" ${disabledAttr}>
                  <option>Flat</option><option>Independent House</option>
                </select>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div>
                <label style="${labelStyle}">MARKET VALUE *</label>
                <input type="number" placeholder="₹ Market value" style="${inputStyle}" ${readonlyAttr}>
              </div>
              <div>
                <label style="${labelStyle}">HOUSEHOLD ITEMS VALUE *</label>
                <input type="number" placeholder="₹ Household items value" style="${inputStyle}" ${readonlyAttr}>
              </div>
            </div>
          `;
      } else if (activeTab === 'cl' || activeTab === 'term') {
          let title = activeTab === 'cl' ? 'Credit Life Details' : 'Term Plan Details';
          contentHtml = `
            <div style="margin-bottom: 16px;">
              <div style="font-size: 13px; font-weight: 700; color: #111827;">${title}</div>
              <div style="font-size: 11px; color: #9CA3AF;">Required for PolicyBazaar quote generation</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div>
                <label style="${labelStyle}">DATE OF BIRTH *</label>
                <input type="date" style="${inputStyle}" ${readonlyAttr}>
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
                  <option>Below 10th</option><option>10th</option><option>12th</option><option>Graduate</option><option>Post Graduate</option>
                </select>
              </div>
              <div>
                <label style="${labelStyle}">ANNUAL INCOME *</label>
                <select style="${inputStyle}" ${disabledAttr}>
                  <option>Below 5L</option><option>5L–10L</option><option>10L–25L</option><option>25L–50L</option><option>50L+</option>
                </select>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div>
                <label style="${labelStyle}">EMPLOYMENT TYPE *</label>
                <select style="${inputStyle}" ${disabledAttr}>
                  <option>Salaried</option><option>Self Professional</option>
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
"""
html = re.sub(r'      if \(activeTab === \'lp\'\) \{.*?      \}\n', contentHtml_replacement + '\n', html, flags=re.DOTALL)

with open("index.html", "w") as f:
    f.write(html)
