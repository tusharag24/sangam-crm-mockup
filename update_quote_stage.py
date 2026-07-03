import re

with open("index.html", "r") as f:
    html = f.read()

# Define the new renderQuoteStage function and all the helper functions
new_code = """    // --- START NEW QUOTE STAGE HANDLERS ---
    window.handleSelectQuoteForPayment = function(insurer, plan, premium) {
        currentLead.quotePaymentSelected = { insurer, plan, premium };
        currentLead.paymentLinkShared = false;
        currentLead.proofUploaded = false;
        currentLead.ocrExtracted = false;
        currentLead.ocrLoading = false;
        currentLead.log.unshift({ dot: '#473391', text: `System Update · Customer selected plan — ${insurer} · ${plan} · ₹${premium} · Just now`, time: 'Just now' });
        
        // Update product status pill to Locked
        currentLead.productStatus = 'locked';
        
        renderLeadDetail();
    };

    window.handleChangeQuoteSelection = function() {
        currentLead.quotePaymentSelected = null;
        currentLead.paymentLinkShared = false;
        currentLead.proofUploaded = false;
        currentLead.ocrExtracted = false;
        
        // Revert product status if needed
        currentLead.productStatus = 'draft';
        
        renderLeadDetail();
    };

    window.handleSendPaymentLink = function(method) {
        currentLead.paymentLinkShared = true;
        currentLead.paymentLinkValue = document.getElementById('payment-link-input').value;
        currentLead.status = 'Payment Link Shared';
        currentLead.subStatus = 'Awaiting Payment';
        currentLead.log.unshift({ dot: '#2563EB', text: `System Update · Payment link sent via ${method} · Just now`, time: 'Just now' });
        showToast('Payment link sent successfully');
        
        if (typeof renderRightPanel === 'function') renderRightPanel();
        renderLeadDetail();
    };
    
    window.handleResendPaymentLink = function() {
        showToast('Payment link resent successfully');
        currentLead.log.unshift({ dot: '#2563EB', text: `System Update · Payment link resent · Just now`, time: 'Just now' });
        renderLeadDetail();
    };

    window.simulateProofUpload = function() {
        currentLead.proofUploaded = true;
        currentLead.proofFilename = 'payment_receipt_8472.pdf';
        currentLead.proofSize = '1.2 MB';
        renderLeadDetail();
    };

    window.removeProofUpload = function(e) {
        e.stopPropagation();
        currentLead.proofUploaded = false;
        currentLead.ocrExtracted = false;
        currentLead.ocrLoading = false;
        renderLeadDetail();
    };

    window.simulateOCRExtraction = function() {
        currentLead.ocrLoading = true;
        renderLeadDetail();
        
        setTimeout(() => {
            currentLead.ocrLoading = false;
            currentLead.ocrExtracted = true;
            // Pre-fill fields with OCR data
            currentLead.extractedAmount = currentLead.quotePaymentSelected ? currentLead.quotePaymentSelected.premium.replace(',', '') : '12500';
            currentLead.extractedUtr = 'HDF' + Math.floor(10000000 + Math.random() * 90000000);
            
            let d = new Date();
            let month = '' + (d.getMonth() + 1), day = '' + d.getDate(), year = d.getFullYear();
            if (month.length < 2) month = '0' + month;
            if (day.length < 2) day = '0' + day;
            currentLead.extractedDate = [year, month, day].join('-');
            
            renderLeadDetail();
        }, 1500);
    };
    
    window.checkOCRFieldsAndEnableButton = function() {
        let amt = document.getElementById('ocr-amt').value;
        let utr = document.getElementById('ocr-utr').value;
        let date = document.getElementById('ocr-date').value;
        
        let btn = document.getElementById('mark-verified-btn');
        if (btn) {
            if (amt && utr && date) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            } else {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            }
        }
    };

    window.handleMarkPaymentVerified = function() {
        if (!currentLead.quotePaymentSelected) return;
        
        let amt = document.getElementById('ocr-amt') ? document.getElementById('ocr-amt').value : '';
        let utr = document.getElementById('ocr-utr') ? document.getElementById('ocr-utr').value : '';
        let date = document.getElementById('ocr-date') ? document.getElementById('ocr-date').value : '';
        
        currentLead.status = 'Payment Done';
        currentLead.subStatus = 'Verified';
        currentLead.bucket = 'Payment Done';
        currentLead.lockedPlanName = currentLead.quotePaymentSelected.insurer;
        currentLead.lockedPremium = currentLead.quotePaymentSelected.premium;
        
        currentLead.log.unshift({ dot: '#16A34A', text: `System Update · Payment verified by IBM Manager · ₹${amt} · UTR: ${utr} · ${date} · Just now`, time: 'Just now' });
        showToast('Payment verified. Lead moved to Payment Done.');
        
        if (typeof renderStageBar === 'function') renderStageBar();
        if (typeof renderRightPanel === 'function') renderRightPanel();
        renderLeadDetail();
    };
    // --- END NEW QUOTE STAGE HANDLERS ---

    function renderQuoteStage(isReadOnly = false) {
      let isIBMManager = true; // Simulating IBM Manager login
      let activeTab = window.activeNewBucketTab || currentLead.finalProduct || currentLead.initialProduct || 'lp';
      
      let sharedQuotesList = [];
      if (activeTab === 'lp') {
          sharedQuotesList = [
              { insurer: 'CARE Health', plan: 'Group Credit Protect Plus', insuredValue: '₹50,000,000', term: '5 Years', addOns: 'Loss of Employment, Vector Borne Diseases', premium: '12,500', payout: '₹1,500' },
              { insurer: 'TATA AIG', plan: 'Loan Secure', insuredValue: '₹50,000,000', term: '5 Years', addOns: 'None', premium: '14,200', payout: '₹1,800' }
          ];
      } else {
          sharedQuotesList = [
              { insurer: 'HDFC Ergo', plan: 'Comprehensive Cover', insuredValue: '₹20,000,000', term: '1 Year', addOns: 'Zero Dep', premium: '8,400', payout: '₹900' },
              { insurer: 'Bajaj Allianz', plan: 'Safe Home', insuredValue: '₹20,000,000', term: '1 Year', addOns: 'None', premium: '9,100', payout: '₹1,000' }
          ];
      }
      
      let selectedQuote = currentLead.quotePaymentSelected;
      
      let sharedQuotesHtml = `
          <div style="font-size: 13px; font-weight: 700; color: #111827;">Shared Quotes</div>
          <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 12px;">Select the plan the customer agreed to by clicking Share Payment Link</div>
      `;
      
      sharedQuotesList.forEach((q, idx) => {
          let isSelected = selectedQuote && selectedQuote.insurer === q.insurer;
          let isDisabled = selectedQuote && !isSelected;
          
          let opacity = isDisabled ? '0.4' : '1';
          let btnStyle = `width: 100%; height: 42px; border: 1.5px solid #473391; color: #473391; background: white; border-radius: 8px; font-size: 13px; font-weight: 600; margin-top: 16px; cursor: pointer; transition: all 0.2s ease;`;
          let btnDisabled = isDisabled || isReadOnly || isSelected;
          
          if (btnDisabled && !isSelected) {
              btnStyle = `width: 100%; height: 42px; border: 1.5px solid #E5E7EB; color: #9CA3AF; background: #F9FAFB; border-radius: 8px; font-size: 13px; font-weight: 600; margin-top: 16px; cursor: not-allowed;`;
          }
          
          let cardContent = `
            <div style="opacity: ${opacity}; transition: opacity 0.3s ease;">
                ${isSelected ? `<div style="background: #E6F4ED; color: #1A7A4A; font-size: 11px; font-weight: 700; padding: 6px 16px; display: flex; align-items: center; justify-content: center; gap: 6px;"><div style="font-size: 14px;">✓</div> Customer Selected</div>` : ''}
                <div style="padding: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 40px; height: 40px; border-radius: 8px; background: #F3F4F6; display: flex; align-items: center; justify-content: center; font-size: 20px;">${q.insurer.charAt(0)}</div>
                            <div>
                                <div style="font-size: 14px; font-weight: 700; color: #111827;">${q.insurer}</div>
                                <div style="font-size: 12px; color: #6B7280;">${q.plan}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                        <div>
                            <div style="font-size: 10px; color: #9CA3AF; text-transform: uppercase; font-weight: 600;">Insured Value</div>
                            <div style="font-size: 12px; font-weight: 600; color: #111827;">${q.insuredValue}</div>
                        </div>
                        <div>
                            <div style="font-size: 10px; color: #9CA3AF; text-transform: uppercase; font-weight: 600;">Policy Term</div>
                            <div style="font-size: 12px; font-weight: 600; color: #111827;">${q.term}</div>
                        </div>
                    </div>
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 10px; color: #9CA3AF; text-transform: uppercase; font-weight: 600;">Add-ons Included</div>
                        <div style="font-size: 12px; font-weight: 500; color: #111827;">${q.addOns}</div>
                    </div>
                    
                    <div style="border-top: 1px dashed #E5E7EB; padding-top: 12px; display: flex; justify-content: space-between; align-items: center;">
                        <div style="font-size: 13px; font-weight: 600; color: #111827;">Total Premium</div>
                        <div style="font-size: 18px; font-weight: 800; color: #473391;">₹${q.premium}</div>
                    </div>
                    
                    ${!isSelected ? `
                    <button style="${btnStyle}" ${btnDisabled ? 'disabled' : `onclick="window.handleSelectQuoteForPayment('${q.insurer}', '${q.plan}', '${q.premium}')"`}>
                        Share Payment Link
                    </button>
                    ` : ''}
                    
                    ${isSelected && !isReadOnly ? `
                        <div style="text-align: center; margin-top: 12px;">
                            <span style="font-size: 11px; color: #473391; cursor: pointer; text-decoration: underline;" onclick="window.handleChangeQuoteSelection()">Change Selection</span>
                        </div>
                    ` : ''}
                </div>
            </div>
          `;
          
          sharedQuotesHtml += `<div style="background: white; border: 1px solid ${isSelected ? '#1A7A4A' : '#E5E7EB'}; border-radius: 12px; overflow: hidden; margin-bottom: 16px; box-shadow: ${isSelected ? '0 4px 12px rgba(26, 122, 74, 0.1)' : '0 1px 3px rgba(0,0,0,0.05)'}; transition: all 0.3s ease;">${cardContent}</div>`;
      });
      
      let paymentCardHtml = '';
      if (selectedQuote) {
          let hasLink = currentLead.paymentLinkShared;
          
          // Part A: Share Payment Link
          let shareButtons = '';
          if (hasLink) {
              shareButtons = `<div style="font-size: 11px; color: #473391; margin-top: 8px; cursor: pointer; text-decoration: underline;" onclick="window.handleResendPaymentLink()">Resend link</div>`;
          } else {
              shareButtons = `
                <div style="display: flex; gap: 10px; margin-top: 12px;">
                  <button id="share-btn-wa" disabled style="flex: 1; height: 40px; background: #25D366; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: not-allowed; opacity: 0.4;" onclick="window.handleSendPaymentLink('WhatsApp')">Send via WhatsApp</button>
                  <button id="share-btn-em" disabled style="flex: 1; height: 40px; background: #EA4335; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: not-allowed; opacity: 0.4;" onclick="window.handleSendPaymentLink('Email')">Send via Email</button>
                </div>
              `;
          }
          
          // Part B: Payment Verification
          let verificationHtml = '';
          if (hasLink) {
              let proofContent = '';
              if (currentLead.proofUploaded) {
                  proofContent = `
                    <div style="background: #F0EEFB; border-radius: 6px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="color: #473391; font-size: 16px;">📄</div>
                            <div style="font-size: 12px; font-weight: 600; color: #111827;">${currentLead.proofFilename} <span style="font-weight: 400; color: #6B7280; margin-left: 4px;">(${currentLead.proofSize})</span></div>
                        </div>
                        ${!currentLead.ocrExtracted && !currentLead.ocrLoading ? `<div style="font-size: 14px; color: #9CA3AF; cursor: pointer;" onclick="window.removeProofUpload(event)">✕</div>` : ''}
                    </div>
                  `;
                  
                  if (currentLead.ocrExtracted) {
                      let ocrBadge = `<span style="background: #EEF0FD; color: #473391; font-size: 9px; font-weight: 700; border-radius: 3px; padding: 1px 4px; margin-left: 6px; vertical-align: middle;">OCR</span>`;
                      proofContent += `
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                            <div>
                                <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; margin-bottom: 4px; display: block;">PAYMENT AMOUNT ${ocrBadge}</label>
                                <input type="number" id="ocr-amt" value="${currentLead.extractedAmount}" oninput="window.checkOCRFieldsAndEnableButton()" style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #F9FAFB; padding: 0 10px; box-sizing: border-box;" ${isReadOnly ? 'readonly' : ''}>
                            </div>
                            <div>
                                <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; margin-bottom: 4px; display: block;">TRANSACTION ID ${ocrBadge}</label>
                                <input type="text" id="ocr-utr" value="${currentLead.extractedUtr}" oninput="window.checkOCRFieldsAndEnableButton()" style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #F9FAFB; padding: 0 10px; box-sizing: border-box;" ${isReadOnly ? 'readonly' : ''}>
                            </div>
                            <div>
                                <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; margin-bottom: 4px; display: block;">PAYMENT DATE ${ocrBadge}</label>
                                <input type="date" id="ocr-date" value="${currentLead.extractedDate}" oninput="window.checkOCRFieldsAndEnableButton()" style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #F9FAFB; padding: 0 10px; box-sizing: border-box;" ${isReadOnly ? 'readonly' : ''}>
                            </div>
                        </div>
                        
                        ${isReadOnly ? '' : `
                        <button id="mark-verified-btn" style="width: 100%; height: 44px; background: #1A7A4A; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;" onclick="window.handleMarkPaymentVerified()" ${!isIBMManager ? 'title="Only IBM Manager can mark as Verified" style="width: 100%; height: 44px; background: #1A7A4A; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; opacity: 0.5; cursor: not-allowed;" disabled' : ''}>
                          Mark as Payment Verified
                        </button>
                        `}
                      `;
                  } else {
                      let btnText = currentLead.ocrLoading ? '<span class="spinner" style="display:inline-block; margin-right:8px;">⏳</span> Extracting...' : 'Extract Details with AI';
                      proofContent += `
                        ${isReadOnly ? '' : `
                        <button style="width: 100%; height: 40px; border: 1.5px solid #473391; color: #473391; background: white; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: ${currentLead.ocrLoading ? 'not-allowed' : 'pointer'}; opacity: ${currentLead.ocrLoading ? '0.7' : '1'};" onclick="${currentLead.ocrLoading ? '' : 'window.simulateOCRExtraction()'}" ${currentLead.ocrLoading ? 'disabled' : ''}>
                          ${btnText}
                        </button>
                        `}
                      `;
                  }
              } else {
                  proofContent = `
                    <div style="border: 2px dashed #C5C0F5; border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; background: #FAFAFA; transition: background 0.2s ease;" onclick="window.simulateProofUpload()" onmouseover="this.style.background='#F0EEFB'" onmouseout="this.style.background='#FAFAFA'">
                        <div style="font-size: 24px; color: #473391; margin-bottom: 8px;">↑</div>
                        <div style="font-size: 12px; color: #6B7280; font-weight: 500; margin-bottom: 4px;">Click to upload or drag and drop</div>
                        <div style="font-size: 11px; color: #9CA3AF;">Screenshot, Image or PDF · Max 5MB</div>
                    </div>
                  `;
              }
              
              verificationHtml = `
                  <div style="margin: 20px 0; border-top: 1px solid #F3F4F6;"></div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF;">PAYMENT VERIFICATION</div>
                    <div style="font-size: 10px; color: #9CA3AF; font-style: italic;">To be confirmed by IBM Manager</div>
                  </div>
                  
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; margin-bottom: 6px; display: block;">UPLOAD PAYMENT PROOF *</label>
                  ${proofContent}
              `;
          }
          
          let paymentLinkInputHtml = ``;
          if (hasLink) {
              paymentLinkInputHtml = `
                <div style="position: relative;">
                    <input type="text" value="${currentLead.paymentLinkValue || ''}" style="width: 100%; height: 40px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #F9FAFB; color: #6B7280; padding: 0 12px; box-sizing: border-box;" readonly>
                    <span style="position: absolute; right: 12px; top: 12px; color: #10B981; font-weight: bold; font-size: 14px;">✓</span>
                </div>
              `;
          } else {
              paymentLinkInputHtml = `
                <input type="text" id="payment-link-input" placeholder="Paste payment link from insurer portal" style="width: 100%; height: 40px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; padding: 0 12px; box-sizing: border-box;" oninput="let v = this.value.trim(); let wa = document.getElementById('share-btn-wa'); let em = document.getElementById('share-btn-em'); if(v){wa.disabled=false; wa.style.opacity='1'; wa.style.cursor='pointer'; em.disabled=false; em.style.opacity='1'; em.style.cursor='pointer';}else{wa.disabled=true; wa.style.opacity='0.4'; wa.style.cursor='not-allowed'; em.disabled=true; em.style.opacity='0.4'; em.style.cursor='not-allowed';}">
              `;
          }
          
          let helperText = activeTab === 'lp' ? 'Get this link from the CARE / TATA WhatsApp group' : 'Get this link from the PolicyBazaar payment screen';
          
          paymentCardHtml = `
            <div style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; margin-bottom: 24px; animation: slideDown 0.3s ease-out;">
                <div style="padding: 14px 18px; border-bottom: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: center; background: white;">
                    <div style="font-size: 14px; font-weight: 700; color: #111827;">Payment</div>
                    <div style="background: #F0EEFB; color: #473391; font-size: 11px; font-weight: 700; border-radius: 4px; padding: 2px 8px;">${selectedQuote.insurer}</div>
                </div>
                <div style="padding: 18px;">
                    <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 6px; display: block;">PAYMENT LINK *</label>
                    ${paymentLinkInputHtml}
                    <div style="font-size: 10px; color: #9CA3AF; margin-top: 6px;">${helperText}</div>
                    ${shareButtons}
                    
                    ${verificationHtml}
                </div>
            </div>
            
            <style>
              @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
              }
              #detail-center input:focus {
                  border-color: #473391 !important;
                  outline: none;
              }
            </style>
          `;
      }

      return `
        <div>
          ${sharedQuotesHtml}
          ${paymentCardHtml}
        </div>
      `;
    }"""

start_idx = html.find("    function renderQuoteStage(isReadOnly = false) {")
end_idx = html.find("    window.advancePaymentMilestone = function() {", start_idx)

if start_idx != -1 and end_idx != -1:
    old_code = html[start_idx:end_idx]
    html = html.replace(old_code, new_code + "\n\n")
    print("Replaced renderQuoteStage successfully.")
    with open("index.html", "w") as f:
        f.write(html)
else:
    print("Could not find start_idx or end_idx!")
