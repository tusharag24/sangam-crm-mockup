import re

html = open("index.html").read()

def extract_function(html_content, func_name):
    start_idx = html_content.find(f"function {func_name}(")
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

s, e = extract_function(html, "renderQuoteStage")
if s != -1:
    old_func = html[s:e]
    new_func = """function renderQuoteStage(isReadOnly = false) {
      let isIBMManager = (window.CURRENT_ROLE === 'MANAGER' || (document.getElementById('role-select') && document.getElementById('role-select').value === 'Manager'));
      
      let sharedQuotes = currentLead.sharedQuotes || [];
      if (sharedQuotes.length === 0) {
          sharedQuotes = [
              { insurer: 'CARE Health', plan: 'Group Credit Protect Plus', premium: '12,500' }
          ];
      }
      
      let selectedQuote = currentLead.selectedPaymentQuote || null;
      let paymentLinkCreated = !!selectedQuote;
      
      // Verification states: null -> 'Verification Pending' -> 'Verified' or 'Payment Failed'
      let selectedVerification = currentLead.quoteVerificationSelected || '';
      
      let verificationPillStyle = (status) => {
          if (selectedVerification === status) {
              if (status === 'Verification Pending') return 'background: #FFF8E1; border: 1.5px solid #F5CBA7; color: #856404;';
              if (status === 'Payment Failed') return 'background: #FDECEA; border: 1.5px solid #F5A4A4; color: #C0392B;';
              if (status === 'Verified') return 'background: #E6F4ED; border: 1.5px solid #A8D5B5; color: #1A7A4A;';
          }
          if (status === 'Verified' && !isIBMManager) {
              return 'background: #F3F4F6; border: 1.5px solid #E5E7EB; color: #9CA3AF; cursor: not-allowed; opacity: 0.6;';
          }
          return 'background: white; border: 1.5px solid #E5E7EB; color: #6B7280;';
      };

      let sharedQuotesHtml = '';
      
      if (!paymentLinkCreated && !isReadOnly) {
          let listHtml = sharedQuotes.map(q => {
              return `
                  <div style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; background: #FAFAFA;">
                      <div>
                          <div style="font-size: 13px; font-weight: 700; color: #111827;">${q.insurer}</div>
                          <div style="font-size: 11px; color: #6B7280;">${q.plan}</div>
                      </div>
                      <div style="display: flex; align-items: center; gap: 16px;">
                          <div style="font-size: 14px; font-weight: 700; color: #111827;">₹${q.premium}</div>
                          <button style="background: #473391; color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 11px; font-weight: 700; cursor: pointer;" onclick="createPaymentLink('${q.insurer}', '${q.plan}', '${q.premium}')">Create Payment Link</button>
                      </div>
                  </div>
              `;
          }).join('');
          
          sharedQuotesHtml = `
            <div style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <div style="font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 16px;">Shared Quotes</div>
              ${listHtml}
            </div>
          `;
      } else {
          // A quote has been selected for payment
          let q = selectedQuote || sharedQuotes[0];
          sharedQuotesHtml = `
            <div style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div style="font-size: 13px; font-weight: 700;">Customer's Selected Plan</div>
                <div style="background: #E6F4ED; color: #1A7A4A; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700;">Quote Shared</div>
              </div>
              
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: #F3F4F6; display: flex; align-items: center; justify-content: center; font-size: 16px;">🏥</div>
                <div style="font-weight: 700; font-size: 12px;">${q.insurer}</div>
                <div style="color: #E5E7EB;">|</div>
                <div style="color: #9CA3AF; font-size: 12px;">${q.plan}</div>
                <div style="color: #E5E7EB;">|</div>
                <div style="color: #473391; font-weight: 700; font-size: 13px;">₹${q.premium}</div>
              </div>
              
              ${isReadOnly ? '' : `<div style="font-size: 11px; color: #473391; cursor: pointer; text-decoration: underline;" onclick="resetSelectedQuote()">Change Plan</div>`}
            </div>
          `;
      }

      let paymentCardHtml = '';
      let verificationCardHtml = '';
      
      if (paymentLinkCreated || isReadOnly) {
          let hasLink = currentLead.quotePaymentShared;
          
          if (hasLink) {
              paymentCardHtml = `
                <div style="background: white; border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
                  <div style="font-size: 13px; font-weight: 700; margin-bottom: 12px;">Payment Link</div>
                  <div style="position: relative;">
                    <input type="text" value="${currentLead.paymentLinkValue || 'https://pay.careinsurance.com/pay?id=83726492'}" style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; box-sizing: border-box;" readonly>
                    <span style="position: absolute; right: 10px; top: 10px; color: #10B981; font-weight: bold;">✓</span>
                  </div>
                  ${isReadOnly ? '' : `<div style="font-size: 11px; color: #473391; margin-top: 8px; cursor: pointer; text-decoration: underline;" onclick="showToast('Link copied!')">Resend link</div>`}
                </div>
              `;
              
              // Only show verification card once link is sent
              verificationCardHtml = `
                <div style="background: white; border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <div style="font-size: 13px; font-weight: 700;">Payment Verification</div>
                    <div style="font-size: 11px; color: #9CA3AF;">To be confirmed by IBM Manager</div>
                  </div>
                  
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                    <div>
                      <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; margin-bottom: 4px; display: block;">PAYMENT AMOUNT *</label>
                      <input type="number" id="pay-amt" placeholder="₹ Amount" value="${(selectedQuote ? selectedQuote.premium.replace(',','') : '')}" style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; box-sizing: border-box;" ${isReadOnly ? 'readonly' : ''}>
                    </div>
                    <div>
                      <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; margin-bottom: 4px; display: block;">UTR NUMBER *</label>
                      <input type="text" id="pay-utr" placeholder="Transaction reference" style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; box-sizing: border-box;" ${isReadOnly ? 'readonly' : ''}>
                    </div>
                  </div>
                  
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                    <div>
                      <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; margin-bottom: 4px; display: block;">PAYMENT DATE *</label>
                      <input type="date" style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; box-sizing: border-box;" ${isReadOnly ? 'readonly' : ''}>
                    </div>
                    <div>
                      <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; margin-bottom: 4px; display: block;">UPLOAD PROOF *</label>
                      <input type="file" style="width: 100%; font-size: 11px;" ${isReadOnly ? 'disabled' : ''}>
                    </div>
                  </div>
                  
                  <div style="margin-bottom: 16px;">
                    <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; margin-bottom: 8px; display: block;">VERIFICATION STATUS</label>
                    <div style="display: flex; gap: 8px;">
                      <button style="flex: 1; padding: 8px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; cursor: ${isReadOnly ? 'default' : 'pointer'}; ${verificationPillStyle('Verification Pending')}" onclick="${isReadOnly ? '' : 'handleSelectVerification(\'Verification Pending\')'}">Verification Pending</button>
                      <button style="flex: 1; padding: 8px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; cursor: ${isReadOnly ? 'default' : 'pointer'}; ${verificationPillStyle('Payment Failed')}" onclick="${isReadOnly ? '' : 'handleSelectVerification(\'Payment Failed\')'}">Payment Failed</button>
                      <button style="flex: 1; padding: 8px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; cursor: ${isReadOnly || !isIBMManager ? 'not-allowed' : 'pointer'}; ${verificationPillStyle('Verified')}" onclick="${isReadOnly || !isIBMManager ? '' : 'handleSelectVerification(\'Verified\')'}" title="${!isIBMManager ? 'Only IBM Manager can mark as Verified' : ''}">Verified</button>
                    </div>
                  </div>
                  
                  ${isReadOnly ? '' : `
                  <button style="width: 100%; height: 44px; background: #473391; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; margin-top: 16px; cursor: pointer;" onclick="handleConfirmPayment()">
                    ${isIBMManager ? 'Confirm Payment Status' : 'Send Payment for Verification'}
                  </button>
                  `}
                </div>
              `;
          } else {
              paymentCardHtml = `
                <div style="background: white; border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
                  <div style="font-size: 13px; font-weight: 700; margin-bottom: 12px;">Payment Link</div>
                  <input type="text" placeholder="Paste payment link here..." style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; box-sizing: border-box; margin-bottom: 8px;" id="payment-link-input" oninput="document.getElementById('share-btn-wa').disabled = !this.value; document.getElementById('share-btn-em').disabled = !this.value; currentLead.paymentLinkValue = this.value;">
                  <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 12px;">Ensure you paste the correct link for the selected quote</div>
                  <div style="display: flex; gap: 8px;">
                    <button id="share-btn-wa" disabled style="flex: 1; height: 32px; background: #E6F4ED; color: #1A7A4A; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="handleSharePaymentLink('WhatsApp')">Send via WhatsApp</button>
                    <button id="share-btn-em" disabled style="flex: 1; height: 32px; background: #FDECEA; color: #C0392B; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="handleSharePaymentLink('Email')">Send via Email</button>
                  </div>
                </div>
              `;
          }
      }

      return `
        <div>
          ${sharedQuotesHtml}
          ${paymentCardHtml}
          ${verificationCardHtml}
        </div>
      `;
    }"""
    html = html.replace(old_func, new_func)

