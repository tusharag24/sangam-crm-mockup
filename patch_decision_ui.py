import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace actionHtml for isDecision
old_actionHtml = """          actionHtml = `
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
          `;"""

new_actionHtml = """          if (!currentLead.showCounterOfferForm) {
              actionHtml = `
                 <div style="background: #F4F2FC; border: 1px solid #E0DBF8; border-radius: 8px; padding: 16px; margin-top: 24px;">
                    <div style="font-size: 13px; font-weight: 700; color: #473391;">${mNode.label}</div>
                    <div style="font-size: 12px; color: #473391; margin-top: 4px; margin-bottom: 16px;">Record the insurer's underwriting decision.</div>
                    <div style="display: flex; gap: 12px;">
                       <button style="flex:1; height: 44px; background: #1A7A4A; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;" onclick="handlePolicyDecision('Approved', '${milestones[activeIdx+1] ? milestones[activeIdx+1].label : ''}')">Approve Policy</button>
                       <button style="flex:1; height: 44px; background: white; color: #473391; border: 1.5px solid #473391; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;" onclick="handlePolicyDecision('Counter Offer')">Counter Offer</button>
                       <button style="flex:1; height: 44px; background: white; color: #C0392B; border: 1.5px solid #C0392B; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;" onclick="handlePolicyDecision('Rejected')">Reject Policy</button>
                    </div>
                 </div>
              `;
          } else {
              actionHtml = `
                 <div style="background: #F4F2FC; border: 1px solid #E0DBF8; border-radius: 8px; padding: 16px; margin-top: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="font-size: 13px; font-weight: 700; color: #473391;">Create Counter Offer</div>
                        <div style="font-size: 12px; font-weight: 600; color: #6B7280; cursor: pointer;" onclick="currentLead.showCounterOfferForm=false; renderLeadDetail();">Cancel</div>
                    </div>
                    ${cForm}
                 </div>
              `;
          }"""

html = html.replace(old_actionHtml, new_actionHtml)

# Replace handlePolicyDecision
old_policy = """    window.handlePolicyDecision = function(decision) {
        window.paymentDoneFormData = window.paymentDoneFormData || {};
        window.paymentDoneFormData.decision = decision;
        
        if (decision === 'Approved') {
            currentLead.log.unshift({dot:'#10B981', text:`Policy decision: Approved`, time:'Just now', user: window.IBM_ROLE === 'Manager' ? 'IBM Manager' : 'IBM Agent'});
            currentLead.status = 'Underwriting'; currentLead.subStatus = 'Approved';
            renderLeadDetail();
        } else if (decision === 'Counter Offer') {
            currentLead.showCounterOfferForm = true;
            renderLeadDetail();
        } else if (decision === 'Rejected') {
            document.getElementById('lost-reason').value = 'Insurer Rejected';
            toggleModal('mark-lost-modal', true);
        }
    };"""

new_policy = """    window.handlePolicyDecision = function(decision, nextLab) {
        window.paymentDoneFormData = window.paymentDoneFormData || {};
        window.paymentDoneFormData.decision = decision;
        
        if (decision === 'Approved') {
            currentLead.log.unshift({dot:'#10B981', text:`Policy decision: Approved`, time:'Just now', user: window.IBM_ROLE === 'Manager' ? 'IBM Manager' : 'IBM Agent'});
            currentLead.status = nextLab || 'Policy Copy Upload';
            currentLead.subStatus = '';
            renderLeadDetail();
        } else if (decision === 'Counter Offer') {
            currentLead.showCounterOfferForm = true;
            renderLeadDetail();
        } else if (decision === 'Rejected') {
            document.getElementById('lostCategorySelect').value = 'Underwriting';
            document.getElementById('lostReasonSelect').value = 'Insurer Rejected';
            openLostModal();
        }
    };"""

html = html.replace(old_policy, new_policy)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
