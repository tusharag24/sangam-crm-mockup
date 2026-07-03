html = open("index.html").read()

config_str = """
    const FREELOOK_DAYS = {
      'loan_protection_care': 15,
      'loan_protection_tata': 15,
      'property_insurance':   15,
      'credit_life':          30,
      'term_plan':            30,
    };

    const MILESTONE_CONFIG = {
      'loan_protection_care': {
        label: 'Loan Protection · CARE Health',
        milestones: [
          { id: 'payment_verified', label: 'Payment Verified', completable: false },
          { id: 'proposal_form', label: 'Proposal Form', completable: true, actionButton: 'Mark as Proposal Form Completed' },
        ]
      },
      'loan_protection_tata': {
        label: 'Loan Protection · TATA AIG',
        milestones: [
          { id: 'payment_verified', label: 'Payment Verified', completable: false },
          { id: 'tele_pd', label: 'Tele-PD', completable: true, actionButton: 'Mark as Tele-PD Completed' },
        ]
      },
      'property_insurance': {
        label: 'Property Insurance',
        milestones: [
          { id: 'payment_verified', label: 'Payment Verified', completable: false },
          { id: 'kyc', label: 'KYC', completable: true, actionButton: 'Mark as KYC Completed' },
        ]
      },
      'credit_life': {
        label: 'Credit Life',
        milestones: [
          { id: 'payment_verified', label: 'Payment Verified', completable: false },
          { id: 'documents', label: 'Documents', completable: true, actionButton: 'Mark as Documents Received' },
          { id: 'medical', label: 'Medical', completable: true, actionButton: 'Mark as Medical Completed' },
          { id: 'policy_decision', label: 'Policy Decision', completable: false, isDecision: true },
        ]
      },
      'term_plan': {
        label: 'Term Plan',
        milestones: [
          { id: 'payment_verified', label: 'Payment Verified', completable: false },
          { id: 'documents', label: 'Documents', completable: true, actionButton: 'Mark as Documents Received' },
          { id: 'medical', label: 'Medical', completable: true, actionButton: 'Mark as Medical Completed' },
          { id: 'policy_decision', label: 'Policy Decision', completable: false, isDecision: true },
        ]
      }
    };
    
    window.getMilestoneKey = function(product, insurer) {
      if (product === 'Loan Protection') {
        return insurer?.toLowerCase().includes('care') ? 'loan_protection_care' : 'loan_protection_tata';
      }
      if (product === 'Property Insurance') return 'property_insurance';
      if (product === 'Credit Life')        return 'credit_life';
      if (product === 'Term Plan')          return 'term_plan';
      return 'loan_protection_care'; // fallback
    };
"""

# Let's insert it right after the LEADS array definition or before function renderLeadTable
# A very safe place is before `function renderLeadTable() {`
if "function renderLeadTable()" in html and "MILESTONE_CONFIG" not in html:
    html = html.replace("function renderLeadTable() {", config_str + '\n    function renderLeadTable() {')
    print("Injected MILESTONE_CONFIG before renderLeadTable.")

with open("index.html", "w") as f:
    f.write(html)