# 4. We need to add the functions called inside renderQuoteStage
quote_funcs = """
    window.createPaymentLink = function(insurer, plan, premium) {
        currentLead.selectedPaymentQuote = { insurer, plan, premium };
        renderLeadDetail();
    };
    
    window.resetSelectedQuote = function() {
        currentLead.selectedPaymentQuote = null;
        currentLead.quotePaymentShared = false;
        currentLead.quoteVerificationSelected = '';
        renderLeadDetail();
    };
    
    window.handleSharePaymentLink = function(method) {
        showToast("Payment Link Shared via " + method);
        currentLead.status = 'Payment Link Shared';
        currentLead.subStatus = 'Awaiting Payment';
        currentLead.log.unshift({ dot: '#3B82F6', text: `Agent Update · Payment link shared via ${method} · Just now`, time: 'Just now' });
        currentLead.quotePaymentShared = true;
        renderLeadDetail();
        if(typeof renderRightPanel === 'function') renderRightPanel();
    };
    
    window.handleSelectVerification = function(status) {
        currentLead.quoteVerificationSelected = status;
        renderLeadDetail();
    };

    window.handleConfirmPayment = function() {
        let isIBMManager = (window.CURRENT_ROLE === 'MANAGER' || (document.getElementById('role-select') && document.getElementById('role-select').value === 'Manager'));
        
        if (currentLead.quoteVerificationSelected === 'Verified') {
            if (!isIBMManager) return; // safety
            currentLead.bucket = 'Payment Done';
            currentLead.status = 'Payment Done';
            currentLead.subStatus = 'Verified';
            
            let utr = document.getElementById('pay-utr') ? document.getElementById('pay-utr').value : '1234567890';
            currentLead.log.unshift({ dot: '#10B981', text: `IBM Manager · Payment verified · UTR: ${utr} · Lead moved to Payment Done · Just now`, time: 'Just now' });
            renderLeadDetail();
            if(typeof renderRightPanel === 'function') renderRightPanel();
        } else if (currentLead.quoteVerificationSelected === 'Payment Failed') {
            currentLead.log.unshift({ dot: '#C0392B', text: `IBM Manager · Payment marked as Failed · Just now`, time: 'Just now' });
            renderLeadDetail();
        } else {
            // Sent for verification
            currentLead.quoteVerificationSelected = 'Verification Pending';
            currentLead.log.unshift({ dot: '#F59E0B', text: `Agent Update · Payment proof uploaded · Sent for verification · Just now`, time: 'Just now' });
            showToast("Submitted to IBM Manager for Verification");
            renderLeadDetail();
        }
    };
"""
if "window.createPaymentLink =" not in html:
    # Add these before renderQuoteStage
    html = html.replace('function renderQuoteStage(isReadOnly = false) {', quote_funcs + '\n    function renderQuoteStage(isReadOnly = false) {')


with open("index.html", "w") as f:
    f.write(html)
