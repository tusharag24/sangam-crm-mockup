import re

html = open("index.html").read()

quote_stage_new = """
    window.handleChangePlan = function() {
        showToast("Change Plan modal will appear here.");
    };

    window.handleSharePaymentLink = function(method) {
        showToast("Payment Link Shared via " + method);
        currentLead.status = 'Payment Link Shared';
        currentLead.subStatus = 'Awaiting Payment';
        addActivity('System', 'Payment link shared', `via ${method}`, 'Just now');
        currentLead.quotePaymentShared = true;
        renderLeadDetail();
        renderRightPanel();
    };
    
    window.handleSelectVerification = function(status) {
        // Mockup restriction
        if (status === 'Verified') {
            // Assume IBM Manager is true for mockup, or if role is Agent, show toast
            // Let's assume we are Manager for the demo
            currentLead.quoteVerificationSelected = status;
        } else {
            currentLead.quoteVerificationSelected = status;
        }
        renderLeadDetail();
    };

    window.handleConfirmPayment = function() {
        if (currentLead.quoteVerificationSelected === 'Verified') {
            currentLead.bucket = 'Payment Done';
            currentLead.status = 'Payment Done';
            currentLead.subStatus = 'Verified';
            addActivity('System', 'Payment verified by Manager', `UTR: 1234567890 · ₹12,500 · Just now`, 'Just now');
            renderLeadDetail();
            renderRightPanel();
        } else {
            showToast("Submitted for Verification");
        }
    };

    function renderQuoteStage(isReadOnly = false) {
      let isIBMManager = true; // Hardcode for demo purposes
      
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

      let paymentCardHtml = '';
      if (currentLead.quotePaymentShared) {
          paymentCardHtml = `
            <div style="background: white; border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
              <div style="font-size: 13px; font-weight: 700; margin-bottom: 12px;">Payment Link</div>
              <div style="position: relative;">
                <input type="text" value="https://pay.careinsurance.com/pay?id=83726492" style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; box-sizing: border-box;" readonly>
                <span style="position: absolute; right: 10px; top: 10px; color: #10B981; font-weight: bold;">✓</span>
              </div>
              <div style="font-size: 11px; color: #473391; margin-top: 8px; cursor: pointer; text-decoration: underline;">Resend link</div>
            </div>
          `;
      } else {
          paymentCardHtml = `
            <div style="background: white; border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
              <div style="font-size: 13px; font-weight: 700; margin-bottom: 12px;">Payment Link</div>
              <input type="text" placeholder="Paste payment link here..." style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; box-sizing: border-box; margin-bottom: 8px;" id="payment-link-input" oninput="document.getElementById('share-btn-wa').disabled = !this.value; document.getElementById('share-btn-em').disabled = !this.value;">
              <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 12px;">Ensure you paste the correct link for Loan Protection</div>
              <div style="display: flex; gap: 8px;">
                <button id="share-btn-wa" disabled style="flex: 1; height: 32px; background: #E6F4ED; color: #1A7A4A; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="handleSharePaymentLink('WhatsApp')">Send via WhatsApp</button>
                <button id="share-btn-em" disabled style="flex: 1; height: 32px; background: #FDECEA; color: #C0392B; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="handleSharePaymentLink('Email')">Send via Email</button>
              </div>
            </div>
          `;
      }

      return `
        <div>
          <!-- Section 1 - Selected Plan Summary -->
          <div style="background: white; border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div style="font-size: 13px; font-weight: 700;">Customer's Selected Plan</div>
              <div style="background: #E6F4ED; color: #1A7A4A; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700;">Quote Shared</div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: #F3F4F6; display: flex; align-items: center; justify-content: center; font-size: 16px;">🏥</div>
              <div style="font-weight: 700; font-size: 12px;">CARE Health</div>
              <div style="color: #E5E7EB;">|</div>
              <div style="color: #9CA3AF; font-size: 12px;">Group Credit Protect Plus</div>
              <div style="color: #E5E7EB;">|</div>
              <div style="color: #473391; font-weight: 700; font-size: 13px;">₹12,500</div>
            </div>
            
            ${isReadOnly ? '' : `<div style="font-size: 11px; color: #473391; cursor: pointer; text-decoration: underline;" onclick="handleChangePlan()">Change Plan</div>`}
          </div>

          <!-- Section 2 - Payment Link Card -->
          ${paymentCardHtml}

          <!-- Section 3 - Payment Verification -->
          <div style="background: white; border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div style="font-size: 13px; font-weight: 700;">Payment Verification</div>
              <div style="font-size: 11px; color: #9CA3AF;">To be confirmed by IBM Manager</div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div>
                <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; margin-bottom: 4px; display: block;">PAYMENT AMOUNT *</label>
                <input type="number" placeholder="₹ Amount" style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; box-sizing: border-box;" ${isReadOnly ? 'readonly' : ''}>
              </div>
              <div>
                <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; margin-bottom: 4px; display: block;">UTR NUMBER *</label>
                <input type="text" placeholder="Transaction reference" style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; box-sizing: border-box;" ${isReadOnly ? 'readonly' : ''}>
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
                <button style="flex: 1; padding: 8px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; cursor: ${isReadOnly ? 'default' : 'pointer'}; ${verificationPillStyle('Verification Pending')}" onclick="${isReadOnly ? '' : 'handleSelectVerification(\\\'Verification Pending\\\')'}">Verification Pending</button>
                <button style="flex: 1; padding: 8px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; cursor: ${isReadOnly ? 'default' : 'pointer'}; ${verificationPillStyle('Payment Failed')}" onclick="${isReadOnly ? '' : 'handleSelectVerification(\\\'Payment Failed\\\')'}">Payment Failed</button>
                <button style="flex: 1; padding: 8px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; cursor: ${isReadOnly || !isIBMManager ? 'not-allowed' : 'pointer'}; ${verificationPillStyle('Verified')}" onclick="${isReadOnly || !isIBMManager ? '' : 'handleSelectVerification(\\\'Verified\\\')'}" title="${!isIBMManager ? 'Only IBM Manager can mark as Verified' : ''}">Verified</button>
              </div>
            </div>
            
            ${isReadOnly ? '' : `
            <button style="width: 100%; height: 44px; background: #473391; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; margin-top: 16px; cursor: pointer;" onclick="handleConfirmPayment()">
              ${isIBMManager ? 'Confirm Payment Status' : 'Submit for Verification'}
            </button>
            `}
          </div>
        </div>
      `;
    }
"""

html = re.sub(r'    function renderQuoteStage.*?function renderPaymentStage', quote_stage_new + '\n    function renderPaymentStage', html, flags=re.DOTALL)

open("index.html", "w").write(html)
