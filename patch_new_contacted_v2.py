import re

html = open("index.html").read()

def extract_window_function(html_content, func_name):
    # This finds `window.func_name = function`
    start_idx = html_content.find(f"window.{func_name} = function")
    if start_idx == -1: return -1, -1
    
    brace_count = 0
    in_string = False
    string_char = ''
    start_brace = html_content.find("{", start_idx)
    
    for i in range(start_brace, len(html_content)):
        char = html_content[i]
        
        if char in ["'", '"', "`"]:
            if i > 0 and html_content[i-1] == '\\':
                pass
            elif not in_string:
                in_string = True
                string_char = char
            elif in_string and string_char == char:
                in_string = False
                
        if not in_string:
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    return start_idx, i + 1
    return -1, -1

s, e = extract_window_function(html, "renderProductTabsUI")
if s != -1:
    old_func = html[s:e]
    new_func = """window.renderProductTabsUI = function(isContacted, isReadOnly = false) {
      let activeTab = currentLead.newStageActiveTab || currentLead.finalProduct || currentLead.initialProduct || 'lp';
      
      let inputClass = isReadOnly ? 'new-form-input form-readonly' : 'new-form-input new-stage-track';
      let clickEvent = isReadOnly ? 'pointer-events:none;' : 'cursor:pointer;';
      let disabledAttr = isReadOnly ? 'disabled' : '';
      let readonlyAttr = isReadOnly ? 'readonly' : '';
      
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
              <div style="font-size: 11px; color: #9CA3AF;">Internal calculators used for CARE Health & TATA AIG</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div><label style="${labelStyle}">DATE OF BIRTH *</label><input type="date" style="${inputStyle}" ${readonlyAttr} value="1985-06-15"></div>
              <div style="position: relative;"><label style="${labelStyle}">LOAN AMOUNT ${hlBadge}</label><input type="text" value="₹ ${formatLakhs(currentLead.si)}" style="${lockedStyle}" readonly>${lockIcon}</div>
            </div>
            <div style="margin-bottom: 14px; grid-column: span 2;">
                <label style="${labelStyle}">PLAN TYPE *</label>
                <div style="display: flex; gap: 8px; margin-top: 4px;">
                  <div style="background: #473391; color: white; border: 1.5px solid #473391; border-radius: 20px; padding: 7px 20px; font-size: 12px; font-weight: 600;">PA Only</div>
                  <div style="background: white; color: #6B7280; border: 1.5px solid #E5E7EB; border-radius: 20px; padding: 7px 20px; font-size: 12px; font-weight: 600;">PA + CI</div>
                </div>
            </div>
          `;
      } else if (activeTab === 'property') {
          reqCount = 4;
          contentHtml = `
            <div style="margin-bottom: 16px;">
              <div style="font-size: 13px; font-weight: 700; color: #111827;">Property Insurance Details</div>
              <div style="font-size: 11px; color: #9CA3AF;">Scraped from PolicyBazaar</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div><label style="${labelStyle}">CITY *</label><input type="text" placeholder="Enter city" style="${inputStyle}" ${readonlyAttr} value="Mumbai"></div>
              <div><label style="${labelStyle}">PROPERTY TYPE *</label><select style="${inputStyle}" ${disabledAttr}><option selected>Flat</option><option>Independent House</option></select></div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div><label style="${labelStyle}">MARKET VALUE *</label><input type="number" placeholder="₹ Market value" style="${inputStyle}" ${readonlyAttr} value="6500000"></div>
              <div><label style="${labelStyle}">HOUSEHOLD ITEMS VALUE *</label><input type="number" placeholder="₹ Household items value" style="${inputStyle}" ${readonlyAttr} value="1500000"></div>
            </div>
          `;
      } else if (activeTab === 'cl' || activeTab === 'term') {
          reqCount = 6;
          let title = activeTab === 'cl' ? 'Credit Life Details' : 'Term Plan Details';
          contentHtml = `
            <div style="margin-bottom: 16px;">
              <div style="font-size: 13px; font-weight: 700; color: #111827;">${title}</div>
              <div style="font-size: 11px; color: #9CA3AF;">Scraped from PolicyBazaar</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div><label style="${labelStyle}">DATE OF BIRTH *</label><input type="date" style="${inputStyle}" ${readonlyAttr} value="1985-06-15"></div>
              <div><label style="${labelStyle}">GENDER *</label>
                <div style="display: flex; gap: 8px; margin-top: 4px;">
                  <div style="background: #473391; color: white; border: 1.5px solid #473391; border-radius: 20px; padding: 7px 20px; font-size: 12px; font-weight: 600;">Male</div>
                  <div style="background: white; color: #6B7280; border: 1.5px solid #E5E7EB; border-radius: 20px; padding: 7px 20px; font-size: 12px; font-weight: 600;">Female</div>
                </div>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div><label style="${labelStyle}">EDUCATIONAL QUALIFICATION *</label><select style="${inputStyle}" ${disabledAttr}><option selected>Graduate</option></select></div>
              <div><label style="${labelStyle}">ANNUAL INCOME *</label><select style="${inputStyle}" ${disabledAttr}><option selected>10L–25L</option></select></div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div><label style="${labelStyle}">EMPLOYMENT TYPE *</label><select style="${inputStyle}" ${disabledAttr}><option selected>Salaried</option></select></div>
              <div><label style="${labelStyle}">SMOKES OR CHEW TOBACCO? *</label>
                <div style="display: flex; gap: 8px; margin-top: 4px;">
                  <div style="background: #E6F4ED; color: #1A7A4A; border: 1.5px solid #1A7A4A; border-radius: 20px; padding: 7px 20px; font-size: 12px; font-weight: 600;">No</div>
                  <div style="background: white; color: #6B7280; border: 1.5px solid #E5E7EB; border-radius: 20px; padding: 7px 20px; font-size: 12px; font-weight: 600;">Yes</div>
                </div>
              </div>
            </div>
          `;
      }
      
      let tabBox = `
        <div style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin-top: 12px; position: relative;">
          ${contentHtml}
      `;
      
      if (!isContacted && !isReadOnly) {
          // New Stage
          tabBox += `
            <div style="display: flex; flex-direction: column; align-items: flex-end;">
                <div style="margin-top: 16px; font-size: 11px; color: #9CA3AF; margin-bottom: 20px;">${reqCount} of ${reqCount} fields filled</div>
            </div>
            <button style="width: 100%; height: 44px; background: #473391; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;" onclick="window.handleGenerateQuoteFromNew('${activeTab}')">
              Generate Quote →
            </button>
          `;
      } else if (isContacted) {
          // Contacted Stage
          let quotesList = [];
          if (activeTab === 'lp') {
              quotesList = [
                  { insurer: 'CARE Health', plan: 'Group Credit Protect Plus', premium: '12,500' },
                  { insurer: 'TATA AIG', plan: 'Loan Secure', premium: '14,200' }
              ];
          } else {
              quotesList = [
                  { insurer: 'HDFC Ergo', plan: 'Comprehensive Cover', premium: '8,400' },
                  { insurer: 'Bajaj Allianz', plan: 'Safe Home', premium: '9,100' },
                  { insurer: 'SBI General', plan: 'Home Protect', premium: '7,800' }
              ];
          }
          
          let quotesHtml = quotesList.map(q => {
              return `
                  <div style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; background: #FAFAFA;">
                      <div>
                          <div style="font-size: 13px; font-weight: 700; color: #111827;">${q.insurer}</div>
                          <div style="font-size: 11px; color: #6B7280;">${q.plan}</div>
                      </div>
                      <div style="display: flex; align-items: center; gap: 16px;">
                          <div style="font-size: 14px; font-weight: 700; color: #111827;">₹${q.premium}</div>
                          ${isReadOnly ? '' : `<button style="background: white; border: 1.5px solid #473391; color: #473391; border-radius: 6px; padding: 6px 12px; font-size: 11px; font-weight: 700; cursor: pointer;" onclick="window.shareSingleQuote('${q.insurer}', '${q.plan}', '${q.premium}')">Share</button>`}
                      </div>
                  </div>
              `;
          }).join('');
          
          tabBox += `
            <div style="margin-top: 32px; border-top: 1px dashed #E5E7EB; padding-top: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <div style="font-size: 14px; font-weight: 700; color: #111827;">Generated Quotes</div>
                    <div style="font-size: 11px; color: #9CA3AF;">${activeTab === 'lp' ? 'Internal Calculator' : 'via PolicyBazaar'}</div>
                </div>
                ${quotesHtml}
                ${isReadOnly ? '' : `
                <button style="width: 100%; height: 44px; background: white; color: #473391; border: 1.5px solid #473391; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; margin-top: 8px;" onclick="window.shareAllQuotes('${activeTab}')">
                  Share All Quotes →
                </button>
                `}
            </div>
          `;
      }
      
      tabBox += `</div>`;
      return hlIndicator + tabsHtml + tabBox;
    }"""
    html = html.replace(old_func, new_func)
    print("Replaced renderProductTabsUI")

s, e = extract_window_function(html, "handleGenerateQuoteFromNew")
if s != -1:
    old_func = html[s:e]
    new_func = """window.handleGenerateQuoteFromNew = function(tab) {
        if (!tab) tab = currentLead.newStageActiveTab || 'lp';
        if (tab === 'lp') {
            showToast('Generating quotes via internal calculator...');
        } else {
            showToast('Simulating PolicyBazaar iframe scraping...');
        }
        
        setTimeout(() => {
            currentLead.bucket = 'Contacted';
            const TABS = { 'lp': 'Loan Protection', 'property': 'Property Insurance', 'cl': 'Credit Life', 'term': 'Term Plan' };
            currentLead.log.unshift({ dot: '#473391', text: `System Update · Quotes generated for ${TABS[tab] || tab} · Just now`, time: 'Just now' });
            renderLeadDetail();
        }, 1000);
    }"""
    html = html.replace(old_func, new_func)
    print("Replaced handleGenerateQuoteFromNew")
    
# also check if there is an old empty handleGenerateQuoteFromNew definition
# Let's clean up any possible empty handleGenerateQuoteFromNew that might override it.
# e.g. window.handleGenerateQuoteFromNew = function() { };

with open("index.html", "w") as f:
    f.write(html)
