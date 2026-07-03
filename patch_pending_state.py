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
      { id: 'proposal_form',     label: 'Proposal Form',    completable: true, pendingButton: 'Mark as Proposal Form Pending', actionButton: 'Mark as Proposal Form Completed' },
      { id: 'policy_copy_upload',label: 'Policy Copy Upload', completable: false, isUpload: true },
    ]
  },
  'loan_protection_tata': {
    label: 'Loan Protection · TATA AIG',
    milestones: [
      { id: 'payment_verified',  label: 'Payment Verified', completable: false },
      { id: 'tele_pd',           label: 'Tele-PD',          completable: true, pendingButton: 'Mark as Tele-PD Pending', actionButton: 'Mark as Tele-PD Completed' },
      { id: 'policy_copy_upload',label: 'Policy Copy Upload', completable: false, isUpload: true },
    ]
  },
  'property_insurance': {
    label: 'Property Insurance',
    milestones: [
      { id: 'payment_verified',  label: 'Payment Verified', completable: false },
      { id: 'kyc',               label: 'KYC',              completable: true, pendingButton: 'Mark as KYC Pending', actionButton: 'Mark as KYC Completed' },
      { id: 'policy_copy_upload',label: 'Policy Copy Upload', completable: false, isUpload: true },
    ]
  },
  'credit_life': {
    label: 'Credit Life',
    milestones: [
      { id: 'payment_verified',  label: 'Payment Verified',  completable: false },
      { id: 'documents',         label: 'Documents',         completable: true, pendingButton: 'Mark as Documents Pending', actionButton: 'Mark as Documents Received' },
      { id: 'medical',           label: 'Medical',           completable: true, pendingSubStatus: 'Scheduled', pendingButton: 'Mark as Medical Scheduled', actionButton: 'Mark as Medical Completed' },
      { id: 'policy_decision',   label: 'Policy Decision',   completable: false, isDecision: true },
      { id: 'policy_copy_upload',label: 'Policy Copy Upload', completable: false, isUpload: true },
    ]
  },
  'term_plan': {
    label: 'Term Plan',
    milestones: [
      { id: 'payment_verified',  label: 'Payment Verified',  completable: false },
      { id: 'documents',         label: 'Documents',         completable: true, pendingButton: 'Mark as Documents Pending', actionButton: 'Mark as Documents Received' },
      { id: 'medical',           label: 'Medical',           completable: true, pendingSubStatus: 'Scheduled', pendingButton: 'Mark as Medical Scheduled', actionButton: 'Mark as Medical Completed' },
      { id: 'policy_decision',   label: 'Policy Decision',   completable: false, isDecision: true },
      { id: 'policy_copy_upload',label: 'Policy Copy Upload', completable: false, isUpload: true },
    ]
  }
};"""

html = old_config_pattern.sub(new_config, html)

# Replace completable node rendering
old_actionHtml = """      } else if (mNode.completable) {
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

new_actionHtml = """      } else if (mNode.completable) {
          let nextLab = milestones[activeIdx+1] ? milestones[activeIdx+1].label : '';
          let isPending = (subStatus === 'Pending' || subStatus === 'Scheduled');
          let pendingSub = mNode.pendingSubStatus || 'Pending';
          let pendingBtnText = mNode.pendingButton || `Mark as ${mNode.label} Pending`;
          let completeBtnText = mNode.actionButton || `Mark as ${mNode.label} Completed`;
          
          if (!isPending) {
              actionHtml = `
                 <div style="background: #F4F2FC; border: 1px solid #E0DBF8; border-radius: 8px; padding: 16px; margin-top: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                       <div style="font-size: 13px; font-weight: 700; color: #473391;">${mNode.label}</div>
                    </div>
                    <div style="font-size: 12px; color: #473391; margin-bottom: 16px;">Initiate this step by marking it as pending.</div>
                    <button style="width: 100%; height: 44px; background: white; border: 1.5px solid #473391; color: #473391; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;" onclick="markMilestonePending('${mNode.label}', '${pendingSub}')">${pendingBtnText}</button>
                 </div>
              `;
          } else {
              let helper = mNode.id === 'proposal_form' ? 'CARE Health requires the customer to fill a proposal/declaration form. Share the form link with the customer.' : 'This milestone is currently pending. Update it once completed.';
              actionHtml = `
                 <div style="background: #F4F2FC; border: 1px solid #E0DBF8; border-radius: 8px; padding: 16px; margin-top: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                       <div style="font-size: 13px; font-weight: 700; color: #473391;">${mNode.label}</div>
                       <div style="font-size: 10px; font-weight: 700; background: #FFF8E1; color: #856404; padding: 2px 8px; border-radius: 10px; text-transform: uppercase;">${subStatus}</div>
                    </div>
                    <div style="font-size: 12px; color: #473391; margin-bottom: 16px;">${helper}</div>
                    <button style="width: 100%; height: 44px; background: #473391; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;" onclick="advanceMilestone('${mNode.label}', '${nextLab}')">${completeBtnText}</button>
                 </div>
              `;
          }
      }"""

html = html.replace(old_actionHtml, new_actionHtml)

# Add markMilestonePending
pending_fn = """    window.markMilestonePending = function(label, pendingSubStatus) {
        currentLead.status = label;
        currentLead.subStatus = pendingSubStatus || 'Pending';
        currentLead.log.unshift({dot:'var(--warning)', text:`${label} marked as ${currentLead.subStatus}`, time:'Just now', user: window.IBM_ROLE === 'Manager' ? 'IBM Manager' : 'IBM Agent'});
        renderLeadDetail();
    };

    window.advanceMilestone = function(currentLabel, nextLabel) {"""

html = html.replace("    window.advanceMilestone = function(currentLabel, nextLabel) {", pending_fn)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
