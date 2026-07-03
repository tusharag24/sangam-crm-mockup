import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

new_render_tracker = """    function renderMilestoneTracker(milestoneKey, payDate) {
      let config = MILESTONE_CONFIG[milestoneKey];
      if (!config) return '';
      let milestones = config.milestones;
      
      let status = currentLead.status;
      let subStatus = currentLead.subStatus || '';
      
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
      
      let mNode = milestones[activeIdx];
      let actionHtml = '';
      
      if (mNode.isUpload) {
          let hasFile = currentLead.policyUploaded;
          let uploadContent = '';
          if (!hasFile) {
              uploadContent = `
                  <div style="border: 1px dashed #C5C0F5; border-radius: 8px; padding: 24px; text-align: center; background: white; cursor: pointer;" onclick="simulatePolicyUpload()">
                     <div style="font-size: 24px; color: #473391; margin-bottom: 8px;">📄</div>
                     <div style="font-size: 12px; font-weight: 600; color: #473391; text-decoration: underline;">Click to browse</div>
                     <div style="font-size: 11px; color: #6B5CC4; margin-top: 4px;">PDF or Image (max 5MB)</div>
                  </div>
              `;
          } else {
              uploadContent = `
                  <div style="background: white; border: 1px solid #C5C0F5; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
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
             <div style="background: #F4F2FC; border: 1px solid #E0DBF8; border-radius: 8px; padding: 16px; margin-top: 24px;">
                <div style="font-size: 13px; font-weight: 700; color: #473391;">Upload Policy Copy</div>
                <div style="font-size: 12px; color: #473391; margin-top: 4px; margin-bottom: 16px;">Download the policy copy from the insurer portal and upload it here to complete this stage.</div>
                ${uploadContent}
                <button style="width: 100%; height: 44px; background: #1A7A4A; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; margin-top: 16px; cursor: ${hasFile ? 'pointer' : 'not-allowed'}; opacity: ${hasFile ? '1' : '0.5'};" ${!hasFile ? 'disabled' : ''} onclick="moveToPolicyIssued()">Confirm & Move to Policy Issued</button>
             </div>
          `;
      } else if (mNode.isDecision) {
          let sel = window.paymentDoneFormData?.decision || '';
          let cForm = '';
          if (sel === 'Counter Offer') {
              cForm = `
                 <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #E0DBF8;">
                    <div style="font-size: 12px; font-weight: 600; color: #473391; margin-bottom: 12px;">Counter Offer Details</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                       <div>
                          <label class="new-form-label" style="color: #6B5CC4;">NEW PREMIUM *</label>
                          <input type="number" class="new-form-input" style="border-color: #C5C0F5;" id="co-prem" placeholder="₹">
                       </div>
                       <div>
                          <label class="new-form-label" style="color: #6B5CC4;">REVISED SUM ASSURED</label>
                          <input type="number" class="new-form-input" style="border-color: #C5C0F5;" id="co-sa" placeholder="₹ (Optional)">
                       </div>
                    </div>
                    <div style="margin-top: 12px;">
                       <label class="new-form-label" style="color: #6B5CC4;">REASON / MEDICAL FINDINGS *</label>
                       <textarea class="new-form-input" id="co-reason" style="height: 60px; resize: none; border-color: #C5C0F5;" placeholder="E.g. Premium loaded due to diabetes"></textarea>
                    </div>
                    <button style="width: 100%; height: 40px; background: #473391; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; margin-top: 16px; cursor: pointer;" onclick="saveCounterOffer()">Save Counter Offer & Notify Customer</button>
                 </div>
              `;
          }
          actionHtml = `
             <div style="background: #F4F2FC; border: 1px solid #E0DBF8; border-radius: 8px; padding: 16px; margin-top: 24px;">
                <div style="font-size: 13px; font-weight: 700; color: #473391;">${mNode.label}</div>
                <div style="font-size: 12px; color: #473391; margin-top: 4px; margin-bottom: 16px;">Record the insurer's underwriting decision.</div>
                
                <div style="display: flex; gap: 8px;">
                   <div style="flex:1; background: ${sel==='Approved'?'#1A7A4A':'white'}; color: ${sel==='Approved'?'white':'#6B7280'}; border: 1px solid ${sel==='Approved'?'#1A7A4A':'#C5C0F5'}; border-radius: 8px; padding: 10px; text-align: center; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="handlePolicyDecision('Approved')">Approved</div>
                   <div style="flex:1; background: ${sel==='Counter Offer'?'#473391':'white'}; color: ${sel==='Counter Offer'?'white':'#6B7280'}; border: 1px solid ${sel==='Counter Offer'?'#473391':'#C5C0F5'}; border-radius: 8px; padding: 10px; text-align: center; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="handlePolicyDecision('Counter Offer')">Counter Offer</div>
                   <div style="flex:1; background: ${sel==='Rejected'?'#C0392B':'white'}; color: ${sel==='Rejected'?'white':'#6B7280'}; border: 1px solid ${sel==='Rejected'?'#C0392B':'#C5C0F5'}; border-radius: 8px; padding: 10px; text-align: center; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="handlePolicyDecision('Rejected')">Rejected</div>
                </div>
                ${cForm}
                ${sel==='Approved' ? `<button style="width: 100%; height: 44px; background: #1A7A4A; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; margin-top: 16px; cursor: pointer;" onclick="advanceMilestone('${mNode.label}', '${milestones[activeIdx+1].label}')">Confirm Approval</button>` : ''}
                ${sel==='Rejected' ? `<button style="width: 100%; height: 44px; background: #C0392B; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; margin-top: 16px; cursor: pointer;" onclick="window.currentLead.bucket='Lost'; window.currentLead.status='Declined'; window.currentLead.subStatus='Medical Grounds'; renderLeadDetail();">Mark as Lost</button>` : ''}
             </div>
          `;
          
          if (currentLead.counterOfferStatus) {
              actionHtml = `
                 <div style="background: #F4F2FC; border: 1px solid #E0DBF8; border-radius: 8px; padding: 16px; margin-top: 24px;">
                    <div style="font-size: 13px; font-weight: 700; color: #473391;">Counter Offer Pending</div>
                    <div style="font-size: 12px; color: #473391; margin-top: 4px; margin-bottom: 16px;">Customer has been notified of the revised terms. Waiting for their acceptance and balance payment.</div>
                    
                    <div style="background: white; border: 1px solid #C5C0F5; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                       <div style="font-size: 11px; color: #6B5CC4;">Revised Premium</div>
                       <div style="font-size: 14px; font-weight: 700; color: #473391; margin-bottom: 8px;">₹${currentLead.coPrem || ''} <span style="font-size:11px; font-weight:500; color:#C0392B;">(+₹4,500)</span></div>
                       <div style="font-size: 11px; color: #6B5CC4;">Reason</div>
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
          let helper = mNode.id === 'proposal_form_pending' ? 'CARE Health requires the customer to fill a proposal/declaration form. Share the form link with the customer.' : 'This milestone is currently pending. Update it once completed.';
          
          actionHtml = `
             <div style="background: #F4F2FC; border: 1px solid #E0DBF8; border-radius: 8px; padding: 16px; margin-top: 24px;">
                <div style="font-size: 13px; font-weight: 700; color: #473391;">${mNode.label}</div>
                <div style="font-size: 12px; color: #473391; margin-top: 4px; margin-bottom: 16px;">${helper}</div>
                <button style="width: 100%; height: 44px; background: #473391; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;" onclick="advanceMilestone('${mNode.label}', '${nextLab}')">${mNode.nextLabel || 'Mark as Completed'}</button>
             </div>
          `;
      }
      
      let outerHtml = `
         <div style="background: white; border: 1px solid #E5E7EB; border-radius: 10px; padding: 20px; margin-top: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
               <div>
                  <div style="font-size: 14px; font-weight: 700; color: #111827;">Processing Milestones</div>
                  <div style="font-size: 11px; color: #9CA3AF; margin-top: 4px;">${config.label}</div>
               </div>
               <div style="background: #FFF8E1; color: #856404; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 12px;">Payment Done</div>
            </div>
            ${trackHtml}
            ${actionHtml}
         </div>
      `;
      return outerHtml;
    }"""

start_idx = html.find("    function renderMilestoneTracker(milestoneKey, payDate) {")
if start_idx != -1:
    end_idx = html.find("    // Init")
    if end_idx != -1:
        # We need to find the end of the function carefully, but since it's just before // Init 
        # or followed by another function, we can use regex or string split.
        pass

# Let's use regex to replace renderMilestoneTracker entirely
pattern = re.compile(r'    function renderMilestoneTracker\(milestoneKey, payDate\).*?return trackHtml \+ actionHtml;\n    \}', re.DOTALL)
html = pattern.sub(new_render_tracker, html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
