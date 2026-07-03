import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace MILESTONE_CONFIG
old_config_pattern = re.compile(r'const MILESTONE_CONFIG = \{.*?^\};', re.MULTILINE | re.DOTALL)
new_config = """const MILESTONE_CONFIG = {
  'loan_protection_care': {
    label: 'Loan Protection · CARE Health',
    milestones: [
      { id: 'payment_verified',  label: 'Payment Verified', completable: false },
      { id: 'proposal_form',     label: 'Proposal Form',    completable: true, actionButton: 'Mark as Proposal Form Completed' },
      { id: 'policy_copy_upload',label: 'Policy Copy Upload', completable: false, isUpload: true },
    ]
  },
  'loan_protection_tata': {
    label: 'Loan Protection · TATA AIG',
    milestones: [
      { id: 'payment_verified',  label: 'Payment Verified', completable: false },
      { id: 'tele_pd',           label: 'Tele-PD',          completable: true, actionButton: 'Mark as Tele-PD Completed' },
      { id: 'policy_copy_upload',label: 'Policy Copy Upload', completable: false, isUpload: true },
    ]
  },
  'property_insurance': {
    label: 'Property Insurance',
    milestones: [
      { id: 'payment_verified',  label: 'Payment Verified', completable: false },
      { id: 'kyc',               label: 'KYC',              completable: true, actionButton: 'Mark as KYC Completed' },
      { id: 'policy_copy_upload',label: 'Policy Copy Upload', completable: false, isUpload: true },
    ]
  },
  'credit_life': {
    label: 'Credit Life',
    milestones: [
      { id: 'payment_verified',  label: 'Payment Verified',  completable: false },
      { id: 'documents',         label: 'Documents',         completable: true, actionButton: 'Mark as Documents Received' },
      { id: 'medical',           label: 'Medical',           completable: true, actionButton: 'Mark as Medical Completed' },
      { id: 'policy_decision',   label: 'Policy Decision',   completable: false, isDecision: true },
      { id: 'policy_copy_upload',label: 'Policy Copy Upload', completable: false, isUpload: true },
    ]
  },
  'term_plan': {
    label: 'Term Plan',
    milestones: [
      { id: 'payment_verified',  label: 'Payment Verified',  completable: false },
      { id: 'documents',         label: 'Documents',         completable: true, actionButton: 'Mark as Documents Received' },
      { id: 'medical',           label: 'Medical',           completable: true, actionButton: 'Mark as Medical Completed' },
      { id: 'policy_decision',   label: 'Policy Decision',   completable: false, isDecision: true },
      { id: 'policy_copy_upload',label: 'Policy Copy Upload', completable: false, isUpload: true },
    ]
  }
};"""

html = old_config_pattern.sub(new_config, html)

# Replace actionHtml for completable nodes
old_actionHtml = """      } else if (mNode.completable) {
          let nextLab = milestones[activeIdx+1] ? milestones[activeIdx+1].label : '';
          let helper = mNode.id === 'proposal_form_pending' ? 'CARE Health requires the customer to fill a proposal/declaration form. Share the form link with the customer.' : 'This milestone is currently pending. Update it once completed.';
          
          actionHtml = `
             <div style="background: #F4F2FC; border: 1px solid #E0DBF8; border-radius: 8px; padding: 16px; margin-top: 24px;">
                <div style="font-size: 13px; font-weight: 700; color: #473391;">${mNode.label}</div>
                <div style="font-size: 12px; color: #473391; margin-top: 4px; margin-bottom: 16px;">${helper}</div>
                <button style="width: 100%; height: 44px; background: #473391; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;" onclick="advanceMilestone('${mNode.label}', '${nextLab}')">${mNode.nextLabel || 'Mark as Completed'}</button>
             </div>
          `;
      }"""

new_actionHtml = """      } else if (mNode.completable) {
          let nextLab = milestones[activeIdx+1] ? milestones[activeIdx+1].label : '';
          let helper = mNode.id === 'proposal_form' ? 'CARE Health requires the customer to fill a proposal/declaration form. Share the form link with the customer.' : 'This milestone is currently pending. Update it once completed.';
          
          actionHtml = `
             <div style="background: #F4F2FC; border: 1px solid #E0DBF8; border-radius: 8px; padding: 16px; margin-top: 24px;">
                <div style="font-size: 13px; font-weight: 700; color: #473391;">${mNode.label}</div>
                <div style="font-size: 12px; color: #473391; margin-top: 4px; margin-bottom: 16px;">${helper}</div>
                <button style="width: 100%; height: 44px; background: #473391; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;" onclick="advanceMilestone('${mNode.label}', '${nextLab}')">${mNode.actionButton || 'Mark as Completed'}</button>
             </div>
          `;
      }"""

html = html.replace(old_actionHtml, new_actionHtml)

# Replace window.advanceMilestone
old_advance = """    window.advanceMilestone = function(milestoneName) {
        currentLead.log.unshift({dot:'#10B981', text:`${milestoneName} marked as complete`, time:'Just now', user: window.IBM_ROLE === 'Manager' ? 'IBM Manager' : 'IBM Agent'});
        
        // Update Status/SubStatus based on milestone
        let prod = currentLead.finalProduct || currentLead.initialProduct || 'lp';
        let insurer = currentLead.lockedPlanName || currentLead.selectedPlan?.insurer || '';
        let isTata = insurer === 'TATA AIG';
        
        if (milestoneName === 'KYC Completed') {
            currentLead.status = 'KYC'; currentLead.subStatus = 'Completed';
        } else if (milestoneName === 'Proposal Form Completed') {
            currentLead.status = 'Proposal Form'; currentLead.subStatus = 'Completed';
        } else if (milestoneName === 'Tele-PD Completed') {
            currentLead.status = 'Tele-PD'; currentStatus = 'Completed';
        } else if (milestoneName === 'Documents Received') {
            currentLead.status = 'Documents'; currentLead.subStatus = 'Received';
        } else if (milestoneName === 'Medical Completed') {
            currentLead.status = 'Medical'; currentLead.subStatus = 'Completed';
        }
        
        // Let renderLeadDetail handle activeIdx recalculation
        renderLeadDetail();
    };"""

new_advance = """    window.advanceMilestone = function(currentLabel, nextLabel) {
        currentLead.log.unshift({dot:'#10B981', text:`${currentLabel} marked as complete`, time:'Just now', user: window.IBM_ROLE === 'Manager' ? 'IBM Manager' : 'IBM Agent'});
        currentLead.status = nextLabel;
        currentLead.subStatus = '';
        renderLeadDetail();
    };"""

html = html.replace(old_advance, new_advance)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
