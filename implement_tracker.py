import re

with open('/Users/tusharagarwal/.gemini/antigravity/scratch/sangam-crm/index.html', 'r', encoding='utf8') as f:
    html = f.read()

new_render_payment_done = """    function renderPaymentDoneStage() {
      let product = currentLead.finalProduct || currentLead.initialProduct || 'lp';
      let insurer = currentLead.lockedPlanName || currentLead.selectedPlan?.insurer || 'CARE Health Insurance';
      let premium = currentLead.lockedPremium || '12,500';
      let isLP = product === 'lp';
      
      let mKey = getMilestoneKey(product, insurer);
      let config = MILESTONE_CONFIG[mKey];
      let milestones = config.milestones;
      
      // SECTION 1: Summary
      let summaryHtml = '';
      let isExpanded = currentLead.paymentSummaryExpanded || false;
      
      let quotesHtml = '';
      if (isLP) {
          quotesHtml = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
               <div style="display: flex; align-items: center; gap: 8px;">
                  <img src="https://ui-avatars.com/api/?name=C&background=F3F4F6&color=473391" style="width: 24px; height: 24px; border-radius: 4px; object-fit: contain;">
                  <div style="font-size: 13px; font-weight: 500; color: #6B7280;">CARE Health Insurance</div>
               </div>
               <div style="font-size: 13px; font-weight: 600; color: #6B7280;">₹12,500</div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
               <div style="display: flex; align-items: center; gap: 8px;">
                  <img src="https://ui-avatars.com/api/?name=T&background=F3F4F6&color=473391" style="width: 24px; height: 24px; border-radius: 4px; object-fit: contain;">
                  <div style="font-size: 13px; font-weight: 500; color: #6B7280;">TATA AIG</div>
               </div>
               <div style="font-size: 13px; font-weight: 600; color: #6B7280;">₹13,200</div>
            </div>
          `;
      } else {
          quotesHtml = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
               <div style="display: flex; align-items: center; gap: 8px;">
                  <img src="https://ui-avatars.com/api/?name=H&background=F3F4F6&color=473391" style="width: 24px; height: 24px; border-radius: 4px; object-fit: contain;">
                  <div style="font-size: 13px; font-weight: 500; color: #6B7280;">HDFC Life</div>
               </div>
               <div style="font-size: 13px; font-weight: 600; color: #6B7280;">₹1,200/mo</div>
            </div>
          `;
      }
      
      let linkText = currentLead.paymentLinkValue || 'https://insurer.com/pay/xyz';
      if(linkText.length > 40) linkText = linkText.substring(0,40) + '...';
      let payAmt = currentLead.paymentAmount || premium.replace('₹','').replace(',','');
      let payUtr = currentLead.paymentUtr || 'TXN123456';
      let payDate = currentLead.paymentDate || '2026-07-02';
      
      let expandedContent = `
         <div style="padding: 16px;">
            <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; margin-bottom: 8px;">QUOTES GENERATED</div>
            ${quotesHtml}
         </div>
         <div style="border-top: 1px solid #F3F4F6;"></div>
         <div style="padding: 16px;">
            <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; margin-bottom: 8px;">QUOTE SHARED WITH CUSTOMER</div>
            <div style="font-size: 12px; color: #4B5563;">${insurer} · ₹${premium} · via WhatsApp · ${payDate}</div>
         </div>
         <div style="border-top: 1px solid #F3F4F6;"></div>
         <div style="padding: 16px;">
            <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; margin-bottom: 8px;">PAYMENT</div>
            <div style="font-size: 12px; color: #4B5563;">${linkText} · Shared on ${payDate}</div>
            <div style="font-size: 12px; color: #4B5563; margin-top: 4px; font-weight: 600; color: #1A7A4A;">Verified ✓ · ₹${payAmt} · UTR: ${payUtr} · ${payDate}</div>
         </div>
      `;
      
      summaryHtml = `
        <div style="background: white; border: 1px solid #E5E7EB; border-radius: 10px; overflow: hidden;">
           <div style="background: #F9FAFB; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="togglePaymentDoneSummary()">
              <div style="font-size: 12px; font-weight: 700; color: #111827;">Journey Summary</div>
              <div style="color: #9CA3AF; font-size: 14px; transform: rotate(${isExpanded ? '180deg' : '0deg'}); transition: transform 0.2s;">▾</div>
           </div>
           ${isExpanded ? expandedContent : ''}
        </div>
      `;
      
      return summaryHtml + renderMilestoneTracker(mKey, payDate);
    }

    function renderMilestoneTracker(milestoneKey, payDate) {
      let config = MILESTONE_CONFIG[milestoneKey];
      if (!config) return '';
      let milestones = config.milestones;
      
      let status = currentLead.status;
      let subStatus = currentLead.subStatus || '';
      
      // Calculate activeIdx dynamically based on status and subStatus matching milestone labels
      let activeIdx = 0;
      let currentLabel = status + (subStatus ? ' ' + subStatus : '');
      if (currentLabel === 'Policy Copy') currentLabel = 'Policy Copy Upload';
      if (currentLabel === 'Underwriting') currentLabel = 'Policy Decision';
      
      for (let i = 0; i < milestones.length; i++) {
         if (milestones[i].label === currentLabel) {
             activeIdx = i;
             break;
         }
      }
      if (activeIdx === 0 && milestones.length > 1) activeIdx = 1; // Verified is always done
      
      let trackHtml = '<div style="display: flex; align-items: flex-start; justify-content: space-between; position: relative; margin: 20px 0 10px 0;">';
      
      // Lines
      trackHtml += '<div style="position: absolute; top: 15px; left: 16px; right: 16px; height: 2px; background: #E5E7EB; z-index: 1;"></div>';
      
      milestones.forEach((m, i) => {
         let isDone = i < activeIdx;
         let isActive = i === activeIdx;
         
         let bg = isDone ? '#1A7A4A' : (isActive ? '#473391' : '#F3F4F6');
         let color = isDone || isActive ? 'white' : '#9CA3AF';
         let inner = isDone ? '✓' : (i+1);
         let labelColor = isDone ? '#1A7A4A' : (isActive ? '#473391' : '#9CA3AF');
         let labelWeight = isActive ? '700' : (isDone ? '600' : '500');
         let dateText = isDone ? '<div style="font-size:10px; color:#1A7A4A; margin-top:2px;">' + (payDate || '2026-07-02') + '</div>' : '';
         
         if (i > 0) {
            let leftPerc = ((i-1)/(milestones.length-1))*100;
            let wPerc = (1/(milestones.length-1))*100;
            let lineBg = isDone || isActive ? '#1A7A4A' : 'transparent';
            trackHtml += `<div style="position: absolute; top: 15px; left: ${leftPerc}%; width: ${wPerc}%; height: 2px; background: ${lineBg}; z-index: 2;"></div>`;
         }
         
         trackHtml += `
            <div style="display: flex; flex-direction: column; align-items: center; z-index: 3; width: ${100/milestones.length}%;">
               <div style="width: 32px; height: 32px; border-radius: 50%; background: ${bg}; color: ${color}; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; ${isActive ? 'box-shadow: 0 0 0 4px #F0EEFB;' : ''}">${inner}</div>
               <div style="font-size: 11px; font-weight: ${labelWeight}; color: ${labelColor}; margin-top: 8px; text-align: center; line-height: 1.2;">${m.label}</div>
               ${dateText}
            </div>
         `;
      });
      trackHtml += '</div>';
      
      // Instruction Card
      let mNode = milestones[activeIdx];
      let actionHtml = '';
      
      if (mNode.isUpload) {
          let hasFile = currentLead.policyUploaded;
          let uploadContent = '';
          if (!hasFile) {
              uploadContent = `
                  <div style="border: 1px dashed #D1D5DB; border-radius: 8px; padding: 24px; text-align: center; background: #F9FAFB; cursor: pointer;" onclick="simulatePolicyUpload()">
                     <div style="font-size: 24px; color: #9CA3AF; margin-bottom: 8px;">📄</div>
                     <div style="font-size: 12px; font-weight: 600; color: #473391; text-decoration: underline;">Click to browse</div>
                     <div style="font-size: 11px; color: #9CA3AF; margin-top: 4px;">PDF or Image (max 5MB)</div>
                  </div>
              `;
          } else {
              uploadContent = `
                  <div style="background: #F0EEFB; border: 1px solid #C5C0F5; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                         <div style="font-size: 20px;">📄</div>
                         <div>
                            <div style="font-size: 12px; font-weight: 600; color: #111827;">policy_document.pdf</div>
                            <div style="font-size: 11px; color: #6B7280;">1.2 MB · Uploaded just now</div>
                         </div>
                      </div>
                      <span style="font-size: 14px; color: #9CA3AF; cursor: pointer;" onclick="removePolicyUpload()">✕</span>
                  </div>
              `;
          }
          actionHtml = `
             <div style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin-top: 16px;">
                <div style="font-size: 14px; font-weight: 700; color: #111827;">Upload Policy Copy</div>
                <div style="font-size: 12px; color: #9CA3AF; margin-top: 4px; margin-bottom: 16px;">Download the policy copy from the insurer portal and upload it here to complete this stage.</div>
                ${uploadContent}
                <button style="width: 100%; height: 44px; background: #1A7A4A; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; margin-top: 16px; cursor: ${hasFile ? 'pointer' : 'not-allowed'}; opacity: ${hasFile ? '1' : '0.5'};" ${!hasFile ? 'disabled' : ''} onclick="moveToPolicyIssued()">Confirm & Move to Policy Issued</button>
             </div>
          `;
      } else if (mNode.isDecision) {
          let sel = window.paymentDoneFormData?.decision || '';
          let cForm = '';
          if (sel === 'Counter Offer') {
              cForm = `
                 <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #F3F4F6;">
                    <div style="font-size: 12px; font-weight: 600; color: #111827; margin-bottom: 12px;">Counter Offer Details</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                       <div>
                          <label class="new-form-label">NEW PREMIUM *</label>
                          <input type="number" class="new-form-input" id="co-prem" placeholder="₹">
                       </div>
                       <div>
                          <label class="new-form-label">REVISED SUM ASSURED</label>
                          <input type="number" class="new-form-input" id="co-sa" placeholder="₹ (Optional)">
                       </div>
                    </div>
                    <div style="margin-top: 12px;">
                       <label class="new-form-label">REASON / MEDICAL FINDINGS *</label>
                       <textarea class="new-form-input" id="co-reason" style="height: 60px; resize: none;" placeholder="E.g. Premium loaded due to diabetes"></textarea>
                    </div>
                    <button style="width: 100%; height: 40px; background: #473391; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; margin-top: 16px; cursor: pointer;" onclick="saveCounterOffer()">Save Counter Offer & Notify Customer</button>
                 </div>
              `;
          }
          actionHtml = `
             <div style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin-top: 16px;">
                <div style="font-size: 14px; font-weight: 700; color: #111827;">${mNode.label}</div>
                <div style="font-size: 12px; color: #9CA3AF; margin-top: 4px; margin-bottom: 16px;">Record the insurer's underwriting decision.</div>
                
                <div style="display: flex; gap: 8px;">
                   <div style="flex:1; background: ${sel==='Approved'?'#E6F4ED':'white'}; color: ${sel==='Approved'?'#1A7A4A':'#6B7280'}; border: ${sel==='Approved'?'1.5px solid #1A7A4A':'1px solid #E5E7EB'}; border-radius: 8px; padding: 10px; text-align: center; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="handlePolicyDecision('Approved')">Approved</div>
                   <div style="flex:1; background: ${sel==='Counter Offer'?'#F0EEFB':'white'}; color: ${sel==='Counter Offer'?'#473391':'#6B7280'}; border: ${sel==='Counter Offer'?'1.5px solid #473391':'1px solid #E5E7EB'}; border-radius: 8px; padding: 10px; text-align: center; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="handlePolicyDecision('Counter Offer')">Counter Offer</div>
                   <div style="flex:1; background: ${sel==='Rejected'?'#FDECEA':'white'}; color: ${sel==='Rejected'?'#C0392B':'#6B7280'}; border: ${sel==='Rejected'?'1.5px solid #C0392B':'1px solid #E5E7EB'}; border-radius: 8px; padding: 10px; text-align: center; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="handlePolicyDecision('Rejected')">Rejected</div>
                </div>
                ${cForm}
                ${sel==='Approved' ? `<button style="width: 100%; height: 44px; background: #1A7A4A; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; margin-top: 16px; cursor: pointer;" onclick="advanceMilestone('${mNode.label}', '${milestones[activeIdx+1].label}')">Confirm Approval</button>` : ''}
                ${sel==='Rejected' ? `<button style="width: 100%; height: 44px; background: #C0392B; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; margin-top: 16px; cursor: pointer;" onclick="window.currentLead.bucket='Lost'; window.currentLead.status='Declined'; window.currentLead.subStatus='Medical Grounds'; renderLeadDetail();">Mark as Lost</button>` : ''}
             </div>
          `;
          
          if (currentLead.counterOfferStatus) {
              actionHtml = `
                 <div style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin-top: 16px;">
                    <div style="font-size: 14px; font-weight: 700; color: #111827;">Counter Offer Pending</div>
                    <div style="font-size: 12px; color: #9CA3AF; margin-top: 4px; margin-bottom: 16px;">Customer has been notified of the revised terms. Waiting for their acceptance and balance payment.</div>
                    
                    <div style="background: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                       <div style="font-size: 11px; color: #6B7280;">Revised Premium</div>
                       <div style="font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 8px;">₹${currentLead.coPrem || ''} <span style="font-size:11px; font-weight:500; color:#C0392B;">(+₹4,500)</span></div>
                       <div style="font-size: 11px; color: #6B7280;">Reason</div>
                       <div style="font-size: 12px; color: #111827;">${currentLead.coReason || ''}</div>
                    </div>
                    
                    <div style="display: flex; gap: 8px;">
                       <button style="flex: 1; height: 40px; background: white; border: 1.5px solid #1A7A4A; color: #1A7A4A; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;" onclick="handleCustomerDecision('Accepted')">Customer Accepted</button>
                       <button style="flex: 1; height: 40px; background: white; border: 1.5px solid #C0392B; color: #C0392B; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;" onclick="handleCustomerDecision('Rejected')">Customer Rejected</button>
                    </div>
                 </div>
              `;
          }
      } else if (mNode.completable) {
          let nextLab = milestones[activeIdx+1] ? milestones[activeIdx+1].label : '';
          actionHtml = `
             <div style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin-top: 16px; text-align: center;">
                <div style="font-size: 14px; font-weight: 700; color: #111827;">${mNode.label}</div>
                <div style="font-size: 12px; color: #9CA3AF; margin-top: 4px; margin-bottom: 16px;">This milestone is currently pending. Update it once completed.</div>
                <button style="width: 100%; height: 44px; background: #473391; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;" onclick="advanceMilestone('${mNode.label}', '${nextLab}')">${mNode.nextLabel || 'Mark as Completed'}</button>
             </div>
          `;
      }
      
      return trackHtml + actionHtml;
    }
"""

# Extract the old renderPaymentDoneStage
start_idx = html.find("    function renderPaymentDoneStage() {")
if start_idx != -1:
    end_idx = html.find("    function renderPolicyStage() {")
    if end_idx != -1:
        old_render = html[start_idx:end_idx]
        html = html.replace(old_render, new_render_payment_done + '\n\n')

with open('/Users/tusharagarwal/.gemini/antigravity/scratch/sangam-crm/index.html', 'w', encoding='utf8') as f:
    f.write(html)
