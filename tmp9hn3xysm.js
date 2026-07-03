
    // === GLOBAL STATE ===
    const MILESTONE_CONFIG = {
      'loan_protection_care': {
        label: 'Loan Protection · CARE Health',
        milestones: [
          { id: 'payment_verified',   label: 'Payment Verified',  completable: false },
          { id: 'proposal_form',      label: 'Proposal Form',     completable: true,  actionButton: 'Mark as Proposal Form Completed' },
          { id: 'policy_copy_upload', label: 'Policy Copy Upload',completable: false, isUpload: true, uploadButtonLabel: 'Mark as Policy Copy Received' },
        ]
      },
      'loan_protection_tata': {
        label: 'Loan Protection · TATA AIG',
        milestones: [
          { id: 'payment_verified',   label: 'Payment Verified',  completable: false },
          { id: 'tele_pd',            label: 'Tele-PD',           completable: true,  actionButton: 'Mark as Tele-PD Completed' },
          { id: 'policy_copy_upload', label: 'Policy Copy Upload',completable: false, isUpload: true, uploadButtonLabel: 'Mark as Policy Copy Received' },
        ]
      },
      'property_insurance': {
        label: 'Property Insurance',
        milestones: [
          { id: 'payment_verified',   label: 'Payment Verified',  completable: false },
          { id: 'kyc',                label: 'KYC',               completable: true,  actionButton: 'Mark as KYC Completed' },
          { id: 'policy_copy_upload', label: 'Policy Copy Upload',completable: false, isUpload: true, uploadButtonLabel: 'Mark as Policy Copy Received' },
        ]
      },
      'credit_life': {
        label: 'Credit Life',
        milestones: [
          { id: 'payment_verified',   label: 'Payment Verified',  completable: false },
          { id: 'documents',          label: 'Documents',         completable: true,  actionButton: 'Mark as Documents Received' },
          { id: 'medical',            label: 'Medical',           completable: true,  actionButton: 'Mark as Medical Completed' },
          { id: 'policy_decision',    label: 'Policy Decision',   completable: false, isDecision: true },
          { id: 'policy_copy_upload', label: 'Policy Copy Upload',completable: false, isUpload: true, uploadButtonLabel: 'Mark as Policy Copy Received' },
        ]
      },
      'term_plan': {
        label: 'Term Plan',
        milestones: [
          { id: 'payment_verified',   label: 'Payment Verified',  completable: false },
          { id: 'documents',          label: 'Documents',         completable: true,  actionButton: 'Mark as Documents Received' },
          { id: 'medical',            label: 'Medical',           completable: true,  actionButton: 'Mark as Medical Completed' },
          { id: 'policy_decision',    label: 'Policy Decision',   completable: false, isDecision: true },
          { id: 'policy_copy_upload', label: 'Policy Copy Upload',completable: false, isUpload: true, uploadButtonLabel: 'Mark as Policy Copy Received' },
        ]
      }
    };

    window.getMilestoneKey = function(product, insurer) {
      let p = (product || '').toLowerCase();
      let ins = (insurer || '').toLowerCase();
      
      let resolvedProduct = 'loan_protection';
      if (p.includes('property') || p.includes('home')) {
          resolvedProduct = 'property_insurance';
      } else if (p.includes('credit') || p.includes('cl')) {
          resolvedProduct = 'credit_life';
      } else if (p.includes('term')) {
          resolvedProduct = 'term_plan';
      } else if (p.includes('lp') || p.includes('loan')) {
          resolvedProduct = 'loan_protection';
      } else {
          if (ins.includes('hdfc ergo') || ins.includes('bajaj')) resolvedProduct = 'property_insurance';
          else if (ins.includes('hdfc life')) resolvedProduct = 'credit_life';
          else if (ins.includes('pb') || ins.includes('partners')) resolvedProduct = 'term_plan';
      }
      
      if (resolvedProduct === 'loan_protection') {
        return ins.includes('tata') 
          ? 'loan_protection_tata' 
          : 'loan_protection_care';
      }
      return resolvedProduct;
    };
    let currentLead = null;
    function addActivity(user, title, desc, time = 'Just now') {
      if (!currentLead) return;
      currentLead.log = currentLead.log || [];
      currentLead.log.unshift({
        dot: user === 'System' ? '#473391' : 'var(--primary)',
        text: `<b>${title}</b>${desc ? ' · ' + desc : ''}`,
        time: time
      });
    }
    window.addActivity = addActivity;
    let G_MS = {}; // milestone states
    let G_DS = {}; // doc statuses
    let G_AP = {}; // approval outcomes
    let G_MAINTAB = 'details';
    let G_SECTION = null; // null = stage content
    let G_LP = null;
    let G_LPC = { ten: 5, plan: 'PA + CI', loe: false, vb: false };
    let G_Q_TAB = 'calc';
    let G_PRODUCT_TAB = 'lp';
    let G_PBS = 'quotes';
    let G_PBI = -1;

    // Rate tables
    const CARE_RATES = {
      ci_pa: [
        {band: '18-25', rates: [200, 380, 550, 700, 850]},
        {band: '26-30', rates: [250, 480, 700, 900, 1100]},
        {band: '31-35', rates: [300, 580, 850, 1100, 1350]},
        {band: '36-40', rates: [400, 780, 1150, 1500, 1850]},
        {band: '41-45', rates: [550, 1080, 1600, 2100, 2600]},
        {band: '46-50', rates: [800, 1580, 2350, 3100, 3850]},
        {band: '51-55', rates: [1200, 2380, 3550, 4700, 5850]},
        {band: '56-60', rates: [1800, 3580, 5350, 7100, 8850]},
        {band: '61-65', rates: [2600, 5180, 7750, 10300, 12850]}
      ],
      pa_only: 40
    };
    const TATA_RATES = {
      ci: [ {band: 'All', rates: [220, 420, 600, 780, 950]} ],
      pa: [45, 85, 125, 165, 205]
    };

    // Stage definition
    // State Machine Definition
    const BUCKETS = ['New', 'Contacted', 'Quote', 'Payment Done', 'Policy Issued', 'Lost'];

    const LOST_STATUS_CONFIG = {
      subStatuses: [
        'Not Interested', 'Already Insured', 'Wrong Number', 'Duplicate Lead',
        'Premium Too High', 'Competitor Chosen', 'No Response',
        'Payment Not Received', 'Payment Failed',
        'Counter Offer Rejected', 'Medical Rejected', 'Insurer Rejected'
      ],
      mandatoryFollowUp: false,
      pendingWith: 'None',
      nextBucket: 'Lost'
    };

    // === STATE MACHINE CONFIG ===
    const STATE_MACHINE_CONFIG = {
      'New': {
        statuses: {
          'Not Connected': {
            subStatuses: ['Customer Busy', 'Not Reachable', 'Switched Off', 'Ringing No Answer', 'Voicemail', 'Customer Disconnected Call'],
            mandatoryFollowUp: true,
            pendingWith: 'Customer',
            nextBucket: 'New'
          },
          'Call Back': {
            subStatuses: ['Busy, Call Later', 'Call Later - Partial Discussion', 'Customer Disconnected Call', 'Language Barrier'],
            mandatoryFollowUp: true,
            pendingWith: 'Customer',
            nextBucket: 'Contacted'
          },
          'Interested': {
            subStatuses: ['Need Quote'],
            mandatoryFollowUp: false,
            pendingWith: 'IBM Agent',
            nextBucket: 'Contacted'
          },
          'Not Interested': {
            subStatuses: ['Too Expensive', 'Already Insured', 'Not Required', 'Will Purchase Later', 'Family Not Interested', 'Other'],
            mandatoryFollowUp: false,
            pendingWith: 'Customer',
            nextBucket: 'Contacted'
          }
        }
      },
      'Contacted': {
        statuses: {
          'Call Back': {
            subStatuses: ['Need More Information', 'Discussing With Family', 'Call After Loan Sanction', 'Call After Disbursement'],
            mandatoryFollowUp: true,
            pendingWith: 'Customer',
            nextBucket: 'Contacted'
          },
          'Interested': {
            subStatuses: ['Need Quote'],
            mandatoryFollowUp: false,
            pendingWith: 'IBM Agent',
            nextBucket: 'Quote'
          },
          'Not Interested': {
            subStatuses: ['Existing Insurance', 'Premium High', 'No Requirement', 'Loan Cancelled', 'Other'],
            mandatoryFollowUp: false,
            pendingWith: 'Customer',
            nextBucket: 'Contacted'
          }
        }
      },
      'Quote': {
        statuses: {
          'Quote Shared': {
            subStatuses: ['Consent Pending', 'Exploring Options', 'Visit Requested'],
            mandatoryFollowUp: true,
            pendingWith: 'Customer',
            nextBucket: 'Quote'
          },
          'Payment Link Shared': {
            subStatuses: ['Awaiting Payment', 'Link Not Working', 'Resend Requested'],
            mandatoryFollowUp: true,
            pendingWith: 'Customer',
            nextBucket: 'Quote'
          },
          'Payment Done': {
            subStatuses: ['Verification Pending', 'Verification Failed', 'Verified'],
            mandatoryFollowUp: false,
            pendingWith: 'Ambak Operations',
            nextBucket: 'Payment Done',
            conditionNextBucket: (subStatus) => subStatus === 'Verified' ? 'Payment Done' : 'Quote',
            mandatoryUpload: () => 'Payment Proof'
          }
        }
      },
      'Payment Done': {
        statuses: {
          'Documents': {
            subStatuses: ['Pending', 'Partial', 'Received'],
            mandatoryFollowUp: false,
            pendingWith: 'Customer',
            nextBucket: 'Payment Done'
          },
          'KYC': {
            subStatuses: ['Pending', 'Completed'],
            mandatoryFollowUp: false,
            pendingWith: 'Customer',
            nextBucket: 'Payment Done'
          },
          'Proposal Form': {
            subStatuses: ['Pending', 'Completed'],
            mandatoryFollowUp: false,
            pendingWith: 'Customer',
            nextBucket: 'Payment Done'
          },
          'Tele-PD': {
            subStatuses: ['Pending', 'Completed'],
            mandatoryFollowUp: false,
            pendingWith: 'Customer',
            nextBucket: 'Payment Done'
          },
          'Medical': {
            subStatuses: ['Scheduled', 'Completed'],
            mandatoryFollowUp: false,
            pendingWith: 'Customer',
            nextBucket: 'Payment Done'
          },
          'Underwriting': {
            subStatuses: ['Pending', 'Counter Offer', 'Approved', 'Rejected'],
            mandatoryFollowUp: false,
            pendingWith: 'Insurer',
            nextBucket: 'Payment Done',
            captureCounterOffer: (subStatus) => subStatus === 'Counter Offer'
          },
          'Policy Copy': {
            subStatuses: ['Pending', 'Issued'],
            mandatoryFollowUp: false,
            pendingWith: 'Ambak Operations',
            nextBucket: 'Policy Issued',
            conditionNextBucket: (subStatus) => subStatus === 'Issued' ? 'Policy Issued' : 'Payment Done',
            mandatoryUpload: (subStatus) => subStatus === 'Issued' ? 'Policy Copy' : null
          }
        }
      },
      'Policy Issued': {
        statuses: {
          'Freelook Period': {
            subStatuses: ['Pending', 'Completed', 'Policy Cancelled'],
            mandatoryFollowUp: false,
            pendingWith: 'None',
            nextBucket: 'Policy Issued'
          }
        }
      }
    };

    // === DATA (Mock) ===
    const LEADS = [
      {
        id: 'INS-49201', code: 'priya',
        name: 'Priya Sharma', phone: '+91 98765 43210', email: 'priya.s@gmail.com',
        age: 34, income: '₹14L/yr', si: 4500000, loanBank: 'HDFC Bank',
        initialProduct: 'lp', productStatus: 'draft', quotes: [],
        source: 'd2c', bucket: 'Quote', status: 'Quote Shared', subStatus: 'Exploring Other Options',
        attempts: 0, createdDate: '14 Jun 2026', createdAt: new Date(Date.now() - 2*86400000).toISOString(),
        followUpDate: 'Today 4:30 PM',
        hlLead: { id: '#194856', bank: 'HDFC Bank', si: 4500000, hlStage: 'Login Done', rm: 'Rohit M' },
        log: [
          {dot: '#473391', text: 'Bucket changed to Quote', time: '2 hrs ago'},
          {dot: '#D97706', text: 'Status updated to Quote Shared - Exploring Other Options', time: '3 hrs ago'},
          {dot: '#3B82F6', text: 'Connected: Call answered', time: '4 hrs ago'},
        ]
      },
      {
        id: 'INS-49202', code: 'rajesh',
        name: 'Rajesh Kumar', phone: '+91 87654 32109', email: 'rajesh.k@gmail.com',
        age: 42, income: '₹22L/yr', si: 6000000, loanBank: 'ICICI Bank',
        initialProduct: 'term', productStatus: 'draft', quotes: [],
        source: 'sathi', bucket: 'New', status: 'Not Connected', subStatus: 'Customer Busy',
        attempts: 1, createdDate: '15 Jun 2026', createdAt: new Date(Date.now() - 7*86400000).toISOString(),
        followUpDate: 'Tomorrow 11:00 AM',
        hlLead: { id: '#194892', bank: 'ICICI Bank', si: 6000000, hlStage: 'Sanctioned', rm: 'Rohit M' },
        log: [
          {dot: '#3B82F6', text: 'Call attempt: Not connected', time: 'Yesterday'},
        ]
      },
      {
        id: 'INS-49203', code: 'sunita',
        name: 'Sunita Patel', phone: '+91 76543 21098', email: 'sunita.p@gmail.com',
        age: 39, income: '₹18L/yr', si: 3000000, loanBank: 'SBI',
        initialProduct: 'cl', productStatus: 'locked', quotes: [],
        finalProduct: 'cl', finalInsurer: 'HDFC Life', finalPremium: 9500,
        source: 'd2c', bucket: 'Quote', status: 'Payment Link Shared', subStatus: 'Awaiting Payment',
        attempts: 0, createdDate: '10 Jun 2026', createdAt: new Date(Date.now() - 12*86400000).toISOString(),
        followUpDate: 'Overdue (2 days)',
        hlLead: { id: '#194701', bank: 'SBI', si: 3000000, hlStage: 'Disbursed', rm: 'Rohit M' },
        log: [
          {dot: '#2563EB', text: 'Payment link generated & sent', time: 'Today 9:00 AM'},
        ]
      },
      {
        id: 'INS-49204', code: 'amit',
        name: 'Amit Singh', phone: '+91 65432 10987', email: 'amit.s@gmail.com',
        age: 45, income: '₹12L/yr', si: null, loanBank: 'NR Associates',
        initialProduct: 'property', productStatus: 'draft', quotes: [],
        source: 'yoddha', bucket: 'New', status: 'Call Back', subStatus: 'Busy, Call Later',
        attempts: 0, createdDate: '16 Jun 2026', createdAt: new Date(Date.now() - 15*86400000).toISOString(),
        followUpDate: 'No Follow-up',
        hlLead: null,
        log: [
          {dot: '#16A34A', text: 'Lead created manually', time: '15 days ago'},
        ]
      },
      {
        id: 'INS-49205', code: 'neha',
        name: 'Neha Gupta', phone: '+91 54321 09876', email: 'neha.g@gmail.com',
        age: 28, income: '₹9L/yr', si: 3500000, loanBank: 'Axis Bank',
        initialProduct: 'lp', productStatus: 'locked', quotes: [],
        finalProduct: 'lp', finalInsurer: 'CARE', finalPremium: 8200,
        source: 'sathi', bucket: 'Payment Done', status: 'Medical', subStatus: 'Scheduled',
        attempts: 0, createdDate: '01 Jun 2026', createdAt: new Date(Date.now() - 22*86400000).toISOString(),
        followUpDate: 'No Follow-up',
        hlLead: { id: '#194123', bank: 'Axis Bank', si: 3500000, hlStage: 'Disbursed', rm: 'Rohit M' },
        log: [
          {dot: '#16A34A', text: 'Payment verified', time: '5 mins ago'},
        ]
      },
      {
        id: 'INS-49206', code: 'vikram',
        name: 'Vikram Mehta', phone: '+91 43210 98765', email: 'vikram.m@gmail.com',
        age: 50, income: '₹35L/yr', si: 8000000, loanBank: 'Kotak Bank',
        initialProduct: 'term', productStatus: 'draft', quotes: [],
        source: 'd2c', bucket: 'Contacted', status: 'Call Back', subStatus: 'Discussing With Family',
        attempts: 0, createdDate: '17 Jun 2026', createdAt: new Date(Date.now() - 0*86400000).toISOString(),
        followUpDate: 'Today 2:00 PM',
        hlLead: { id: '#194999', bank: 'Kotak Bank', si: 8000000, hlStage: 'Contacted', rm: 'Rohit M' },
        log: [
          {dot: '#16A34A', text: 'Lead assigned from Sangam', time: 'Just now'},
        ]
      }
    ];

    // === HELPERS ===
    function toggleMoreFilters() {
      document.getElementById('filterDrawer').classList.toggle('open');
      document.getElementById('filterOverlay').classList.toggle('open');
    }
    function toggleDrawer() {
      document.getElementById('navDrawer').classList.toggle('open');
      document.getElementById('drawerOverlay').classList.toggle('open');
    }

    function showToast(msg, isSuccess=true) {
      const t = document.getElementById('toast');
      document.getElementById('toast-msg').innerText = msg;
      document.getElementById('toast-icon').innerText = isSuccess ? '✓' : 'ℹ';
      t.style.background = isSuccess ? '#16A34A' : '#1A1A2E';
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2600);
    }

    // Modal JS Logic
    function openStatusModal(leadId) {
      const lead = LEADS.find(l => l.id === leadId);
      document.getElementById('statusLeadId').value = lead.id;
      document.getElementById('statusCurrentBucket').value = lead.bucket;
      
      const config = STATE_MACHINE_CONFIG[lead.bucket];
      const statusSelect = document.getElementById('statusSelect');
      statusSelect.innerHTML = '<option value="">Select Status</option>';
      if (config) {
        Object.keys(config.statuses).forEach(status => {
          statusSelect.innerHTML += `<option value="${status}">${status}</option>`;
        });
      }
      
      document.getElementById('subStatusSelect').innerHTML = '<option value="">Select Sub Status</option>';
      document.getElementById('followUpGroupWrapper').style.display = 'none';
      document.getElementById('followUpDateInput').value = '';
      document.getElementById('pendingWithSelect').value = 'Customer';
      document.getElementById('remarksInput').value = '';
      
      document.getElementById('statusModalOverlay').classList.add('open');
      document.getElementById('statusModal').style.display = 'block';
    }

    function handleStatusChange() {
      const bucket = document.getElementById('statusCurrentBucket').value;
      const status = document.getElementById('statusSelect').value;
      const subSelect = document.getElementById('subStatusSelect');
      
      subSelect.innerHTML = '<option value="">Select Sub Status</option>';
      if (!status) return;
      
      const statusConfig = STATE_MACHINE_CONFIG[bucket].statuses[status];
      statusConfig.subStatuses.forEach(sub => {
        subSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
      });
      
      handleSubStatusChange();
    }

    function handleSubStatusChange() {
      const bucket = document.getElementById('statusCurrentBucket').value;
      const status = document.getElementById('statusSelect').value;
      const subStatus = document.getElementById('subStatusSelect').value;
      
      if (!status || !subStatus) return;
      
      const config = STATE_MACHINE_CONFIG[bucket].statuses[status];
      
      if (config.mandatoryFollowUp) {
        document.getElementById('followUpGroupWrapper').style.display = 'flex';
      } else {
        document.getElementById('followUpGroupWrapper').style.display = 'none';
      }
      
      if (config.pendingWith && config.pendingWith !== 'None') {
        document.getElementById('pendingWithSelect').value = config.pendingWith;
      }
      
      if (config.mandatoryUpload && typeof config.mandatoryUpload === 'function') {
        const uploadLabel = config.mandatoryUpload(subStatus);
        if (uploadLabel) {
          document.getElementById('uploadGroupWrapper').style.display = 'block';
          document.getElementById('uploadGroupLabel').innerText = uploadLabel.toUpperCase() + ' *';
          if (uploadLabel === 'Payment Proof') {
             document.getElementById('paymentProofFields').style.display = 'flex';
          } else {
             document.getElementById('paymentProofFields').style.display = 'none';
          }
        } else {
          document.getElementById('uploadGroupWrapper').style.display = 'none';
        }
      } else {
        document.getElementById('uploadGroupWrapper').style.display = 'none';
      }
      
      if (config.captureCounterOffer && typeof config.captureCounterOffer === 'function') {
        const showCO = config.captureCounterOffer(subStatus);
        if (showCO) {
          document.getElementById('coGroupWrapper').style.display = 'flex';
        } else {
          document.getElementById('coGroupWrapper').style.display = 'none';
        }
      } else {
        document.getElementById('coGroupWrapper').style.display = 'none';
      }
    }
    
    function closeStatusModal() {
      document.getElementById('statusModalOverlay').classList.remove('open');
      document.getElementById('statusModal').style.display = 'none';
    }

    function saveStatusUpdate() {
      const id = document.getElementById('statusLeadId').value;
      const status = document.getElementById('statusSelect').value;
      const subStatus = document.getElementById('subStatusSelect').value;
      const bucket = document.getElementById('statusCurrentBucket').value;
      const dateInput = document.getElementById('followUpDateInput').value;
      const pendingWith = document.getElementById('pendingWithSelect').value;
      const remarks = document.getElementById('remarksInput').value;
      
      if (!status || !subStatus) {
        alert("Please select Status and Sub Status."); return;
      }
      
      const config = STATE_MACHINE_CONFIG[bucket].statuses[status];
      if (config.mandatoryFollowUp && !dateInput) {
        alert("Follow-up date is mandatory for this status."); return;
      }
      
      let paymentLog = '';
      if (config.mandatoryUpload && typeof config.mandatoryUpload === 'function') {
        const uploadLabel = config.mandatoryUpload(subStatus);
        if (uploadLabel) {
          if (!document.getElementById('uploadInput').value) {
             alert(uploadLabel + " is mandatory for this status."); return;
          }
          if (uploadLabel === 'Payment Proof') {
             const amt = document.getElementById('paymentAmountInput').value;
             const utr = document.getElementById('paymentUtrInput').value;
             const dt = document.getElementById('paymentDateInput').value;
             if(!amt || !utr || !dt) {
                alert("Payment Amount, UTR, and Date are mandatory."); return;
             }
             paymentLog = `<br>Payment Amt: ₹${amt} | UTR: ${utr} | Date: ${dt}`;
          }
        }
      }
      
      let nextBucket = config.nextBucket;
      if (config.conditionNextBucket) {
        nextBucket = config.conditionNextBucket(subStatus);
      }
      
      let coLog = '';
      if (config.captureCounterOffer && typeof config.captureCounterOffer === 'function') {
        const showCO = config.captureCounterOffer(subStatus);
        if (showCO) {
           const coAmount = document.getElementById('coAmountModal').value;
           const coResponse = document.getElementById('coResponseModal').value;
           const coPremium = document.getElementById('coPremiumModal').value;
           if (coAmount) coLog += `<br>CO Amount: ₹${coAmount}`;
           if (coResponse) coLog += `<br>Customer Response: ${coResponse}`;
           if (coPremium) coLog += `<br>Addl Premium: ₹${coPremium}`;
        }
      }
      
      const lead = LEADS.find(l => l.id === id);
      lead.bucket = nextBucket;
      lead.status = status;
      lead.subStatus = subStatus;
      
      if (config.mandatoryFollowUp) {
        let dateObj = new Date(dateInput + 'T00:00');
        lead.followUpDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        lead.followUpDate = 'No Follow-up';
      }
      
      let logText = `Status updated to ${status} - ${subStatus} (Pending With: ${pendingWith})`;
      if (remarks) logText += ` | Remarks: ${remarks}`;
      logText += coLog;
      logText += paymentLog;
      
      lead.log.unshift({ dot: '#473391', text: logText, time: 'Just now' });
      
      closeStatusModal();
      renderLeadTable();
      showToast('Status Updated Successfully!');
    }

    function openLostModal() {
      if(!currentLead) return;
      document.getElementById('lostModalOverlay').classList.add('open');
      document.getElementById('lostModal').style.display = 'block';
      document.getElementById('lostCategorySelect').value = '';
      document.getElementById('lostReasonSelect').value = '';
      document.getElementById('lostReasonSelect').disabled = true;
      document.getElementById('lostRemarksInput').value = '';
      document.getElementById('allowReopenCheckbox').checked = true;
    }

    function closeLostModal() {
      document.getElementById('lostModalOverlay').classList.remove('open');
      document.getElementById('lostModal').style.display = 'none';
    }

    const LOST_REASONS_MAP = {
      'Customer Related': ['Not Interested', 'Already Insured', 'Wrong Number', 'Duplicate Lead', 'Language Barrier'],
      'Quote Related': ['Premium Too High', 'Competitor Chosen', 'No Response'],
      'Payment Related': ['Payment Not Received', 'Payment Failed'],
      'Underwriting Related': ['Medical Rejected', 'Counter Offer Rejected', 'Insurer Rejected']
    };

    function updateLostReasons() {
      const cat = document.getElementById('lostCategorySelect').value;
      const reasonSelect = document.getElementById('lostReasonSelect');
      reasonSelect.innerHTML = '<option value="">Select Reason</option>';
      if (cat && LOST_REASONS_MAP[cat]) {
        LOST_REASONS_MAP[cat].forEach(r => {
          reasonSelect.innerHTML += `<option value="${r}">${r}</option>`;
        });
        reasonSelect.disabled = false;
      } else {
        reasonSelect.disabled = true;
      }
    }

    function saveLostState() {
      const cat = document.getElementById('lostCategorySelect').value;
      const reason = document.getElementById('lostReasonSelect').value;
      const remarks = document.getElementById('lostRemarksInput').value;
      const allowReopen = document.getElementById('allowReopenCheckbox').checked;

      if (!cat || !reason || !remarks.trim()) {
        showToast('Category, Reason, and Remarks are mandatory.');
        return;
      }

      currentLead.lastActiveBucket = currentLead.bucket;
      currentLead.bucket = 'Lost';
      currentLead.isLost = true;
      currentLead.lostMetadata = {
        category: cat,
        reason: reason,
        remarks: remarks,
        allowReopen: allowReopen,
        timestamp: new Date().toLocaleString(),
        agent: 'Verification Agent'
      };

      currentLead.log.unshift({
        dot: '#EF4444',
        text: `Marked as Lost: ${reason} (${cat})<br>Remarks: ${remarks}`,
        time: 'Just now'
      });

      closeLostModal();
      renderLeadTable();
      renderLeadDetail();
      showToast('Lead marked as lost');
    }

    function reopenLead() {
      if(!currentLead || !currentLead.isLost) return;
      currentLead.isLost = false;
      currentLead.bucket = currentLead.lastActiveBucket || 'New';
      
      currentLead.log.unshift({
        dot: '#10B981',
        text: 'Lead Reopened',
        time: 'Just now'
      });

      renderLeadTable();
      renderLeadDetail();
      showToast('Lead reopened successfully');
    }

    function formatMoney(num) {
      if(!num) return '₹-';
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
    }

    function formatLakhs(num) {
      if(!num) return 'missing';
      return '₹' + (num/100000).toFixed(0) + 'L';
    }
    
    function getProductLabel(key) {
      if (!key) return 'Not Selected';
      const map = { lp: 'Loan Protection', property: 'Property Insurance', cl: 'Credit Life', term: 'Term Plan' };
      return map[key] || key;
    }
    function getStageLabel(key) {
      return key.charAt(0).toUpperCase() + key.slice(1);
    }
    function getActionBtn(lead) {
      switch(lead.bucket) {
        case 'New': return `<button class="btn btn-primary btn-small" onclick="event.stopPropagation(); gCallOut('call')">Call Now</button>`;
        case 'Contacted': return `<button class="btn btn-primary btn-small" onclick="event.stopPropagation(); openLead('${lead.id}')">Follow Up</button>`;
        case 'Quote': return `<button class="btn btn-ghost btn-small" onclick="event.stopPropagation(); openLead('${lead.id}')">View Quotes</button>`;
        case 'Payment Done': return `<button class="btn btn-ghost btn-small" onclick="event.stopPropagation(); openLead('${lead.id}')">Track Progress</button>`;
        case 'Policy': return `<button class="btn btn-ghost btn-small" onclick="event.stopPropagation(); window.open('https://firebasestorage.googleapis.com', '_blank')">Download Policy</button>`;
        case 'Lost': return `<button class="btn btn-ghost btn-small" style="color:var(--text-muted);" onclick="event.stopPropagation(); openLead('${lead.id}')">View</button>`;
        default: return `<button class="btn btn-ghost btn-small" onclick="event.stopPropagation(); openLead('${lead.id}')">View</button>`;
      }
    }

    // === RENDERERS: LIST SCREEN ===
    function renderPipelineCards() {
      const pc = document.getElementById('pipeline-cards');
      if (pc) pc.innerHTML = '';
    }

    function renderLeadTable() {
      let tbody = document.getElementById('lead-table-body');
      let html = '';
      
      LEADS.forEach(l => {
        let siText = l.si ? formatLakhs(l.si) : `-`;
        let bankText = l.hlLead ? l.hlLead.bank : (l.loanBank || '-');
        let hlStage = l.hlLead ? l.hlLead.hlStage : '-';
        let statusText = l.status || '-';
        let subStatusText = l.subStatus ? `(${l.subStatus})` : '';
        
        let insurer = l.finalInsurer || (l.selectedPlan ? l.selectedPlan.insurer : '');
        let insurerText = insurer ? insurer : 'Unassigned';
        
        // Calculate Lead Age
        let leadAge = 'Just now';
        if (l.createdAt) {
           let diffMs = Date.now() - new Date(l.createdAt).getTime();
           let diffDays = Math.floor(diffMs / 86400000);
           if (diffDays === 0) leadAge = 'Just now';
           else if (diffDays === 1) leadAge = 'Yesterday';
           else leadAge = `${diffDays} days ago`;
        }
        
        let createdDate = l.createdDate || '15 Jun 2026';
        
        // Priority / FUP Logic
        let nextFup = l.followUpDate || 'No Follow-up';
        let fupColor = nextFup.toLowerCase().includes('overdue') ? '#DC2626' : 'inherit';
        
        const bucketBgMap = { 'New': '#EFF6FF', 'Contacted': '#FFFBEB', 'Quote': '#EEEDFE', 'Payment Done': '#F0FDFA', 'Policy Issued': '#F0FDF4', 'Lost': '#FEF2F2' };
        const bucketColorMap = { 'New': '#1E40AF', 'Contacted': '#B45309', 'Quote': '#4C1D95', 'Payment Done': '#0F766E', 'Policy Issued': '#15803D', 'Lost': '#991B1B' };
        let bBg = bucketBgMap[l.bucket] || '#F3F4F6';
        let bColor = bucketColorMap[l.bucket] || 'var(--text-heading)';
        
        let partnerText = l.partner || '-';
        let rmText = l.rmName || '-';
        let subSourceText = l.subSource || '-';
        let loanAmount = l.si ? formatLakhs(l.si) : (l.loanAmount ? formatLakhs(l.loanAmount) : '-');
        
        // If no loan linked, Loan column shows "-"
        let loanColHtml = '';
        if (l.hlLead || l.loanBank || l.si || l.loanAmount) {
             loanColHtml = `
               <div style="font-weight:600">${loanAmount}</div>
               <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${bankText}</div>
               <div style="font-size:11px; color:var(--text-muted); margin-top:2px; font-weight:500;">${hlStage}</div>
             `;
        } else {
             loanColHtml = `<div style="font-size:13px; color:#9CA3AF;">—</div>`;
        }
        
        let pColor = partnerText === '-' ? '#9CA3AF' : 'var(--text-heading)';
        let rColor = rmText === '-' ? '#9CA3AF' : 'var(--text-heading)';
        let ssColor = subSourceText === '-' ? '#9CA3AF' : '#6B7280';
        
        html += `
          <tr onclick="openLead('${l.id}')" style="cursor:pointer;" class="table-row-hover">
            <td>
              <div style="font-weight:700; color:var(--primary);">${l.id}</div>
            </td>
            <td>
              <div class="lead-name" style="font-weight:700; color:var(--text-heading);">${l.name}</div>
              <div class="lead-phone" style="font-size:12px; color:var(--text-muted); margin-top:2px;">${l.phone}</div>
            </td>
            <td>
              <div style="font-weight:700;">${getProductLabel(l.finalProduct || l.initialProduct)}</div>
              <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${insurerText}</div>
            </td>
            <td>
              ${loanColHtml}
            </td>
            <td>
              <span class="badge" style="background:${bBg}; color:${bColor}; margin-bottom:4px; display:inline-block;">${l.bucket}</span>
              <div style="font-size:12px; font-weight:700; color:var(--text-heading); margin-top:4px;">${statusText} <span style="color:#6B7280; font-size:11px; font-weight:400;">${subStatusText}</span></div>
            </td>
            <td>
              <div style="font-weight:600; font-size:13px; color:var(--text-heading); text-transform:capitalize;">${l.source || 'D2C'}</div>
              <div style="font-size:11px; color:${ssColor}; margin-top:2px;">${subSourceText}</div>
            </td>
            <td>
               <div style="font-weight:500; font-size:13px; color:${pColor};">${partnerText}</div>
            </td>
            <td>
               <div style="font-weight:500; font-size:13px; color:${rColor};">${rmText}</div>
            </td>
            <td>
               <div style="font-weight:600; font-size:13px; color:${fupColor};">${nextFup}</div>
            </td>
            <td>
               <div style="font-weight:600; font-size:13px; color:#111827;">${createdDate}</div>
               <div style="font-size:11px; color:#9CA3AF; margin-top:2px;">${leadAge}</div>
            </td>
            <td>
               <select class="search-input" style="min-width:100px; font-size:12px; font-weight:600; padding:4px 8px; height:auto; margin:0; border-radius:6px; cursor:pointer;" onclick="event.stopPropagation()">
                 <option>${l.rmName || 'Unassigned'}</option>
                 <option>Rohit M</option>
                 <option>Anil K</option>
                 <option>Sneha P</option>
               </select>
            </td>
          </tr>
        `;
      });
      if(tbody) tbody.innerHTML = html;
      const ec = document.getElementById('entry-count');
      if(ec) ec.textContent = LEADS.length;
    }

    // === NAVIGATION ===
    function showScreen(screen) {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.getElementById(`screen-${screen}`).classList.add('active');
    }

    function navigateNav(screen) {
      document.querySelectorAll('.nav-item').forEach(i => {
        i.style.background = 'transparent';
        i.style.color = 'var(--text-body)';
      });
      document.getElementById(`nav-item-${screen}`).style.background = 'var(--primary)';
      document.getElementById(`nav-item-${screen}`).style.color = 'var(--white)';
      document.getElementById('navDrawer').classList.remove('open');
      document.getElementById('drawerOverlay').classList.remove('open');
      showScreen(screen);
    }

    function openLead(id) {
      currentLead = LEADS.find(l => l.id === id);
      G_SECTION = null;
      G_PRODUCT_TAB = currentLead.initialProduct || 'lp';
      renderLeadDetail();
      showScreen('detail');
    }

    function closeLead() {
      currentLead = null;
      showScreen('list');
      renderLeadTable(); // Refresh table in case stages changed
      renderPipelineCards();
    }

    function renderLeadDetail() {
      if (!currentLead) return;
      
      let html = `
        <div class="detail-body" style="display: flex; flex-direction: column; height: 100vh; overflow: hidden;">
          <div id="detail-meta" style="flex-shrink: 0;"></div>
          <div class="sangam-workspace" style="display: flex; flex: 1; overflow: hidden; margin-top: 0; gap: 0; position: relative;">
            <div id="detail-center" style="flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #F9FAFB;"></div>
            <div id="detail-right" style="width: 440px; min-width: 440px; flex-shrink: 0; border-left: 1px solid #E5E7EB; background: white; display: flex; flex-direction: column; overflow: hidden;"></div>
            
            <div id="drawer-overlay" style="display: none; position: absolute; left: 0; top: 0; bottom: 0; right: 440px; background: rgba(0,0,0,0.2); z-index: 40;" onclick="closeLeadDetailsDrawer()"></div>
            <div id="lead-details-drawer" style="position: absolute; left: 0; top: 0; bottom: 0; width: 480px; background: white; z-index: 50; transform: translateX(-100%); transition: transform 0.25s ease; box-shadow: 4px 0 24px rgba(0,0,0,0.08); display: flex; flex-direction: column;"></div>
          </div>
        </div>
      `;
      document.getElementById('screen-detail').innerHTML = html;
      
      renderMetaStrip();
      renderCenterPanel();
      renderRightPanel();
    }

    function renderMetaStrip() {
      const l = currentLead;
      
      let stat = l.status || 'Fresh';
      let statColor = '#111827';
      let statBg = '#F3F4F6';
      if(stat === 'Not Connected') { statBg = '#FDECEA'; statColor = '#C0392B'; }
      else if(stat === 'Call Back') { statBg = '#E8F1FF'; statColor = '#0A58CA'; }
      else if(stat === 'Interested') { statBg = '#E6F4ED'; statColor = '#1A7A4A'; }
      else if(stat === 'Quote Shared') { statBg = '#FFF8E1'; statColor = '#856404'; }
      else if(stat === 'Payment Done') { statBg = '#E6F4ED'; statColor = '#1A7A4A'; }
      else if(stat === 'Policy Issued') { statBg = '#E0F2FE'; statColor = '#0369A1'; }
      
      let fupText = "No Follow Up";
      let fupColor = "#9CA3AF";
      let fupWeight = "400";
      if (l.followUpDate && l.followUpDate !== 'No Follow-up') {
         if(l.followUpDate.toLowerCase().includes('overdue')) {
            fupText = l.followUpDate;
            fupColor = "#C0392B";
            fupWeight = "700";
         } else {
            fupText = l.followUpDate;
            fupColor = "#4B5563";
         }
      }

      let html = `
        <div style="position: sticky; top: 0; z-index: 100; background: white; border-bottom: 1px solid #E5E7EB; width: 100%; display: flex; flex-direction: column; font-family: 'Poppins', sans-serif;">
          <!-- ROW 1 -->
          <div style="display: flex; flex-direction: row; align-items: stretch;">
            
            <!-- Block 1 -->
            <div style="padding: 10px 20px; border-right: 1px solid #F3F4F6; flex: 1;">
              <div style="color: #9CA3AF; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px;">INSURANCE ID</div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="font-size: 13px; font-weight: 700; color: #473391;">${l.id || '—'}</div>
                <div style="color: #473391; font-size: 10px; cursor: pointer; font-weight: 600;" onclick="openLeadDetailsDrawer()">Lead Details →</div>
              </div>
              <div style="font-size: 13px; font-weight: 600; color: #111827;">${l.name || '—'}</div>
              <div style="font-size: 11px; color: #6B7280;">${l.phone || '—'} · Age 42</div>
            </div>

            <!-- Block 2 -->
            <div style="padding: 10px 20px; border-right: 1px solid #F3F4F6; flex: 1;">
              <div style="color: #9CA3AF; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px;">PRODUCT</div>
              <div style="font-size: 13px; font-weight: 700; color: #111827;">${getProductLabel(l.finalProduct || l.initialProduct) || '—'}</div>
              <div style="font-size: 11px; color: #6B7280;">Insurer: ${l.finalInsurer && l.finalInsurer !== 'Unknown' ? l.finalInsurer : 'PB Partner'}</div>
              <div style="margin-top: 4px; display: flex; align-items: center; gap: 6px;">
                ${l.productStatus === 'locked' ? 
                  `<span style="background: #E6F4ED; color: #1A7A4A; border-radius: 10px; padding: 2px 8px; font-size: 10px; font-weight: 700; height: 18px; display: inline-flex; align-items: center;">Locked</span>` :
                  `<span style="background: #F3F4F6; color: #6B7280; border-radius: 10px; padding: 2px 8px; font-size: 10px; font-weight: 700; height: 18px; display: inline-flex; align-items: center;">Draft</span>
                   <span style="color: #473391; font-size: 10px; cursor: pointer; font-weight: 600;" onclick="showToast('Edit product recommendation')">[Change]</span>`
                }
              </div>
            </div>

            <!-- Block 3 -->
            <div style="padding: 10px 20px; border-right: 1px solid #F3F4F6; flex: 1;">
              <div style="color: #9CA3AF; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px;">LOAN</div>
              <div style="font-size: 13px; font-weight: 600; color: #111827;">${l.hlLead ? '₹' + formatLakhs(l.hlLead.si) + ' · ' + l.hlLead.bank : (l.si ? '₹' + formatLakhs(l.si) + ' · ICICI Bank' : '—')}</div>
              <div style="font-size: 11px; color: #6B7280;">HL Stage: <span style="font-weight: 700;">${l.hlLead ? getStageLabel(l.hlLead.hlStage) : '—'}</span></div>
              ${(l.hlLead || l.si) ? `
              <div style="display: flex; align-items: center; gap: 4px; margin-top: 4px;">
                <span style="font-size: 10px; color: #473391;">🔗</span>
                <span style="font-size: 11px; font-weight: 600; color: #473391;">Ambak HL Lead: #${l.hlLead ? l.hlLead.id || '194892' : '194892'}</span>
                <span style="font-size: 11px; color: #473391; text-decoration: underline; cursor: pointer;" onclick="window.open('about:blank','_blank')">View →</span>
              </div>` : `
              <div style="display: flex; align-items: center; gap: 4px; margin-top: 4px;">
                <span style="font-size: 10px; color: #9CA3AF;">⚠</span>
                <span style="font-size: 11px; font-weight: 500; color: #9CA3AF;">No Ambak HL lead linked</span>
              </div>`}
            </div>

            <!-- Block 4 -->
            <div style="padding: 10px 20px; border-right: 1px solid #F3F4F6; flex: 1;">
              <div style="color: #9CA3AF; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px;">SOURCE / CREATED</div>
              <div style="font-size: 12px; font-weight: 500; color: #111827;">${(l.source || '—').toUpperCase()} / Website</div>
              <div style="font-size: 11px; color: #6B7280;">${l.createdDate || '—'}</div>
            </div>

            <!-- Block 5 -->
            <div style="padding: 10px 20px; border-right: 1px solid #F3F4F6; flex: 1;">
              <div style="color: #9CA3AF; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px;">PARTNER / RM</div>
              <div style="font-size: 12px; font-weight: 500; color: #111827; display: flex; align-items: center; gap: 4px;">
                E2E Sales (AMB10454) <span style="color: #25D366; font-size: 10px;">📞</span>
              </div>
              <div style="font-size: 11px; color: #6B7280; display: flex; align-items: center; gap: 4px; margin-top: 2px;">
                RM: Ambak BM <span style="color: #473391; font-size: 10px;">📞</span>
              </div>
            </div>

            <!-- Block 6 -->
            <div style="padding: 10px 20px; flex: 1;">
              <div style="color: #9CA3AF; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px;">ASSIGNED IBM</div>
              <div style="font-size: 13px; font-weight: 600; color: #111827;">${l.hlLead ? (l.hlLead.rm || 'Rohit M') : 'Rohit M'}</div>
              <div style="font-size: 11px; color: #6B7280;">Verification Agent</div>
            </div>
          </div>

          <!-- ROW 2 -->
          <div style="background: #FAFAFA; border-top: 1px solid #F3F4F6; padding: 0 20px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 0;">
              <div style="padding: 10px 20px; font-size: 13px; font-weight: 600; color: #473391; border-bottom: 2px solid #473391; cursor: pointer;">Insurance Details</div>
              <div style="padding: 10px 20px; font-size: 13px; font-weight: 600; color: #9CA3AF; border-bottom: 2px solid transparent; cursor: pointer;" onmouseover="this.style.color='#473391'" onmouseout="this.style.color='#9CA3AF'">Activity History</div>
              <div style="padding: 10px 20px; font-size: 13px; font-weight: 600; color: #9CA3AF; border-bottom: 2px solid transparent; cursor: pointer;" onmouseover="this.style.color='#473391'" onmouseout="this.style.color='#9CA3AF'">Follow Ups</div>
              <div style="padding: 10px 20px; font-size: 13px; font-weight: 600; color: #9CA3AF; border-bottom: 2px solid transparent; cursor: pointer;" onmouseover="this.style.color='#473391'" onmouseout="this.style.color='#9CA3AF'">Documents</div>
            </div>

            <div style="margin-left: auto; display: flex; gap: 6px;">
              <div style="width: 28px; height: 28px; border-radius: 50%; background: #25D366; color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; cursor: pointer; font-weight: 600;" title="WhatsApp">W</div>
              <div style="width: 28px; height: 28px; border-radius: 50%; background: #EA4335; color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; cursor: pointer; font-weight: 600;" title="Email">@</div>
              <div style="width: 28px; height: 28px; border-radius: 50%; background: #1DA1F2; color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; cursor: pointer; font-weight: 600;" title="SMS">S</div>
              <div style="width: 28px; height: 28px; border-radius: 50%; background: #473391; color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; cursor: pointer;" title="Call">📞</div>
            </div>
          </div>
        </div>
      `;
      document.getElementById('detail-meta').innerHTML = html;
    }

    function setMainTab(tab) {
      G_MAINTAB = tab;
      renderLeadDetail();
    }

    function renderStageBar() {
      const displayBuckets = BUCKETS.filter(b => b !== 'Lost');
      const idx = BUCKETS.indexOf(currentLead.bucket);
      let html = '<div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom: 24px;"><div class="sangam-tracker-box" style="margin-bottom:0; flex:1;"><div class="tracker-row">';
      
      displayBuckets.forEach((st, i) => {
        // Original index of this step in BUCKETS
        const origIdx = BUCKETS.indexOf(st);
        let isDone = origIdx < idx;
        let isCurrent = origIdx === idx;
        let isLost = currentLead.bucket === 'Lost';
        
        let classes = 'tracker-step';
        if(isDone && !isLost) classes += ' done';
        if(isCurrent) {
           classes += ' active';
        }
        
        html += `
          <div class="${classes}" style="cursor:default;">
            ${st}
          </div>
        `;
      });
      html += '</div></div>';
      
      if (!currentLead.isLost) {
        html += `<button class="btn btn-ghost" style="color:#EF4444; border:1px solid #EF4444; margin-left:16px; padding:12px 16px; border-radius:8px; font-weight:600;" onclick="openLostModal()">Mark as Lost</button>`;
      }
      html += '</div>';
      
      if (currentLead.isLost && currentLead.lostMetadata) {
        let lm = currentLead.lostMetadata;
        html += `
          <div style="background:#FEF2F2; border:1px solid #FCA5A5; border-radius:8px; padding:16px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <div style="color:#991B1B; font-weight:700; font-size:16px; margin-bottom:8px;">Lead Marked as Lost</div>
              <div style="font-size:13px; color:#7F1D1D; margin-bottom:4px;"><strong>Reason:</strong> ${lm.reason} (${lm.category})</div>
              <div style="font-size:13px; color:#7F1D1D; margin-bottom:4px;"><strong>Remarks:</strong> ${lm.remarks}</div>
              <div style="font-size:12px; color:#991B1B; margin-top:8px;">Marked by ${lm.agent} on ${lm.timestamp}</div>
            </div>
            ${lm.allowReopen ? `<button class="btn btn-primary" style="background:#EF4444; border-color:#EF4444; padding:8px 16px; font-size:13px;" onclick="reopenLead()">Reopen Lead</button>` : ''}
          </div>
        `;
      }
      
      return html;
    }

    function transitionLeadState(newStatus, newSubStatus, remarks, followUpDate, pendingWith) {
      const l = currentLead;
      const oldBucket = l.bucket;
      const oldStatus = l.status;
      
      l.status = newStatus;
      l.subStatus = newSubStatus;
      if (followUpDate) l.followUpDate = followUpDate;
      
      // Auto Bucket Transitions based on Backend Mapping PRD
      // Auto Bucket Transitions based on Backend Mapping PRD
      if (newStatus === 'Not Connected') l.bucket = 'New';
      if (newStatus === 'Call Back' || newStatus === 'Interested') l.bucket = 'Contacted';
      if (newStatus === 'Quote Generated' || newStatus === 'Quote Shared' || newStatus === 'Payment Link Shared' || (newStatus === 'Payment Done' && newSubStatus !== 'Payment Verified')) l.bucket = 'Quote';
      if ((newStatus === 'Payment Done' && newSubStatus === 'Payment Verified') || newStatus === 'Documents' || newStatus === 'Medical' || newStatus === 'Approval' || (newStatus === 'Policy Issuance' && newSubStatus !== 'Issued')) l.bucket = 'Processing';
      if ((newStatus === 'Policy Issuance' && newSubStatus === 'Issued') || newStatus === 'Active' || newStatus === 'Freelook' || newStatus === 'Payout') l.bucket = 'Policy Issued';
      if (newStatus === 'Not Interested' || newStatus === 'Lost') l.bucket = 'Lost';

      if (oldBucket !== l.bucket) {
        l.log.unshift({ dot: 'var(--primary)', text: `Lead moved to ${l.bucket}`, time: 'Just now' });
      }
      
      let logText = ``;
      if (newStatus === 'Not Connected') {
        logText = `Call Attempted<br>Reason: ${l.subStatus}`;
      } else if (newStatus === 'Call Back') {
        logText = `Customer contacted.<br>Status: Call Back<br>Reason: ${l.subStatus}`;
      } else if (newStatus === 'Interested') {
        logText = `Customer interested in insurance.`;
      } else if (newStatus === 'Quote Generated') {
        logText = `Quote Generated. Proceeding with Product Selection.`;
      } else if (newStatus === 'Quote Shared') {
        logText = `Quote Shared.<br>Reason: ${l.subStatus}`;
      } else if (newStatus === 'Payment Done' && newSubStatus === 'Payment Verified') {
        logText = `Payment Proof Uploaded and Verified. Lead moved to Processing.`;
      } else if (newStatus === 'Not Interested' || newStatus === 'Lost') {
        logText = `Lead marked Lost<br>Reason: ${l.subStatus || l.status}`;
      } else {
        logText = `Status updated to ${l.status}`;
        if (l.subStatus) logText += `<br>Reason: ${l.subStatus}`;
      }
      
      if (followUpDate) logText += `<br>Follow-up scheduled: ${followUpDate}`;
      if (remarks) logText += `<br>Remark: ${remarks}`;
      l.log.unshift({ dot: '#10B981', text: logText, time: 'Just now' });
      
      // Auto-progress status if bucket change requires it to avoid confusing states
      if (newStatus === 'Payment Done' && newSubStatus === 'Payment Verified') {
         l.status = 'Documents';
         l.subStatus = 'Pending';
         l.log.unshift({ dot: 'var(--primary)', text: 'System Auto-Update: Status progressed to Documents (Pending)', time: 'Just now' });
      } else if (newStatus === 'Policy Issuance' && newSubStatus === 'Issued') {
         l.status = 'Active';
         l.subStatus = 'Policy Shared';
         l.log.unshift({ dot: 'var(--primary)', text: 'System Auto-Update: Status progressed to Active', time: 'Just now' });
      }
      
      showToast('Lead state updated successfully');
      renderLeadDetail(); // Re-render everything to apply new state
    }

    function renderLeftSidebar() {
      const sections = [
        {name: 'Insurance Details', state: 'Pending'},
        {name: 'Customer Details', state: 'Complete'},
        {name: 'Income Details', state: 'Pending'},
        {name: 'Property Details', state: 'Pending'},
        {name: 'Nominee Details', state: 'Missing'},
        {name: 'Health Screening', state: 'Pending'}
      ];
      
      let html = `
        <div class="card" style="padding: 24px 16px; border:none; box-shadow:0 4px 15px rgba(0,0,0,0.05); background:var(--white); border-radius:12px;">
          <div style="font-weight:700; margin-bottom:16px; font-size:16px;">Application Data</div>
          <div style="display:flex; flex-direction:column; gap:4px;">
      `;
      
      sections.forEach(sec => {
        let isActive = G_SECTION === sec.name;
        let color = '';
        if(sec.state === 'Complete') { color = 'var(--success)'; }
        else if(sec.state === 'Pending') { color = 'var(--warning)'; }
        else { color = 'var(--text-placeholder)'; } // using grey for missing/not started

        html += `
          <div class="nav-section ${isActive ? 'active' : ''}" style="display:flex; align-items:center; gap:12px; padding:12px 8px; cursor:pointer;" onclick="setSection('${sec.name}')">
            <div style="width:10px; height:10px; border-radius:50%; background:var(--primary);"></div>
            <div style="${isActive ? 'font-weight:600;' : ''}">${sec.name}</div>
          </div>
        `;
      });
      html += `
          </div>
        </div>
      `;

      document.getElementById('detail-left').innerHTML = html;
    }


    function renderAccordion(stageName, contentHtml) {
        let isExpanded = window.accordionState[stageName] || false;
        let color = '#473391';
        if(stageName==='Contacted') color='#2563EB';
        if(stageName==='Quote') color='#D97706';
        if(stageName==='Payment Done') color='#10B981';
        
        let expandedClass = isExpanded ? 'expanded' : '';
        return `
            <div class="accordion-section">
                <div class="accordion-header" onclick="toggleAccordion('${stageName}')">
                    <div class="accordion-header-left">
                        <div class="accordion-header-icon" style="background: ${color};"></div>
                        <div class="accordion-header-title">${stageName} Stage</div>
                        <div class="accordion-header-summary">Completed</div>
                    </div>
                    <div class="accordion-header-chevron ${expandedClass}">▾</div>
                </div>
                <div class="accordion-content ${expandedClass}">
                    ${contentHtml}
                </div>
            </div>
        `;
    }

    function renderCenterPanel() {
      const l = currentLead;
      let stages = ['New', 'Contacted', 'Quote', 'Payment Done', 'Policy Issued'];
      let currentIdx = stages.indexOf(l.bucket);
      if(currentIdx === -1) currentIdx = 0;
      
      let stageHtml = stages.map((s, idx) => {
        let isActive = idx === currentIdx;
        let isCompleted = idx < currentIdx;
        let bg = 'white'; let text = '#9CA3AF'; let border = '1px solid #E5E7EB';
        if(isActive) { bg = '#473391'; text = 'white'; border = '1px solid #473391'; }
        else if (isCompleted) { bg = '#F0EEFB'; text = '#473391'; border = '1px solid #F0EEFB'; }
        let chevron = `<div style="background: ${bg}; color: ${text}; border: ${border}; border-radius: 4px; padding: 6px 14px; font-size: 12px; font-weight: 600;">${s}</div>`;
        let arrow = idx < stages.length - 1 ? `<div style="color: #D1D5DB; margin: 0 8px; font-weight: 700;">></div>` : '';
        return chevron + arrow;
      }).join('');
      
      let centerContent = '';
      
      if (currentLead.status === 'Lost') {
          for (let i = 0; i <= currentIdx; i++) {
              if (stages[i] === 'New') centerContent += renderAccordion('New', renderNewStage(false));
              if (stages[i] === 'Contacted') centerContent += renderAccordion('Contacted', renderContactedStage(true));
              if (stages[i] === 'Quote') centerContent += renderAccordion('Quote', renderQuoteStage(true));
              if (stages[i] === 'Payment Done') centerContent += renderAccordion('Payment Done', renderPaymentDoneStage(true));
          }
          centerContent += `<div style="padding: 24px; text-align: center; color: #C0392B; font-weight: 600; background: #FEF2F2; border-radius: 8px; margin-top: 16px;">This lead was marked as Lost.</div>`;
      } else {
          for (let i = 0; i < currentIdx; i++) {
              if (stages[i] === 'New') centerContent += renderAccordion('New', renderNewStage(false));
              if (stages[i] === 'Contacted') centerContent += renderAccordion('Contacted', renderContactedStage(true));
              if (stages[i] === 'Quote') centerContent += renderAccordion('Quote', renderQuoteStage(true));
              if (stages[i] === 'Payment Done') centerContent += renderAccordion('Payment Done', renderPaymentDoneStage(true));
          }
          
          let activeContent = '';
          if (l.bucket === 'New') { activeContent = renderNewStage(false); } 
          else if (l.bucket === 'Contacted') activeContent = renderContactedStage(false);
          else if (l.bucket === 'Quote') activeContent = renderQuoteStage(false);
          else if (l.bucket === 'Payment Done') activeContent = renderPaymentDoneStage(false);
          else if (l.bucket === 'Policy Issued') activeContent = renderPolicyStage();
          centerContent += activeContent;
      }



      let activeTab = currentLead.activeTab || 'Insurance Details';
      
      let html = '';
      if (activeTab === 'Insurance Details') {
        html = `
          <div style="background: white; border-bottom: 1px solid #E5E7EB; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
            <div style="display: flex; align-items: center;">
              ${stageHtml}
            </div>
            ${currentLead.status === 'Lost' 
               ? `<button style="border: 1.5px solid #10B981; color: white; background: #10B981; border-radius: 6px; padding: 7px 16px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="reopenLead()">Reopen Lead</button>`
               : `<button style="border: 1.5px solid #C0392B; color: #C0392B; background: white; border-radius: 6px; padding: 7px 16px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="openLostModal()">Mark as Lost</button>`
            }
          </div>
          <div style="flex: 1; overflow-y: auto; padding: 24px; background: #FAFAFA;">
            ${centerContent}
          </div>
        `;
      } else {
        html = `
          <div style="flex: 1; overflow-y: auto; padding: 24px; background: #FAFAFA;">
            ${getRightPanelTabContent(activeTab)}
          </div>
        `;
      }
      
      document.getElementById('detail-center').innerHTML = html;

    }

    function renderOutreachStage(isReadOnly = false) {
      return `
        <div class="card" style="padding:32px; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.05); border:none; margin: 24px auto; max-width:500px;">
          <div class="label" style="color:var(--primary); margin-bottom:16px;">📞 First Contact Action</div>
          <div style="width:80px; height:80px; border-radius:50%; background:var(--primary-light); color:var(--primary); display:flex; align-items:center; justify-content:center; font-size:32px; margin:0 auto 16px;">${currentLead.name.charAt(0)}</div>
          <div style="font-size:24px; font-weight:700; margin-bottom:4px;">${currentLead.name}</div>
          <div style="font-size:32px; font-weight:800; color:var(--text-heading); margin-bottom:12px;">
            ${currentLead.phone}
            ${isReadOnly ? '' : `<button class="btn btn-ghost btn-small" style="margin-left:8px; vertical-align:middle;" onclick="showToast('Number copied')">Copy</button>`}
          </div>
          <div style="background:var(--bg); border-radius:8px; padding:12px; margin-bottom:24px; display:inline-block;">
            <div style="font-size:12px; color:var(--text-muted);">Recommended Product</div>
            <div style="font-weight:700; color:var(--primary);">${getProductLabel(currentLead.finalProduct || currentLead.initialProduct)} • ${formatLakhs(currentLead.si)} Cover</div>
          </div>
          
          <div style="font-size:14px; color:var(--text-muted); margin-bottom:24px;">
            Please use the Right Panel to update the first contact status.
          </div>
        </div>
      `;
    }

    function renderInterestStage() {
      let desc = '';
      let prod = currentLead.finalProduct || currentLead.initialProduct;
      if(prod === 'lp') desc = "Loan protection covers the home loan EMI in case of critical illness or accidents. Pitch it as securing their family's future so the loan doesn't become a burden.";
      else if(prod === 'property') desc = 'Property insurance protects the physical structure of the home against fire, theft, and natural disasters. Essential for a new asset.';
      else if(prod === 'cl') desc = 'Credit life insurance pays off the outstanding loan balance in case of death. Peace of mind for the co-borrower.';
      else if(prod === 'term') desc = 'Term plan offers comprehensive life cover for the family at affordable premiums.';

      return `
        <div class="card" style="padding:32px; border:none; box-shadow:0 4px 15px rgba(0,0,0,0.05); margin-top:24px;">
          <div style="display:flex; gap:12px; align-items:center; margin-bottom:24px;">
            <div style="width:48px; height:48px; border-radius:8px; background:var(--primary-light); color:var(--primary); display:flex; align-items:center; justify-content:center; font-size:24px;">💡</div>
            <div>
              <div class="label" style="color:var(--primary);">Pitch Guidance</div>
              <h2 style="margin:0;">Recommended: ${getProductLabel(prod)}</h2>
            </div>
          </div>
          
          <div style="background:#FAFAFA; border-left:4px solid var(--primary); padding:16px; border-radius:0 8px 8px 0; margin-bottom:32px;">
            <p style="font-size:14px; line-height:1.6; color:var(--text-body); margin:0;">${desc}</p>
          </div>

          <div style="font-size:14px; color:var(--text-muted); margin-bottom:24px;">
            Please use the Right Panel to update the ongoing status (e.g. Follow-Up, Interested, Not Interested).
          </div>
        </div>
      `;
    }

    // Placeholders for the rest
    function setQuoteTab(tab) { G_Q_TAB = tab; renderCenterPanel(); }
    function setLPCalc(k, v) { G_LPC[k] = v; renderCenterPanel(); }

    function calculateLP() {
      const age = currentLead.age || 30;
      const si = currentLead.si || 5000000;
      const siL = si / 100000;
      const tIdx = G_LPC.ten - 1;

      // CARE Calc
      let careRows = [];
      let carePre = 0;
      if (G_LPC.plan === 'PA + CI') {
        let band = CARE_RATES.ci_pa.find(b => {
          let parts = b.band.split('-');
          return age >= parseInt(parts[0]) && age <= parseInt(parts[1]);
        }) || CARE_RATES.ci_pa[3];
        let baseRate = band.rates[tIdx];
        let basePrem = baseRate * siL;
        carePre += basePrem;
        careRows.push({ label: 'Base Premium (PA+CI)', amt: basePrem });
      } else {
        let basePrem = CARE_RATES.pa_only * G_LPC.ten * siL;
        carePre += basePrem;
        careRows.push({ label: 'Base Premium (PA Only)', amt: basePrem });
      }

      if (G_LPC.loe) { carePre += 1250 * G_LPC.ten; careRows.push({ label: 'Loss of Employment', amt: 1250 * G_LPC.ten }); }
      if (G_LPC.vb) { carePre += 949 * G_LPC.ten; careRows.push({ label: 'Vector Borne', amt: 949 * G_LPC.ten }); }

      let careGST = carePre * 0.18;
      let carePost = carePre + careGST;
      let careComm = carePre * 0.20;

      // TATA Calc
      let tataRows = [];
      let tataPre = 0;
      if (G_LPC.plan === 'PA + CI') {
        let tataBase = TATA_RATES.ci[0].rates[tIdx] * siL;
        let tataPA = TATA_RATES.pa[tIdx] * siL;
        tataPre = tataBase + tataPA;
        tataRows.push({ label: 'GCS Plus (CI)', amt: tataBase });
        tataRows.push({ label: 'Accidental Death (PA)', amt: tataPA });
      } else {
        tataPre = TATA_RATES.pa[tIdx] * siL;
        tataRows.push({ label: 'Accidental Death (PA)', amt: tataPre });
      }
      let tataGST = tataPre * 0.18;
      let tataPost = tataPre + tataGST;
      let tataComm = tataPre * 0.18;

      G_LP = {
        care: { pre: carePre, gst: careGST, post: carePost, comm: careComm, rows: careRows },
        tata: { pre: tataPre, gst: tataGST, post: tataPost, comm: tataComm, rows: tataRows }
      };
      renderCenterPanel();
      showToast('Premiums calculated');
    }

    function shareQuote(qid) {
      if(qid) {
         let q = currentLead.quotes.find(x => x.id === qid);
         if(q) q.status = 'Shared';
      }
      document.getElementById('modalOverlay').classList.add('open');
      document.getElementById('shareModal').style.display = 'flex';
      renderCenterPanel();
    }
    function closeShareModal() {
      document.getElementById('modalOverlay').classList.remove('open');
      document.getElementById('shareModal').style.display = 'none';
    }
    function executeShare() {
      closeShareModal();
      showToast('Quote shared successfully via WhatsApp');
      currentLead.log.unshift({ dot: 'var(--primary)', text: 'Shared quote with customer via WhatsApp', time: 'Just now' });
      renderRightPanel();
    }

    function lockProduct(qid) {
      let q = currentLead.quotes.find(x => x.id === qid);
      if(!q) return;
      currentLead.productStatus = 'locked';
      currentLead.finalProduct = q.prod;
      currentLead.finalInsurer = q.insurer;
      currentLead.finalPremium = q.premium;
      
      let subStatus = q.prod === 'lp' ? q.insurer : getProductLabel(q.prod);
      transitionLeadState('Quote Shared', 'Payment Link shared', '', '', '');
      showToast('Product locked. Payment link generated.');
    }

    function setProductTab(prod) {
      G_PRODUCT_TAB = prod;
      G_LP = null;
      renderCenterPanel();
    }

    function addQuoteToHistory(insurer, cov, premium) {
      if(!currentLead.quotes) currentLead.quotes = [];
      let qid = 'Q-' + Math.floor(Math.random()*10000);
      currentLead.quotes.push({
        id: qid,
        prod: G_PRODUCT_TAB,
        insurer: insurer,
        cov: cov,
        premium: premium,
        status: 'Generated'
      });
      currentLead.log.unshift({dot: 'var(--primary)', text: `Quote generated for ${getProductLabel(G_PRODUCT_TAB)} (${insurer})`, time: 'Just now'});
      showToast('Quote added to history');
      renderCenterPanel();
    }

    function renderLPGenerator() {
      let pill = (v) => `<div class="chip ${G_LPC.ten===v?'active':''}" onclick="setLPCalc('ten', ${v})">${v} Yr</div>`;
      let planBtn = (v) => `<button class="btn ${G_LPC.plan===v?'btn-primary':'btn-ghost'}" style="flex:1;" onclick="setLPCalc('plan', '${v}')">${v}</button>`;

      let inputCol = `
        <div style="flex:1; border-right:1px solid var(--border); padding-right:24px;">
          <div style="display:flex; gap:12px; margin-bottom:16px;">
            <div style="flex:1;">
              <label style="font-size:11px; font-weight:600; color:var(--text-muted); display:block; margin-bottom:4px;">Age</label>
              <input type="text" class="form-control" style="font-weight:600;" value="${currentLead.age || ''}" readonly>
            </div>
            <div style="flex:1;">
              <label style="font-size:11px; font-weight:600; color:var(--text-muted); display:block; margin-bottom:4px;">Loan Amount</label>
              <input type="text" class="form-control" style="font-weight:600;" value="${currentLead.si || ''}" readonly>
            </div>
          </div>
          
          <div style="margin-bottom:16px;">
            <label style="font-size:11px; font-weight:600; color:var(--text-muted); display:block; margin-bottom:4px;">Tenure</label>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">${pill(1)}${pill(2)}${pill(3)}${pill(4)}${pill(5)}</div>
          </div>

          <div style="margin-bottom:24px;">
            <label style="font-size:11px; font-weight:600; color:var(--text-muted); display:block; margin-bottom:4px;">Plan</label>
            <div style="display:flex; gap:12px;">${planBtn('PA Only')}${planBtn('PA + CI')}</div>
          </div>

          <div style="background:var(--bg); border-radius:8px; padding:16px; margin-bottom:24px; border:1px solid var(--border);">
            <div style="font-weight:600; color:#EA580C; margin-bottom:12px; font-size:11px; text-transform:uppercase;">CARE Add-ons</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <div>Loss of Employment <span style="color:var(--text-muted); font-size:11px;">(+₹1,250/yr)</span></div>
              <input type="checkbox" ${G_LPC.loe?'checked':''} onchange="setLPCalc('loe', this.checked)">
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>Vector Borne Diseases <span style="color:var(--text-muted); font-size:11px;">(+₹949/yr)</span></div>
              <input type="checkbox" ${G_LPC.vb?'checked':''} onchange="setLPCalc('vb', this.checked)">
            </div>
          </div>

          <button class="btn btn-primary" style="width:100%;" onclick="calculateLP()">Calculate Premiums →</button>
        </div>
      `;

      let resultCol = '';
      if (!G_LP) {
         resultCol = `<div style="flex:1; padding-left:24px; display:flex; align-items:center; justify-content:center; color:var(--text-muted); background:var(--bg); border-radius:8px; text-align:center;">Select parameters and calculate to see premiums</div>`;
      } else {
         let resultCard = (brand, bg, badgeColor, d) => `
          <div class="card" style="margin-bottom:16px; box-shadow:0 2px 10px rgba(0,0,0,0.05);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <div class="badge" style="background:${bg}; color:white;">${brand}</div>
            </div>
            <table style="width:100%; margin-bottom:12px;">
              ${d.rows.map(r => `<tr><td style="padding:4px 0; font-size:12px;">${r.label}</td><td style="text-align:right; font-weight:600; font-size:12px;">${formatMoney(r.amt)}</td></tr>`).join('')}
              <tr><td style="padding:4px 0; color:var(--text-muted); font-size:12px;">GST (18%)</td><td style="text-align:right; font-size:12px;">${formatMoney(d.gst)}</td></tr>
            </table>
            <div style="display:flex; justify-content:space-between; align-items:center; padding-top:12px; border-top:1px dashed var(--border);">
              <div style="font-weight:600;">Total Premium</div>
              <div style="font-size:20px; font-weight:800; color:var(--primary);">${formatMoney(d.post)}</div>
            </div>
            <div style="display:flex; gap:8px; margin-top:16px;">
              <button class="btn btn-ghost btn-small" style="flex:1;" onclick="addQuoteToHistory('${brand}', '${G_LPC.plan}', ${d.post})">+ Add to Quotes</button>
            </div>
          </div>
        `;
        resultCol = `
          <div style="flex:1; padding-left:24px; display:flex; flex-direction:column; overflow-y:auto; max-height:500px;">
            ${resultCard('CARE Health Insurance', '#0EA5E9', 'blue', G_LP.care)}
            ${resultCard('TATA AIG General', '#F97316', 'orange', G_LP.tata)}
          </div>
        `;
      }
      return `<div style="display:flex; min-height:300px;">${inputCol}${resultCol}</div>`;
    }

    function renderNextActionWidget() {
      let actionText = '';
      if (!currentLead.selectedPlan) {
         actionText = "Generate Quote";
      } else if (!currentLead.quoteShared) {
         actionText = "Share Quote";
      } else if (!currentLead.paymentLinkGenerated) {
         actionText = "Generate Payment Link";
      } else if (!currentLead.paymentVerified) {
         actionText = "Verify payment";
      } else {
         actionText = "Move to Processing";
      }

      return `
        <div style="position:sticky; top:24px; background:#EFF6FF; border:1px solid #BFDBFE; border-radius:8px; padding:16px;">
          <div style="font-size:11px; font-weight:700; color:#1D4ED8; margin-bottom:4px; text-transform:uppercase;">Next Action</div>
          <div style="font-weight:600; font-size:16px; color:#1E3A8A;">${actionText}</div>
        </div>
      `;
    }

    function shareQuoteAction(method) {
      currentLead.quoteShared = true;
      if (method !== 'Copy Link') {
        transitionLeadState('Quote Shared', '', `Quote shared via ${method}`, '', '');
      }
      showToast('Quote Shared');
      renderLeadDetail();
    }

    function generatePaymentLink() {
      currentLead.paymentLinkGenerated = true;
      transitionLeadState('Payment Link Shared', '', `Payment link generated`, '', '');
      showToast('Payment Link Generated');
      renderLeadDetail();
    }

    function sharePayAction(method) {
      if (method !== 'Copy Link') currentLead.log.unshift({dot:'#10B981', text:`Payment link shared via ${method}`, time:'Just now'});
      showToast('Payment Link Shared');
      renderLeadDetail();
    }




    window.handleNewStageTabClick = function(tabKey) {
        currentLead.newStageActiveTab = tabKey;
        renderLeadDetail();
        
        // Show saving after render
        let savingEl = document.getElementById('new-stage-saving');
        if (savingEl) {
            savingEl.innerHTML = 'Saving...';
            setTimeout(() => {
                savingEl.innerHTML = '<span style="color:#10B981;">✓ Saved</span>';
                setTimeout(() => {
                    savingEl.innerHTML = '';
                }, 2000);
            }, 600);
        }
    };



    window.handleGenerateQuoteFromNew = function() {
        // Move to Contacted
        currentLead.bucket = 'Contacted';
        
        let tab = currentLead.newStageActiveTab || currentLead.finalProduct || currentLead.initialProduct || 'lp';
        const TABS = { 'lp': 'Loan Protection', 'property': 'Property Insurance', 'cl': 'Credit Life', 'term': 'Term Plan' };
        
        addActivity('System', 'Quote generation initiated from NEW stage', `Product: ${TABS[tab] || tab}`, 'Just now');
        
        renderLeadDetail();
    };


    window.updateNewStageCompletion = function() {
        let tab = currentLead.newStageActiveTab || currentLead.finalProduct || currentLead.initialProduct || 'lp';
        let reqCount = 0;
        let filledCount = 0;
        
        if (tab === 'lp') { reqCount = 2; } 
        else if (tab === 'property') { reqCount = 4; } 
        else if (tab === 'cl' || tab === 'term') { reqCount = 6; }
        
        let ind = document.getElementById('new-stage-completion');
        if (ind) {
            ind.innerHTML = `<span style="color:#9CA3AF;">${filledCount} of ${reqCount} fields filled</span>`;
        }
        
        let btn = document.getElementById('new-stage-generate-btn');
        if (btn) {
            // For mockup purposes, let's just make it active if we want, or active if reqCount == filledCount.
            // Let's assume all fields are filled for the demo, so it's always active.
            let isComplete = true; // Hardcoded true for mockup demo, or could use logic
            if (isComplete) {
                btn.style.background = '#473391';
                btn.style.cursor = 'pointer';
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            } else {
                btn.style.background = '#C5C0F5';
                btn.style.cursor = 'not-allowed';
                btn.style.opacity = '0.6';
                btn.style.pointerEvents = 'none';
            }
        }
    };





    window.handleGenerateQuoteFromContacted = function() {
        let tabBox = document.getElementById('new-stage-content');
        let inputs = tabBox.querySelectorAll('input:not([readonly]), select:not([readonly])');
        let isValid = true;
        
        inputs.forEach(inp => {
            if (inp.type === 'radio' || inp.type === 'checkbox') return; // skip for mockup simplicity
            let valContainer = inp.nextElementSibling;
            if (valContainer && valContainer.className === 'val-err') {
                valContainer.remove();
            }
            if (!inp.value || inp.value === 'Select...') {
                isValid = false;
                let err = document.createElement('div');
                err.className = 'val-err';
                err.style = 'font-size: 11px; color: #C0392B; margin-top: 4px;';
                err.innerText = 'This field is required';
                inp.parentNode.appendChild(err);
                inp.style.borderColor = '#C0392B';
            } else {
                inp.style.borderColor = '#E5E7EB';
            }
        });

        if (isValid) {
            let tab = currentLead.newStageActiveTab || currentLead.finalProduct || currentLead.initialProduct || 'lp';
            const TABS = { 'lp': 'Loan Protection', 'property': 'Property Insurance', 'cl': 'Credit Life', 'term': 'Term Plan' };
            currentLead.contactedShowResults = true;
            addActivity('System', 'Quotes generated', `Product: ${TABS[tab] || tab}`, 'Just now');
            renderLeadDetail();
        }
    };
    
    window.handleShareQuote = function(method, quoteInfo = 'CARE Health Insurance', premium = 12500) {
        showToast('Quote shared successfully');
        currentLead.bucket = 'Quote';
        currentLead.status = 'Quote Shared';
        currentLead.subStatus = 'Consent Pending';
        let formattedPrem = typeof premium === 'number' ? formatMoney(premium) : premium;
        addActivity('System', 'Quote shared with customer', `${quoteInfo} · ${formattedPrem} · via ${method}`, 'Just now');
        renderLeadDetail();
        renderRightPanel();
    };

    let currentShareQuoteInfo = null;
    let currentSharePremium = null;
    let isShareAll = false;

    window.toggleSharePopup = function(event, quoteInfo, premium, shareAll = false) {
        event.stopPropagation();
        currentShareQuoteInfo = quoteInfo;
        currentSharePremium = premium;
        isShareAll = shareAll;
        
        let popup = document.getElementById('quote-share-popup');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'quote-share-popup';
            popup.style.cssText = "display: none; position: absolute; z-index: 1000; background: white; border: 1px solid #E5E7EB; border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); padding: 8px; width: 200px; box-sizing: border-box; font-family: Poppins;";
            document.body.appendChild(popup);
        }
        
        popup.innerHTML = `
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; padding: 4px 8px; margin-bottom: 4px; letter-spacing: 0.05em;">Share via</div>
          <div style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 6px; cursor: pointer; transition: background 0.15s; user-select: none;" onmouseenter="this.style.background='#F9FAFB'" onmouseleave="this.style.background='transparent'" onclick="executeShareAction('WhatsApp')">
            <div style="width: 24px; height: 24px; border-radius: 50%; background: #25D366; color: white; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">WA</div>
            <div style="font-size: 13px; font-weight: 600; color: #111827;">WhatsApp</div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 6px; cursor: pointer; transition: background 0.15s; user-select: none;" onmouseenter="this.style.background='#F9FAFB'" onmouseleave="this.style.background='transparent'" onclick="executeShareAction('Email')">
            <div style="width: 24px; height: 24px; border-radius: 50%; background: #EA4335; color: white; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">@</div>
            <div style="font-size: 13px; font-weight: 600; color: #111827;">Email</div>
          </div>
        `;
        
        let rect = event.currentTarget.getBoundingClientRect();
        popup.style.top = (window.scrollY + rect.bottom + 8) + 'px';
        popup.style.left = (window.scrollX + rect.left + rect.width / 2 - 100) + 'px';
        
        if (popup.style.display === 'block') {
            popup.style.display = 'none';
        } else {
            popup.style.display = 'block';
        }
    };

    window.executeShareAction = function(channel) {
        let popup = document.getElementById('quote-share-popup');
        if (popup) popup.style.display = 'none';
        
        if (!currentLead.sharedQuotes) currentLead.sharedQuotes = [];
        
        if (isShareAll) {
            let activeTab = currentLead.newStageActiveTab || currentLead.finalProduct || currentLead.initialProduct || 'lp';
            if (activeTab === 'lp') {
                currentLead.sharedQuotes = ['CARE Health', 'TATA AIG'];
            } else if (activeTab === 'property') {
                currentLead.sharedQuotes = ['HDFC Ergo', 'Bajaj Allianz'];
            } else {
                currentLead.sharedQuotes = ['PB Partners'];
            }
            handleShareQuote(channel, 'All Quotes', 'Multiple Premiums');
        } else {
            let insurer = currentShareQuoteInfo.split('•')[0].split('·')[0].trim();
            if (!currentLead.sharedQuotes.includes(insurer)) {
                currentLead.sharedQuotes.push(insurer);
            }
            handleShareQuote(channel, currentShareQuoteInfo, currentSharePremium);
        }
    };

    document.addEventListener('click', function(event) {
        let popup = document.getElementById('quote-share-popup');
        if (popup && popup.style.display === 'block') {
            popup.style.display = 'none';
        }
    });
    
    window.handleOpenPB = function() {
        showToast('Saving details and opening PolicyBazaar...');
        currentLead.contactedShowPBStep2 = true;
        renderLeadDetail();
        window.open('https://partners.policybazaar.com', '_blank');
    };
    
    window.handleExtractPBQuotes = function() {
        showToast('Extracting quotes via AI...');
        setTimeout(() => {
            currentLead.contactedPBQuotesExtracted = true;
            renderLeadDetail();
        }, 1500);
    };

        function renderQuotesSection(activeTab) {
      if (activeTab === 'lp') {
          return `
          <div style="margin-top: 24px;">
            <div style="font-size: 13px; font-weight: 700; color: #111827;">Generated Quotes</div>
            <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 12px;">CARE Health & TATA AIG · Based on details filled above</div>
            
            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
                <!-- CARE Health Redesigned Card -->
                ${(function() {
                    let termVal = (currentLead.lpTenure || '5 Yrs').replace(' Yr', ' Y').replace('s', '');
                    let addonCount = 0;
                    if (currentLead.lpAddonEmi) addonCount++;
                    if (currentLead.lpAddonLoe) addonCount++;
                    if (currentLead.lpAddonSdh) addonCount++;
                    
                    return `
                    <div class="lp-quote-card" style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 12px; width: 100%; box-sizing: border-box;">
                      <!-- Row 1: Insurer Header -->
                      <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; border-radius: 6px; border: 1px solid #F3F4F6; background: white; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; padding: 2px; box-sizing: border-box;">
                          🏥
                        </div>
                        <div style="font-size: 15px; font-weight: 700; color: #111827;">CARE Health • Group Credit Protect Plus</div>
                      </div>
                      <hr style="border: none; border-top: 1px solid #F3F4F6; margin: 4px 0;">
                      
                      <!-- Row 2: 3 Data Points -->
                      <div style="display: flex; width: 100%; margin-bottom: 4px;">
                        <div style="flex: 1; border-right: 1px solid #F3F4F6; padding-right: 12px;">
                          <div style="font-size: 11px; color: #9CA3AF;">Insured value</div>
                          <div style="font-size: 14px; font-weight: 700; color: #111827; margin-top: 2px;">₹${formatLakhs(currentLead.si)}</div>
                        </div>
                        <div style="flex: 1; border-right: 1px solid #F3F4F6; padding-left: 12px; padding-right: 12px;">
                          <div style="font-size: 11px; color: #9CA3AF;">Policy term</div>
                          <div style="font-size: 14px; font-weight: 700; color: #111827; margin-top: 2px;">${termVal}</div>
                        </div>
                        <div style="flex: 1; padding-left: 12px;">
                          <div style="font-size: 11px; color: #9CA3AF;">Add-on(s)</div>
                          <div style="font-size: 14px; font-weight: 700; color: #111827; margin-top: 2px;">${addonCount}</div>
                        </div>
                      </div>
                      
                      <!-- Row 3: Premium + Share Quote Button -->
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                        <div>
                          <div style="font-size: 11px; color: #9CA3AF;">Total premium</div>
                          <div style="font-size: 22px; font-weight: 700; color: #473391; margin-top: 2px;">₹36,553</div>
                        </div>
                        <button class="share-quote-btn" style="border: 1.5px solid #473391; color: #473391; background: white; border-radius: 20px; font-size: 13px; font-weight: 600; padding: 9px 20px; cursor: pointer; outline: none; transition: all 0.2s;" onmouseenter="this.style.background='#F0EEFB'" onmouseleave="this.style.background='white'" onclick="toggleSharePopup(event, 'CARE Health • Group Credit Protect Plus', 36553)">
                          Share Quote
                        </button>
                      </div>
                      
                      <!-- Row 4: Bottom Info Row -->
                      <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #F3F4F6; margin-top: 4px;">
                        <div style="font-size: 12px; color: #473391; text-decoration: underline; cursor: pointer;" onclick="showToast('Brochure downloaded successfully'); window.open('https://ambak.in/brochure/loan-protection.pdf', '_blank');">
                          Policy brochure ↓
                        </div>
                        <div style="font-size: 12px; font-weight: 600; color: #1A7A4A;">
                          You will earn ₹5,483
                        </div>
                      </div>
                    </div>
                    `;
                })()}

                <!-- TATA AIG Redesigned Card -->
                ${(function() {
                    let termVal = (currentLead.lpTenure || '5 Yrs').replace(' Yr', ' Y').replace('s', '');
                    let addonCount = 0;
                    if (currentLead.lpAddonEmi) addonCount++;
                    if (currentLead.lpAddonLoe) addonCount++;
                    if (currentLead.lpAddonSdh) addonCount++;
                    
                    return `
                    <div class="lp-quote-card" style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 12px; width: 100%; box-sizing: border-box;">
                      <!-- Row 1: Insurer Header -->
                      <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; border-radius: 6px; border: 1px solid #F3F4F6; background: white; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; padding: 2px; box-sizing: border-box;">
                          🛡️
                        </div>
                        <div style="font-size: 15px; font-weight: 700; color: #111827;">TATA AIG • Home Guard Shield</div>
                      </div>
                      <hr style="border: none; border-top: 1px solid #F3F4F6; margin: 4px 0;">
                      
                      <!-- Row 2: 3 Data Points -->
                      <div style="display: flex; width: 100%; margin-bottom: 4px;">
                        <div style="flex: 1; border-right: 1px solid #F3F4F6; padding-right: 12px;">
                          <div style="font-size: 11px; color: #9CA3AF;">Insured value</div>
                          <div style="font-size: 14px; font-weight: 700; color: #111827; margin-top: 2px;">₹${formatLakhs(currentLead.si)}</div>
                        </div>
                        <div style="flex: 1; border-right: 1px solid #F3F4F6; padding-left: 12px; padding-right: 12px;">
                          <div style="font-size: 11px; color: #9CA3AF;">Policy term</div>
                          <div style="font-size: 14px; font-weight: 700; color: #111827; margin-top: 2px;">${termVal}</div>
                        </div>
                        <div style="flex: 1; padding-left: 12px;">
                          <div style="font-size: 11px; color: #9CA3AF;">Add-on(s)</div>
                          <div style="font-size: 14px; font-weight: 700; color: #111827; margin-top: 2px;">${addonCount}</div>
                        </div>
                      </div>
                      
                      <!-- Row 3: Premium + Share Quote Button -->
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                        <div>
                          <div style="font-size: 11px; color: #9CA3AF;">Total premium</div>
                          <div style="font-size: 22px; font-weight: 700; color: #473391; margin-top: 2px;">₹45,620</div>
                        </div>
                        <button class="share-quote-btn" style="border: 1.5px solid #473391; color: #473391; background: white; border-radius: 20px; font-size: 13px; font-weight: 600; padding: 9px 20px; cursor: pointer; outline: none; transition: all 0.2s;" onmouseenter="this.style.background='#F0EEFB'" onmouseleave="this.style.background='white'" onclick="toggleSharePopup(event, 'TATA AIG • Home Guard Shield', 45620)">
                          Share Quote
                        </button>
                      </div>
                      
                      <!-- Row 4: Bottom Info Row -->
                      <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #F3F4F6; margin-top: 4px;">
                        <div style="font-size: 12px; color: #473391; text-decoration: underline; cursor: pointer;" onclick="showToast('Brochure downloaded successfully'); window.open('https://ambak.in/brochure/loan-protection.pdf', '_blank');">
                          Policy brochure ↓
                        </div>
                        <div style="font-size: 12px; font-weight: 600; color: #1A7A4A;">
                          You will earn ₹6,843
                        </div>
                      </div>
                    </div>
                    `;
                })()}
            </div>
            
            <div style="position: relative; width: 100%;">
                <button style="width: 100%; padding: 10px; border: 1.5px solid #473391; background: white; color: #473391; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: Poppins; transition: all 0.2s;" onmouseenter="this.style.background='#F0EEFB'" onmouseleave="this.style.background='white'" onclick="toggleSharePopup(event, 'All Quotes', 'Multiple Premiums', true)">
                  Share All Quotes
                </button>
            </div>
          </div>`;
      } else {
          if (currentLead.contactedShowPBStep2) {
              let pbHtml = `
                <div style="margin-top: 24px;">
                  <div style="background: #FFFBEB; border: 1px solid #FCD34D; border-radius: 8px; padding: 12px; color: #92400E; font-size: 12px; font-weight: 500; margin-bottom: 16px;">
                    PolicyBazaar opened in a new tab. Take a screenshot of the quotes list and upload below.
                  </div>
                  
                  <div style="border: 2px dashed #D1D5DB; border-radius: 12px; padding: 32px; text-align: center; background: white; margin-bottom: 16px;">
                    <div style="font-size: 24px; margin-bottom: 12px;">📸</div>
                    <div style="font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 4px;">Upload Quotes Screenshot</div>
                    <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 16px;">Paste (Cmd+V) or click to browse</div>
                    <button style="background: #473391; color: white; border: none; border-radius: 6px; padding: 8px 16px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="handleExtractPBQuotes()">Extract Quotes with AI</button>
                  </div>`;
              
              if (currentLead.contactedPBQuotesExtracted) {
                  pbHtml += `
                    <div style="margin-bottom: 16px;">
                      <div style="font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 12px;">Extracted Quotes</div>
                      <div style="border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px; background: white; margin-bottom: 12px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" checked style="width: 16px; height: 16px;">
                                <div style="width: 40px; height: 40px; border-radius: 50%; background: #F3F4F6; display: flex; align-items: center; justify-content: center; font-size: 20px;">🛡️</div>
                                <div>
                                    <div style="font-size: 13px; font-weight: 700; color: #111827;">HDFC Ergo</div>
                                    <div style="font-size: 11px; color: #9CA3AF;">Home Shield Plus</div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 18px; font-weight: 700; color: #473391;">₹4,200</div>
                                <div style="font-size: 10px; color: #9CA3AF;">one-time premium</div>
                            </div>
                        </div>
                        <hr style="border: none; border-top: 1px solid #E5E7EB; margin-bottom: 12px;">
                        <div style="display: flex; gap: 8px;">
                            <button style="flex: 1; height: 32px; background: #E6F4ED; color: #1A7A4A; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="handleShareQuote('WhatsApp')">WhatsApp</button>
                            <button style="flex: 1; height: 32px; background: #FDECEA; color: #C0392B; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="handleShareQuote('Email')">Email</button>
                        </div>
                      </div>
                      
                      <div style="border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px; background: white; margin-bottom: 12px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" style="width: 16px; height: 16px;">
                                <div style="width: 40px; height: 40px; border-radius: 50%; background: #F3F4F6; display: flex; align-items: center; justify-content: center; font-size: 20px;">🏢</div>
                                <div>
                                    <div style="font-size: 13px; font-weight: 700; color: #111827;">Bajaj Allianz</div>
                                    <div style="font-size: 11px; color: #9CA3AF;">My Home Insurance</div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 18px; font-weight: 700; color: #473391;">₹380</div>
                                <div style="font-size: 10px; color: #9CA3AF;">monthly premium</div>
                            </div>
                        </div>
                        <hr style="border: none; border-top: 1px solid #E5E7EB; margin-bottom: 12px;">
                        <div style="display: flex; gap: 8px;">
                            <button style="flex: 1; height: 32px; background: #E6F4ED; color: #1A7A4A; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="handleShareQuote('WhatsApp')">WhatsApp</button>
                            <button style="flex: 1; height: 32px; background: #FDECEA; color: #C0392B; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="handleShareQuote('Email')">Email</button>
                        </div>
                      </div>
                      
                      <button style="width: 100%; padding: 10px; border: none; background: #473391; color: white; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;" onclick="handleShareQuote('WhatsApp')">Share Selected Quotes</button>
                    </div>`;
              }
              pbHtml += `</div>`;
              return pbHtml;
          } else {
              return `
              <div style="margin-top: 24px; background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px;">
                <div style="font-size: 13px; font-weight: 700; color: #111827;">Ready to generate quotes on PolicyBazaar</div>
                <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 14px;">The details below will be pre-filled on PolicyBazaar</div>
                
                <div style="background: #F9FAFB; border-radius: 6px; padding: 10px 14px; font-size: 12px; color: #4B5563;">
                  ${activeTab === 'property' 
                    ? 'City: Mumbai · Type: Flat · Market Value: ₹6500000 · Household Items: ₹1500000'
                    : 'DOB: 1985-06-15 · Gender: Male · Income: 10L–25L · Employment: Salaried · Tobacco: No'
                  }
                </div>
                
                <button style="width: 100%; height: 44px; background: #473391; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; margin-top: 16px; cursor: pointer;" onclick="handleOpenPB()">
                  Open PolicyBazaar Workspace →
                </button>
              </div>`;
          }
      }
    }


    window.renderProductTabsUI = function(isContacted, isReadOnly = false) {
      let isLinked = true; 
      
      let inputClass = isReadOnly ? 'new-form-input form-readonly' : 'new-form-input new-stage-track';
      let clickEvent = isReadOnly ? 'pointer-events:none;' : 'cursor:pointer;';
      let disabledAttr = isReadOnly ? 'disabled' : '';
      let readonlyAttr = isReadOnly ? 'readonly' : '';
      
      let activeTab = currentLead.newStageActiveTab || currentLead.finalProduct || currentLead.initialProduct || 'lp';
      if (!currentLead.lpTenure) currentLead.lpTenure = '5 Yrs';
      
      let hlIndicator = '';
      
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
              <div style="font-size: 11px; color: #9CA3AF;">Required for CARE Health & TATA AIG quote generation</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div>
                <label style="${labelStyle}">DATE OF BIRTH *</label>
                <input type="date" style="${inputStyle}" ${readonlyAttr} value="1985-06-15">
              </div>
              <div style="position: relative;">
                <label style="${labelStyle}">LOAN AMOUNT ${hlBadge}</label>
                <input type="text" value="₹ ${formatLakhs(currentLead.si)}" style="${lockedStyle}" readonly>
                ${lockIcon}
              </div>
            </div>
            
            <!-- TENURE FIELD -->
            <div style="margin-bottom: 14px; grid-column: span 2;">
                <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 5px; display: block;">TENURE *</label>
                <div style="display: flex; gap: 8px; margin-top: 4px;">
                  ${['1 Yr', '2 Yrs', '3 Yrs', '4 Yrs', '5 Yrs'].map(t => {
                      let isSel = (currentLead.lpTenure || '5 Yrs') === t;
                      let pillStyle = isSel 
                          ? 'background: #473391; color: white; border: 1.5px solid #473391; border-radius: 20px; padding: 7px 18px; font-size: 12px; font-weight: 600; cursor: pointer;'
                          : 'border: 1.5px solid #E5E7EB; background: white; color: #6B7280; border-radius: 20px; padding: 7px 18px; font-size: 12px; font-weight: 600; cursor: pointer;';
                      if (isReadOnly) pillStyle += ' pointer-events: none; opacity: 0.8;';
                      return `<div style="${pillStyle}" onclick="toggleCustomRadio('lpTenure', '${t}')">${t}</div>`;
                  }).join('')}
                </div>
            </div>
            <div style="margin-bottom: 14px; grid-column: span 2;">
                <label style="${labelStyle}">PLAN TYPE *</label>
                <div style="display: flex; gap: 8px; margin-top: 4px;">
                  <div style="background: #473391; color: white; border: 1.5px solid #473391; border-radius: 20px; padding: 7px 20px; font-size: 12px; font-weight: 600;">PA Only</div>
                  <div style="background: white; color: #6B7280; border: 1.5px solid #E5E7EB; border-radius: 20px; padding: 7px 20px; font-size: 12px; font-weight: 600;">PA + CI</div>
                </div>
            </div>
            <div style="grid-column: span 2;">
              <label style="${labelStyle}">ADD-ONS (OPTIONAL)</label>
              <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 8px;">
                <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #111827; font-weight: 500;">
                  <input type="checkbox" style="width: 16px; height: 16px;" ${disabledAttr} ${currentLead.lpAddonEmi ? 'checked' : ''} onclick="toggleCustomCheckbox('lpAddonEmi')"> EMI Protection
                </label>
                <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #111827; font-weight: 500;">
                  <input type="checkbox" style="width: 16px; height: 16px;" ${disabledAttr} ${currentLead.lpAddonLoe ? 'checked' : ''} onclick="toggleCustomCheckbox('lpAddonLoe')"> Loss of Employment
                </label>
                <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #111827; font-weight: 500;">
                  <input type="checkbox" style="width: 16px; height: 16px;" ${disabledAttr} ${currentLead.lpAddonSdh ? 'checked' : ''} onclick="toggleCustomCheckbox('lpAddonSdh')"> Seasonal Disease Hospitalisation
                </label>
              </div>
            </div>
          `;
      } else if (activeTab === 'property') {
          reqCount = 4;
          contentHtml = `
            <div style="margin-bottom: 16px;">
              <div style="font-size: 13px; font-weight: 700; color: #111827;">Property Insurance Details</div>
              <div style="font-size: 11px; color: #9CA3AF;">Required for PolicyBazaar quote generation</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div>
                <label style="${labelStyle}">CITY *</label>
                <input type="text" placeholder="Enter city" style="${inputStyle}" ${readonlyAttr} value="Mumbai">
              </div>
              <div>
                <label style="${labelStyle}">PROPERTY TYPE *</label>
                <select style="${inputStyle}" ${disabledAttr}>
                  <option selected>Flat</option><option>Independent House</option>
                </select>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div>
                <label style="${labelStyle}">MARKET VALUE *</label>
                <input type="number" placeholder="₹ Market value" style="${inputStyle}" ${readonlyAttr} value="6500000">
              </div>
              <div>
                <label style="${labelStyle}">HOUSEHOLD ITEMS VALUE *</label>
                <input type="number" placeholder="₹ Household items value" style="${inputStyle}" ${readonlyAttr} value="1500000">
              </div>
            </div>
          `;
      } else if (activeTab === 'cl' || activeTab === 'term') {
          reqCount = 6;
          let title = activeTab === 'cl' ? 'Credit Life Details' : 'Term Plan Details';
          contentHtml = `
            <div style="margin-bottom: 16px;">
              <div style="font-size: 13px; font-weight: 700; color: #111827;">${title}</div>
              <div style="font-size: 11px; color: #9CA3AF;">Required for PolicyBazaar quote generation</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div>
                <label style="${labelStyle}">DATE OF BIRTH *</label>
                <input type="date" style="${inputStyle}" ${readonlyAttr} value="1985-06-15">
              </div>
              <div>
                <label style="${labelStyle}">GENDER *</label>
                <div style="display: flex; gap: 8px; margin-top: 4px;">
                  <div style="background: #473391; color: white; border: 1.5px solid #473391; border-radius: 20px; padding: 7px 20px; font-size: 12px; font-weight: 600;">Male</div>
                  <div style="background: white; color: #6B7280; border: 1.5px solid #E5E7EB; border-radius: 20px; padding: 7px 20px; font-size: 12px; font-weight: 600;">Female</div>
                </div>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div>
                <label style="${labelStyle}">EDUCATIONAL QUALIFICATION *</label>
                <select style="${inputStyle}" ${disabledAttr}>
                  <option>Below 10th</option><option>10th</option><option>12th</option><option selected>Graduate</option><option>Post Graduate</option>
                </select>
              </div>
              <div>
                <label style="${labelStyle}">ANNUAL INCOME *</label>
                <select style="${inputStyle}" ${disabledAttr}>
                  <option>Below 5L</option><option>5L–10L</option><option selected>10L–25L</option><option>25L–50L</option><option>50L+</option>
                </select>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div>
                <label style="${labelStyle}">EMPLOYMENT TYPE *</label>
                <select style="${inputStyle}" ${disabledAttr}>
                  <option selected>Salaried</option><option>Self Professional</option>
                </select>
              </div>
              <div>
                <label style="${labelStyle}">SMOKES OR CHEW TOBACCO? *</label>
                <div style="display: flex; gap: 8px; margin-top: 4px;">
                  <div style="background: #E6F4ED; color: #1A7A4A; border: 1.5px solid #1A7A4A; border-radius: 20px; padding: 7px 20px; font-size: 12px; font-weight: 600;">No</div>
                  <div style="background: white; color: #6B7280; border: 1.5px solid #E5E7EB; border-radius: 20px; padding: 7px 20px; font-size: 12px; font-weight: 600;">Yes</div>
                </div>
              </div>
            </div>
          `;
      }
      
      let btnAction = isContacted ? 'handleGenerateQuoteFromContacted()' : 'handleGenerateQuoteFromNew()';
      
      let tabBox = `
        <div id="new-stage-content" style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin-top: 12px; position: relative;">
          <div id="new-stage-saving" style="position: absolute; right: 20px; top: 20px; font-size: 10px; color: #9CA3AF; font-weight: 600;"></div>
          ${contentHtml}
          <div style="display: flex; flex-direction: column; align-items: flex-end;">
              <div id="new-stage-completion" style="margin-top: 16px; font-size: 11px; color: #9CA3AF; margin-bottom: 20px;">
                 ${reqCount} of ${reqCount} fields filled
              </div>
          </div>
          ${isReadOnly ? '' : `
          <button id="new-stage-generate-btn" style="width: 100%; height: 44px; background: #473391; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;" onclick="${btnAction}">
            Generate Quote →
          </button>`}
        </div>
      `;
      
      return `
        <div style="margin-bottom: 24px;">
          ${tabsHtml}
          ${tabBox}
        </div>
      `;
    }

    function renderNewStage(isReadOnly = false) {
        return renderProductTabsUI(false, isReadOnly);
    }
    
    function renderContactedStage(isReadOnly = false) {
        let activeTab = currentLead.newStageActiveTab || currentLead.finalProduct || currentLead.initialProduct || 'lp';
      if (!currentLead.lpTenure) currentLead.lpTenure = '5 Yrs';
        return renderQuotesSection(activeTab);
    }

    function renderLostStage() {
      return `
        <div style="background:var(--white); border-radius:12px; padding:32px; box-shadow:0 4px 15px rgba(0,0,0,0.05); text-align:center; margin-top:24px; border-top:4px solid #EF4444;">
          <h2 style="font-size:24px; color:#EF4444; margin:0 0 8px;">Lead Closed (Lost)</h2>
          <div style="font-size:16px; color:var(--text-muted); margin-bottom:24px;">This lead is read-only. No further actions can be taken.</div>
          <div style="background:#FEF2F2; border-radius:8px; padding:16px; text-align:left; border:1px solid #FCA5A5; max-width:400px; margin:0 auto;">
            <div style="font-weight:600; color:#991B1B; margin-bottom:8px;">Lost Summary</div>
            <div style="font-size:14px; margin-bottom:4px;"><strong>Reason:</strong> ${currentLead.subStatus || 'Not specified'}</div>
            <div style="font-size:14px; margin-bottom:4px;"><strong>By:</strong> Verification Agent</div>
            <div style="font-size:14px;"><strong>Last Product:</strong> ${getProductLabel(currentLead.finalProduct || currentLead.initialProduct)}</div>
          </div>
        </div>
      `;
    }



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

    function renderSharedQuotesInQuoteStage() {
        let activeTab = currentLead.newStageActiveTab || currentLead.finalProduct || currentLead.initialProduct || 'lp';
        let selectedIndex = currentLead.selectedPlanIndex;
        let hasSelection = (typeof selectedIndex === 'number' && selectedIndex !== null);
        
        let plans = [];
        if (activeTab === 'lp') {
            plans = [
                { insurer: 'CARE Health', plan: 'Group Credit Protect Plus', emoji: '🏥', premium: 36553, commission: 5483 },
                { insurer: 'TATA AIG', plan: 'Home Guard Shield', emoji: '🛡️', premium: 45620, commission: 6843 }
            ];
        } else if (activeTab === 'property') {
            plans = [
                { insurer: 'HDFC Ergo', plan: 'Home Shield Plus', emoji: '🛡️', premium: 4200, commission: 630 },
                { insurer: 'Bajaj Allianz', plan: 'My Home Insurance', emoji: '🏢', premium: 4560, commission: 684 }
            ];
        } else {
            plans = [
                { insurer: 'PB Partners', plan: 'Term Protect Plan', emoji: '🛡️', premium: 8500, commission: 1275 }
            ];
        }
        
        let html = `
          <div style="margin-bottom: 24px; font-family: Poppins;">
            <div style="font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 2px;">Shared Quotes</div>
            <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 12px;">Select the plan the customer agreed to by clicking Share Payment Link</div>
            
            <div style="display: flex; flex-direction: column; gap: 12px;">
        `;
        
        if (hasSelection) {
            // Render selected card first
            let p = plans[selectedIndex];
            let termVal = (currentLead.lpTenure || '5 Yrs').replace(' Yr', ' Y').replace('s', '');
            let addonCount = 0;
            if (currentLead.lpAddonEmi) addonCount++;
            if (currentLead.lpAddonLoe) addonCount++;
            if (currentLead.lpAddonSdh) addonCount++;
            
            html += `
              <div>
                <div style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 12px; width: 100%; box-sizing: border-box; position: relative;">
                  <div style="background: #E6F4ED; color: #1A7A4A; font-size: 11px; font-weight: 700; padding: 6px 16px; border-radius: 12px 12px 0 0; margin: -18px -18px 0 -18px;">
                    ✓ Customer Selected
                  </div>
                  <!-- Row 1: Insurer Header -->
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 40px; height: 40px; border-radius: 6px; border: 1px solid #F3F4F6; background: white; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; padding: 2px; box-sizing: border-box;">
                      ${p.emoji}
                    </div>
                    <div style="font-size: 15px; font-weight: 700; color: #111827;">${p.insurer} • ${p.plan}</div>
                  </div>
                  <hr style="border: none; border-top: 1px solid #F3F4F6; margin: 4px 0;">
                  
                  <!-- Row 2: 3 Data Points -->
                  <div style="display: flex; width: 100%; margin-bottom: 4px;">
                    <div style="flex: 1; border-right: 1px solid #F3F4F6; padding-right: 12px;">
                      <div style="font-size: 11px; color: #9CA3AF;">Insured value</div>
                      <div style="font-size: 14px; font-weight: 700; color: #111827; margin-top: 2px;">₹${formatLakhs(currentLead.si)}</div>
                    </div>
                    <div style="flex: 1; border-right: 1px solid #F3F4F6; padding-left: 12px; padding-right: 12px;">
                      <div style="font-size: 11px; color: #9CA3AF;">Policy term</div>
                      <div style="font-size: 14px; font-weight: 700; color: #111827; margin-top: 2px;">${termVal}</div>
                    </div>
                    <div style="flex: 1; padding-left: 12px;">
                      <div style="font-size: 11px; color: #9CA3AF;">Add-on(s)</div>
                      <div style="font-size: 14px; font-weight: 700; color: #111827; margin-top: 2px;">${addonCount}</div>
                    </div>
                  </div>
                  
                  <!-- Premium + Earnings -->
                  <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 12px; border-top: 1px solid #F3F4F6;">
                    <div>
                      <div style="font-size: 11px; color: #9CA3AF;">Total premium</div>
                      <div style="font-size: 20px; font-weight: 700; color: #473391; margin-top: 2px;">${formatMoney(p.premium)}</div>
                    </div>
                    <div style="font-size: 12px; font-weight: 600; color: #1A7A4A;">
                      You will earn ${formatMoney(p.commission)}
                    </div>
                  </div>
                </div>
                \${(currentLead.bucket === 'Quote') ? `
                <div style="text-align: center; margin-top: 8px;">
                  <span style="font-size: 11px; color: #473391; cursor: pointer; text-decoration: underline; font-weight: 600;" onclick="handleResetPlanSelection(event)">Change Selection</span>
                </div>
                ` : ''}
              </div>
            `;
            
            // Render non-selected cards as collapsed rows below
            plans.forEach((p, idx) => {
                if (idx === selectedIndex) return;
                html += `
                  <div style="display: flex; align-items: center; justify-content: space-between; height: 44px; padding: 0 16px; border: 1px solid #E5E7EB; border-radius: 8px; background: white; opacity: 0.4; box-sizing: border-box; width: 100%;">
                    <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; flex: 1;">
                      <div style="width: 24px; height: 24px; border-radius: 4px; border: 1px solid #F3F4F6; background: white; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; padding: 1px; box-sizing: border-box;">
                        ${p.emoji}
                      </div>
                      <div style="font-size: 13px; font-weight: 700; color: #111827; overflow: hidden; text-overflow: ellipsis;">${p.insurer} • ${p.plan}</div>
                    </div>
                    <div style="font-size: 13px; font-weight: 700; color: #473391; margin-left: 12px; flex-shrink: 0;">
                      ${formatMoney(p.premium)}
                    </div>
                  </div>
                `;
            });
        } else {
            // Render all cards normally (expanded)
            plans.forEach((p, idx) => {
                let termVal = (currentLead.lpTenure || '5 Yrs').replace(' Yr', ' Y').replace('s', '');
                let addonCount = 0;
                if (currentLead.lpAddonEmi) addonCount++;
                if (currentLead.lpAddonLoe) addonCount++;
                if (currentLead.lpAddonSdh) addonCount++;
                
                let buttonStyle = "width: 100%; height: 42px; border: 1.5px solid #473391; color: #473391; background: white; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: Poppins;";
                
                html += `
                  <div>
                    <div style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 12px; width: 100%; box-sizing: border-box;">
                      <!-- Row 1: Insurer Header -->
                      <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; border-radius: 6px; border: 1px solid #F3F4F6; background: white; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; padding: 2px; box-sizing: border-box;">
                          ${p.emoji}
                        </div>
                        <div style="font-size: 15px; font-weight: 700; color: #111827;">${p.insurer} • ${p.plan}</div>
                      </div>
                      <hr style="border: none; border-top: 1px solid #F3F4F6; margin: 4px 0;">
                      
                      <!-- Row 2: 3 Data Points -->
                      <div style="display: flex; width: 100%; margin-bottom: 4px;">
                        <div style="flex: 1; border-right: 1px solid #F3F4F6; padding-right: 12px;">
                          <div style="font-size: 11px; color: #9CA3AF;">Insured value</div>
                          <div style="font-size: 14px; font-weight: 700; color: #111827; margin-top: 2px;">₹${formatLakhs(currentLead.si)}</div>
                        </div>
                        <div style="flex: 1; border-right: 1px solid #F3F4F6; padding-left: 12px; padding-right: 12px;">
                          <div style="font-size: 11px; color: #9CA3AF;">Policy term</div>
                          <div style="font-size: 14px; font-weight: 700; color: #111827; margin-top: 2px;">${termVal}</div>
                        </div>
                        <div style="flex: 1; padding-left: 12px;">
                          <div style="font-size: 11px; color: #9CA3AF;">Add-on(s)</div>
                          <div style="font-size: 14px; font-weight: 700; color: #111827; margin-top: 2px;">${addonCount}</div>
                        </div>
                      </div>
                      
                      <!-- Premium + Earnings -->
                      <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 12px; border-top: 1px solid #F3F4F6;">
                        <div>
                          <div style="font-size: 11px; color: #9CA3AF;">Total premium</div>
                          <div style="font-size: 20px; font-weight: 700; color: #473391; margin-top: 2px;">${formatMoney(p.premium)}</div>
                        </div>
                        <div style="font-size: 12px; font-weight: 600; color: #1A7A4A;">
                          You will earn ${formatMoney(p.commission)}
                        </div>
                      </div>
                      
                      <!-- CTA Button -->
                      <button style="${buttonStyle}" onmouseenter="this.style.background='#F0EEFB'" onmouseleave="this.style.background='white'" onclick="handleSelectPlan(${idx}, '${p.insurer}', '${p.plan}', ${p.premium})">
                        Share Payment Link
                      </button>
                    </div>
                  </div>
                `;
            });
        }
        
        html += `
            </div>
          </div>
        `;
        return html;
    }

    window.handleSendForVerification = function() {
        let amt = currentLead.ocrPaymentAmount;
        let txid = currentLead.ocrTransactionId;
        let dt = currentLead.ocrPaymentDate;
        
        if (!amt || !txid || !dt) {
            alert("Please ensure all three OCR fields are filled.");
            return;
        }
        
        currentLead.paymentOcrSubmitted = true;
        currentLead.paymentOcrSubmittedTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        currentLead.paymentVerificationFailed = false; // Reset failure state on new submission
        
        currentLead.status = 'Payment Done';
        currentLead.subStatus = 'Verification Pending';
        
        let agentName = (window.IBM_ROLE === 'Manager') ? 'IBM Manager' : 'IBM Agent';
        addActivity('Agent Update', `${agentName} · Payment proof submitted for verification`, `Amount: ₹${formatMoney(amt)} · UTR: ${txid}`, 'Just now');
        
        renderLeadDetail();
        renderRightPanel();
    };

    window.handleMarkAsVerified = function() {
        currentLead.bucket = 'Payment Done';
        currentLead.status = 'Payment Done';
        currentLead.subStatus = 'Verified';
        currentLead.productStatus = 'locked';
        
        let managerName = (window.IBM_ROLE === 'Manager') ? 'IBM Manager' : 'IBM Agent';
        let amt = currentLead.ocrPaymentAmount;
        let txid = currentLead.ocrTransactionId;
        
        addActivity('System Update', `IBM Manager · ${managerName} · Payment verified`, `₹${formatMoney(amt)} · UTR: ${txid}`, 'Just now');
        
        showToast('Payment verified. Lead moved to Payment Done.');
        
        renderLeadDetail();
        renderRightPanel();
    };

    window.handleVerificationFailedClick = function() {
        currentLead.showVerificationFailureForm = true;
        renderLeadDetail();
    };

    window.handleFailureReasonChange = function(val) {
        let customDiv = document.getElementById('ocr-failure-custom-reason-wrapper');
        if (customDiv) {
            customDiv.style.display = val === 'Other' ? 'block' : 'none';
        }
    };

    window.handleConfirmVerificationFailure = function() {
        let select = document.getElementById('ocr-failure-reason-select');
        let reason = select.value;
        if (reason === 'Other') {
            let customInput = document.getElementById('ocr-failure-custom-reason');
            reason = customInput ? customInput.value.trim() : 'Other';
        }
        
        if (!reason) {
            alert("Please specify a failure reason.");
            return;
        }
        
        currentLead.bucket = 'Quote';
        currentLead.status = 'Payment Done';
        currentLead.subStatus = 'Verification Failed';
        
        currentLead.uploadedProofFile = null;
        currentLead.ocrExtracted = false;
        currentLead.ocrPaymentAmount = null;
        currentLead.ocrTransactionId = null;
        currentLead.ocrPaymentDate = null;
        currentLead.paymentOcrSubmitted = false;
        currentLead.showVerificationFailureForm = false;
        
        currentLead.paymentVerificationFailed = true;
        currentLead.paymentVerificationFailureReason = reason;
        
        let managerName = (window.IBM_ROLE === 'Manager') ? 'IBM Manager' : 'IBM Agent';
        addActivity('System Update', `IBM Manager · ${managerName} · Payment verification failed`, `Reason: ${reason}`, 'Just now');
        
        showToast('Verification failed. Agent notified to re-submit.', false);
        
        renderLeadDetail();
        renderRightPanel();
    };

        function renderPaymentCardInQuoteStage() {
        let selectedInsurer = currentLead.selectedInsurerName;
        if (!selectedInsurer) return '';
        
        let activeTab = currentLead.newStageActiveTab || currentLead.finalProduct || currentLead.initialProduct || 'lp';
        let insurerName = currentLead.finalInsurer || 'CARE Health';
        
        let isLp = activeTab === 'lp';
        let helperText = isLp 
            ? 'Get this link from the CARE / TATA WhatsApp group' 
            : 'Get this link from the PolicyBazaar payment screen';
            
        let linkValue = currentLead.paymentLinkValue || '';
        let isLinkShared = currentLead.paymentLinkShared || false;
        
        let inputWrapperHtml = `
          <div style="position: relative; width: 100%;">
            <input type="text" id="quote-pay-link-input" placeholder="Paste payment link from insurer portal" value="${linkValue}" ${isLinkShared ? 'readonly' : ''} style="width: 100%; height: 40px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; font-family: Poppins; padding: 0 12px; padding-right: 36px; box-sizing: border-box; outline: none; transition: border-color 0.2s; ${isLinkShared ? 'background: #F9FAFB; color: #4B5563;' : ''}" onfocus="this.style.borderColor='#473391'" onblur="this.style.borderColor='#E5E7EB'" oninput="handlePaymentLinkInput(this.value)">
            ${isLinkShared ? `<span style="position: absolute; right: 12px; top: 11px; color: #10B981; font-weight: bold; font-size: 14px;">✓</span>` : ''}
          </div>
        `;
        
        let buttonsHtml = '';
        if (isLinkShared) {
            buttonsHtml = `
              <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px;">
                <span style="font-size: 11px; color: #473391; cursor: pointer; text-decoration: underline; font-weight: 600;" onclick="handleSharePaymentLink('WhatsApp', true)">Resend link</span>
              </div>
            `;
        } else {
            let btnOpacity = linkValue.trim() ? '1' : '0.4';
            let btnCursor = linkValue.trim() ? 'pointer' : 'not-allowed';
            let btnDisabled = linkValue.trim() ? '' : 'disabled';
            
            buttonsHtml = `
              <div style="display: flex; gap: 10px; margin-top: 12px; width: 100%;">
                <button id="quote-pay-wa-btn" ${btnDisabled} style="background: #25D366; color: white; border-radius: 8px; height: 40px; flex: 1; font-size: 13px; font-weight: 700; border: none; cursor: ${btnCursor}; opacity: ${btnOpacity}; transition: all 0.2s; font-family: Poppins;" onclick="handleSharePaymentLink('WhatsApp')">Send via WhatsApp</button>
                <button id="quote-pay-em-btn" ${btnDisabled} style="background: #EA4335; color: white; border-radius: 8px; height: 40px; flex: 1; font-size: 13px; font-weight: 700; border: none; cursor: ${btnCursor}; opacity: ${btnOpacity}; transition: all 0.2s; font-family: Poppins;" onclick="handleSharePaymentLink('Email')">Send via Email</button>
              </div>
            `;
        }
        
        let failureNoticeHtml = '';
        if (currentLead.paymentVerificationFailed) {
            failureNoticeHtml = `
              <div style="font-size: 12px; color: #C0392B; background: #FDECEA; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-weight: 500;">
                Verification failed: ${currentLead.paymentVerificationFailureReason}. Please re-upload the correct payment proof.
              </div>
            `;
        }
        
        let verificationHtml = '';
        if (!currentLead.uploadedProofFile) {
            verificationHtml = `
              ${failureNoticeHtml}
              <div onclick="triggerProofUploadClick()" style="border: 2px dashed #C5C0F5; border-radius: 8px; padding: 24px; text-align: center; cursor: pointer; background: #FAFAFA; transition: background 0.2s;" onmouseenter="this.style.background='#F5F3FD'" onmouseleave="this.style.background='#FAFAFA'">
                <div style="font-size: 24px; margin-bottom: 8px;">↑</div>
                <div style="font-size: 12px; font-weight: 600; color: #6B7280; margin-bottom: 2px;">Click to upload or drag and drop</div>
                <div style="font-size: 11px; color: #9CA3AF;">Screenshot, Image or PDF · Max 5MB</div>
              </div>
              <input type="file" id="proof-file-input" accept="image/png, image/jpeg, application/pdf" style="display: none;" onchange="handleProofUpload(this.files)">
            `;
        } else {
            let f = currentLead.uploadedProofFile;
            let isSubmitted = currentLead.paymentOcrSubmitted || false;
            let showRemoveBtn = !isSubmitted;
            
            let previewHtml = `
              <div style="display: flex; align-items: center; justify-content: space-between; background: #F0EEFB; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 16px;">📄</span>
                  <div style="font-size: 12px; color: #473391; font-weight: 600;">${f.name} <span style="font-size: 10px; color: #9CA3AF; font-weight: normal;">(${f.size})</span></div>
                </div>
                ${showRemoveBtn ? `<span style="font-size: 14px; color: #6B7280; cursor: pointer; font-weight: bold; user-select: none;" onclick="handleRemoveProof()">✕</span>` : ''}
              </div>
            `;
            
            let actionBtnHtml = '';
            if (currentLead.ocrLoading) {
                actionBtnHtml = `
                  <style>
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    .ocr-spinner { width: 14px; height: 14px; border: 2px solid #C5C0F5; border-top: 2px solid #473391; border-radius: 50%; animation: spin 0.8s linear infinite; }
                  </style>
                  <button disabled style="width: 100%; height: 40px; border: 1.5px solid #E5E7EB; color: #9CA3AF; background: #F9FAFB; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: not-allowed; display: flex; align-items: center; justify-content: center; gap: 8px; font-family: Poppins;">
                    <span class="ocr-spinner"></span> Extracting...
                  </button>
                `;
            } else if (!currentLead.ocrExtracted) {
                actionBtnHtml = `
                  <button style="width: 100%; height: 40px; border: 1.5px solid #473391; color: #473391; background: white; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: Poppins;" onmouseenter="this.style.background='#F0EEFB'" onmouseleave="this.style.background='white'" onclick="handleExtractOcrDetails()">
                    Extract Details with AI
                  </button>
                `;
            } else {
                let isFieldsReadOnly = isSubmitted;
                let isManager = (window.IBM_ROLE === 'Manager');
                
                let fieldsHtml = `
                  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 14px;">
                    <div>
                      <label style="font-size: 10px; font-weight: 700; color: #9CA3AF; display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                        PAYMENT AMOUNT <span style="background: #EEF0FD; color: #473391; font-size: 9px; font-weight: 700; border-radius: 3px; padding: 1px 4px;">OCR</span>
                      </label>
                      <input type="number" id="ocr-amount-input" value="${currentLead.ocrPaymentAmount || ''}" ${isFieldsReadOnly ? 'readonly disabled' : ''} style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; background: #F9FAFB; padding: 0 8px; box-sizing: border-box; outline: none; transition: all 0.2s; font-family: Poppins; ${isFieldsReadOnly ? 'background: #F9FAFB; color: #4B5563;' : ''}" onfocus="this.style.borderColor='#473391'; this.style.background='white'" onblur="this.style.borderColor='#E5E7EB'; this.style.background='#F9FAFB'" oninput="currentLead.ocrPaymentAmount=this.value; checkOcrFields()">
                    </div>
                    <div>
                      <label style="font-size: 10px; font-weight: 700; color: #9CA3AF; display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                        TRANSACTION ID <span style="background: #EEF0FD; color: #473391; font-size: 9px; font-weight: 700; border-radius: 3px; padding: 1px 4px;">OCR</span>
                      </label>
                      <input type="text" id="ocr-txid-input" value="${currentLead.ocrTransactionId || ''}" ${isFieldsReadOnly ? 'readonly disabled' : ''} style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; background: #F9FAFB; padding: 0 8px; box-sizing: border-box; outline: none; transition: all 0.2s; font-family: Poppins; ${isFieldsReadOnly ? 'background: #F9FAFB; color: #4B5563;' : ''}" onfocus="this.style.borderColor='#473391'; this.style.background='white'" onblur="this.style.borderColor='#E5E7EB'; this.style.background='#F9FAFB'" oninput="currentLead.ocrTransactionId=this.value; checkOcrFields()">
                    </div>
                    <div>
                      <label style="font-size: 10px; font-weight: 700; color: #9CA3AF; display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                        PAYMENT DATE <span style="background: #EEF0FD; color: #473391; font-size: 9px; font-weight: 700; border-radius: 3px; padding: 1px 4px;">OCR</span>
                      </label>
                      <input type="date" id="ocr-date-input" value="${currentLead.ocrPaymentDate || ''}" ${isFieldsReadOnly ? 'readonly disabled' : ''} style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; background: #F9FAFB; padding: 0 8px; box-sizing: border-box; outline: none; transition: all 0.2s; font-family: Poppins; ${isFieldsReadOnly ? 'background: #F9FAFB; color: #4B5563;' : ''}" onfocus="this.style.borderColor='#473391'; this.style.background='white'" onblur="this.style.borderColor='#E5E7EB'; this.style.background='#F9FAFB'" oninput="currentLead.ocrPaymentDate=this.value; checkOcrFields()">
                    </div>
                  </div>
                `;
                
                let buttonBlockHtml = '';
                if (!isSubmitted) {
                    let hasValues = !!(currentLead.ocrPaymentAmount && currentLead.ocrTransactionId && currentLead.ocrPaymentDate);
                    buttonBlockHtml = `
                      <button id="ocr-verify-btn" ${hasValues ? '' : 'disabled'} style="width: 100%; height: 44px; background: ${hasValues ? '#473391' : '#C5C0F5'}; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; margin-top: 16px; cursor: ${hasValues ? 'pointer' : 'not-allowed'}; opacity: ${hasValues ? '1' : '0.6'}; transition: all 0.2s; font-family: Poppins;" onclick="handleSendForVerification()">
                        Send for Verification
                      </button>
                    `;
                } else {
                    if (!isManager) {
                        buttonBlockHtml = `
                          <div style="background: #F0EEFB; color: #473391; border: 1.5px solid #C5C0F5; border-radius: 8px; height: 44px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; margin-top: 16px; cursor: default;">
                            ✓ Sent for Verification · ${currentLead.paymentOcrSubmittedTimestamp || 'Just now'}
                          </div>
                          <div style="font-size: 11px; color: #856404; background: #FFF8E1; border-radius: 6px; padding: 8px 12px; margin-top: 8px; font-weight: 500;">
                            Awaiting IBM Manager verification. You will be notified once reviewed.
                          </div>
                        `;
                    } else {
                        // Manager View
                        let failureFormHtml = '';
                        if (currentLead.showVerificationFailureForm) {
                            failureFormHtml = `
                              <div style="margin-top: 12px; padding: 12px; border: 1.5px solid #E5E7EB; border-radius: 8px; background: #FAFAFA; text-align: left;">
                                <label style="font-size: 10px; font-weight: 700; uppercase; color: #9CA3AF; margin-bottom: 6px; display: block;">FAILURE REASON *</label>
                                <select id="ocr-failure-reason-select" style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; padding: 0 8px; font-family: Poppins; background: white;" onchange="handleFailureReasonChange(this.value)">
                                  <option value="Payment Amount Mismatch">Payment Amount Mismatch</option>
                                  <option value="Invalid UTR Number">Invalid UTR Number</option>
                                  <option value="Payment Date Incorrect">Payment Date Incorrect</option>
                                  <option value="Proof Image Unclear">Proof Image Unclear</option>
                                  <option value="Duplicate Payment">Duplicate Payment</option>
                                  <option value="Other">Other</option>
                                </select>
                                <div id="ocr-failure-custom-reason-wrapper" style="display: none; margin-top: 8px;">
                                  <input type="text" id="ocr-failure-custom-reason" placeholder="Enter custom reason..." style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; padding: 0 8px; box-sizing: border-box; font-family: Poppins; background: white;">
                                </div>
                                <button style="width: 100%; height: 40px; background: #C0392B; color: white; border-radius: 8px; font-size: 13px; font-weight: 700; margin-top: 10px; border: none; cursor: pointer;" onclick="handleConfirmVerificationFailure()">
                                  Confirm Failure
                                </button>
                              </div>
                            `;
                        }
                        
                        buttonBlockHtml = `
                          <div style="background: #F0EEFB; color: #473391; border: 1.5px solid #C5C0F5; border-radius: 8px; height: 44px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; margin-top: 16px; cursor: default; margin-bottom: 16px;">
                            ✓ Sent for Verification · ${currentLead.paymentOcrSubmittedTimestamp || 'Just now'}
                          </div>
                          
                          <div style="text-align: left;">
                            <label style="font-size: 10px; font-weight: 700; uppercase; color: #9CA3AF; margin-bottom: 10px; display: block; letter-spacing: 0.05em;">VERIFICATION DECISION</label>
                            <div style="display: flex; gap: 10px;">
                              <button style="background: #1A7A4A; color: white; border-radius: 8px; height: 42px; flex: 1; font-size: 13px; font-weight: 700; border: none; cursor: pointer;" onclick="handleMarkAsVerified()">Mark as Verified</button>
                              <button style="border: 1.5px solid #C0392B; color: #C0392B; background: white; border-radius: 8px; height: 42px; flex: 1; font-size: 13px; font-weight: 600; cursor: pointer;" onclick="handleVerificationFailedClick()">Verification Failed</button>
                            </div>
                            ${failureFormHtml}
                          </div>
                        `;
                    }
                }
                
                actionBtnHtml = fieldsHtml + buttonBlockHtml;
            }
            
            verificationHtml = previewHtml + actionBtnHtml;
        }
        
        let showChangeSelection = (currentLead.bucket === 'Quote');
        
        return `
          <!-- Section 2: Payment Card with slide-down animation wrapper -->
          <div style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; margin-top: 16px; transition: max-height 0.35s ease-in-out; animation: slideDown 0.3s ease-out; font-family: Poppins; text-align: left;">
            <style>
              @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
              }
            </style>
            
            <!-- Card Header -->
            <div style="padding: 14px 18px; border-bottom: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 14px; font-weight: 700; color: #111827;">Payment</span>
              <span style="background: #F0EEFB; color: #473391; font-size: 11px; font-weight: 700; border-radius: 4px; padding: 2px 8px;">${insurerName}</span>
            </div>
            
            <!-- Card Body -->
            <div style="padding: 18px;">
              <!-- Part A: Share Payment Link -->
              <div style="margin-bottom: 20px;">
                <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 6px; display: block;">PAYMENT LINK *</label>
                ${inputWrapperHtml}
                <div style="font-size: 10px; color: #9CA3AF; margin-top: 4px;">${helperText}</div>
                ${buttonsHtml}
              </div>
              
              <hr style="border: none; border-top: 1px solid #F3F4F6; margin: 20px 0;">
              
              <!-- Part B: Payment Verification -->
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF;">PAYMENT VERIFICATION</span>
                  <span style="font-size: 10px; color: #9CA3AF; font-style: italic;">To be confirmed by IBM Manager</span>
                </div>
                
                <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-top: 14px; margin-bottom: 6px; display: block;">UPLOAD PAYMENT PROOF *</label>
                ${verificationHtml}
              </div>
            </div>
          </div>
        `;
    }

    window.handleSelectPlan = function(index, insurerName, planName, premium) {
        currentLead.selectedInsurerName = insurerName;
        currentLead.productStatus = 'locked';
        currentLead.finalInsurer = insurerName;
        currentLead.finalProduct = planName;
        
        let agentName = (window.IBM_ROLE === 'Manager') ? 'IBM Manager' : 'IBM Agent';
        addActivity('Agent Update', `Customer selected plan — ${insurerName} · ${planName} · ${formatMoney(premium)}`, '', 'Just now');
        
        renderLeadDetail();
    };

    window.handleResetPlanSelection = function(event) {
        event.stopPropagation();
        currentLead.selectedInsurerName = null;
        currentLead.productStatus = 'draft';
        currentLead.finalInsurer = 'PB Partner';
        currentLead.paymentLinkShared = false;
        currentLead.paymentLinkValue = '';
        currentLead.uploadedProofFile = null;
        currentLead.ocrExtracted = false;
        currentLead.ocrLoading = false;
        
        renderLeadDetail();
    };

    window.handlePaymentLinkInput = function(val) {
        currentLead.paymentLinkValue = val;
        let waBtn = document.getElementById('quote-pay-wa-btn');
        let emBtn = document.getElementById('quote-pay-em-btn');
        if (val.trim()) {
            if (waBtn) { waBtn.removeAttribute('disabled'); waBtn.style.opacity = '1'; waBtn.style.cursor = 'pointer'; }
            if (emBtn) { emBtn.removeAttribute('disabled'); emBtn.style.opacity = '1'; emBtn.style.cursor = 'pointer'; }
        } else {
            if (waBtn) { waBtn.setAttribute('disabled', 'true'); waBtn.style.opacity = '0.4'; waBtn.style.cursor = 'not-allowed'; }
            if (emBtn) { emBtn.setAttribute('disabled', 'true'); emBtn.style.opacity = '0.4'; emBtn.style.cursor = 'not-allowed'; }
        }
    };

    window.handleSharePaymentLink = function(method, isResend = false) {
        if (!currentLead.paymentLinkValue) return;
        
        currentLead.paymentLinkShared = true;
        showToast(isResend ? 'Payment link resent successfully' : 'Payment link sent successfully');
        
        currentLead.status = 'Payment Link Shared';
        currentLead.subStatus = 'Awaiting Payment';
        
        addActivity('System', isResend ? 'Payment link resent to customer' : 'Payment link shared with customer', `via ${method} · Link: ${currentLead.paymentLinkValue}`, 'Just now');
        
        renderLeadDetail();
        renderRightPanel();
    };

    window.triggerProofUploadClick = function() {
        document.getElementById('proof-file-input').click();
    };

    window.handleProofUpload = function(files) {
        if (!files || files.length === 0) return;
        let file = files[0];
        currentLead.uploadedProofFile = {
            name: file.name,
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
        };
        renderLeadDetail();
    };

    window.handleRemoveProof = function() {
        currentLead.uploadedProofFile = null;
        currentLead.ocrExtracted = false;
        currentLead.ocrLoading = false;
        renderLeadDetail();
    };

    window.handleExtractOcrDetails = function() {
        currentLead.ocrLoading = true;
        renderLeadDetail();
        
        setTimeout(() => {
            currentLead.ocrLoading = false;
            currentLead.ocrExtracted = true;
            
            let selectedInsurer = currentLead.selectedInsurerName;
            let activeTab = currentLead.newStageActiveTab || currentLead.finalProduct || currentLead.initialProduct || 'lp';
            let premium = 36553;
            if (activeTab === 'lp') {
                premium = (selectedInsurer === 'CARE Health') ? 36553 : 45620;
            } else {
                premium = (selectedInsurer === 'HDFC Ergo') ? 4200 : 4560;
            }
            
            currentLead.ocrPaymentAmount = premium;
            currentLead.ocrTransactionId = 'TXN' + Math.floor(Math.random() * 90000000 + 10000000);
            currentLead.ocrPaymentDate = new Date().toISOString().split('T')[0];
            
            renderLeadDetail();
        }, 1500);
    };

    window.checkOcrFields = function() {
        let amt = document.getElementById('ocr-amount-input').value;
        let txid = document.getElementById('ocr-txid-input').value;
        let date = document.getElementById('ocr-date-input').value;
        
        currentLead.ocrPaymentAmount = amt;
        currentLead.ocrTransactionId = txid;
        currentLead.ocrPaymentDate = date;
        
        let isManager = (window.IBM_ROLE === 'Manager');
        let hasValues = !!(amt && txid && date);
        
        let btn = document.getElementById('ocr-verify-btn');
        if (btn) {
            // Re-create the button behavior dynamically
            if (hasValues && isManager) {
                btn.removeAttribute('disabled');
                btn.style.background = '#1A7A4A';
                btn.style.cursor = 'pointer';
                btn.style.opacity = '1';
                // Add click handler
                btn.onclick = window.handleConfirmPaymentClick;
            } else {
                btn.setAttribute('disabled', 'true');
                btn.style.background = '#A8D5B5';
                btn.style.cursor = 'not-allowed';
                btn.style.opacity = '0.6';
                btn.onclick = null;
            }
        }
    };

    window.handleConfirmPaymentClick = function() {
        let amount = currentLead.ocrPaymentAmount;
        let txid = currentLead.ocrTransactionId;
        let date = currentLead.ocrPaymentDate;
        
        currentLead.bucket = 'Payment Done';
        currentLead.status = 'Payment Done';
        currentLead.subStatus = 'Verified';
        currentLead.productStatus = 'locked';
        
        let managerName = (window.IBM_ROLE === 'Manager') ? 'IBM Manager' : 'IBM Agent';
        addActivity('System Update', `Payment verified by ${managerName}`, `₹${amount} · UTR: ${txid} · ${date}`, 'Just now');
        
        showToast('Payment verified. Lead moved to Payment Done.');
        
        renderLeadDetail();
        renderRightPanel();
    };

        function renderQuoteStage(isReadOnly = false) {
        if (!window.IBM_ROLE) window.IBM_ROLE = 'Manager';
        
        let section1 = renderSharedQuotesInQuoteStage();
        let section2 = renderPaymentCardInQuoteStage();
        
        return `
          <div style="font-family: Poppins;">
            ${section1}
            ${section2}
          </div>
        `;
    }

    function renderPaymentStage(isReadOnly = false) {
      let inputClass = isReadOnly ? 'new-form-input form-readonly' : 'new-form-input';
      let clickEvent = isReadOnly ? 'pointer-events:none;' : 'cursor:pointer;';
      return `
        <div class="card" style="padding:32px; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.05); border:none; margin: 24px auto; max-width:500px;">
          <div style="width:64px; height:64px; border-radius:50%; background:var(--warning-bg); color:var(--warning); display:flex; align-items:center; justify-content:center; font-size:24px; margin:0 auto 16px;">⏳</div>
          <h2 style="margin-bottom:8px;">Awaiting Payment</h2>
          <div style="font-size:14px; color:var(--text-muted); margin-bottom:24px;">The payment link has been sent to the customer via SMS & Email.</div>
          
          <div style="background:#FAFAFA; border:1px solid var(--border); border-radius:8px; padding:16px; margin-bottom:24px; text-align:left;">
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; border-bottom:1px dashed var(--border); padding-bottom:12px;">
              <div style="font-size:12px; color:var(--text-muted);">Insurer</div>
              <div style="font-weight:600; font-size:12px;">CARE Health Insurance</div>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
              <div style="font-size:12px; color:var(--text-muted);">Amount</div>
              <div style="font-weight:800; font-size:16px; color:var(--primary);">${formatMoney(currentLead.si ? currentLead.si * 0.05 : 25000)}</div>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <div style="font-size:12px; color:var(--text-muted);">Link Expiry</div>
              <div style="font-weight:600; font-size:12px; color:var(--danger);">Today, 11:59 PM</div>
            </div>
          </div>
          
          <div style="display:flex; gap:12px;">
            <button class="btn btn-ghost" style="flex:1;" onclick="showToast('Payment link resent to WhatsApp')">🔁 Resend Link</button>
            <button class="btn btn-primary" style="flex:1; background:var(--success); border-color:var(--success);" onclick="gMarkPaid()">✓ Mark Paid</button>
          </div>
        </div>
      `;
    }

    function gMarkPaid() {
      currentLead.subStatus = 'Payment Received';
      currentLead.log.unshift({ dot: 'var(--success)', text: 'Payment marked as received', time: 'Just now' });
      transitionLeadState('Payment Done', 'Payment Verified', '', '', '');
    }

    function setPBStep(step, idx = -1) {
      G_PBS = step;
      if (idx !== -1) G_PBI = idx;
      renderCenterPanel();
    }

    const PB_PLANS = [
      { insurer: 'United India', price: '₹97/month', total: 11629 },
      { insurer: 'Bajaj General', price: '₹106/month', total: 12776, choice: true },
      { insurer: 'SBI General', price: '₹142/month', total: 17012 }
    ];

    function renderPBContent() {
      if (!G_PBS) G_PBS = 'quotes';

      let html = '';
      html += `
        <div style="background:var(--navy); color:white; padding:16px 24px; display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:18px; font-weight:800; display:flex; align-items:center; gap:12px;">
            <div style="width:24px; height:24px; background:white; color:var(--navy); border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:12px;">PB</div>
            PolicyBazaar Integration
          </div>
        </div>
        <div style="display:flex; flex:1; overflow:hidden;">
          <div style="flex:1; border-right:1px solid var(--border); background:#F9FAFB; display:flex; flex-direction:column; overflow-y:auto; padding:24px;">
      `;

      if (G_PBS === 'quotes') {
        html += `
            <div style="display:flex; gap:12px; margin-bottom:24px;">
              <select class="form-control" style="width:150px;"><option>10 Years</option><option>15 Years</option></select>
              <select class="form-control" style="width:150px;"><option>Const. Yr: 2023</option></select>
            </div>
            ${PB_PLANS.map((p, i) => `
              <div class="card" style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; border: ${p.choice ? '2px solid #16A34A' : '1px solid var(--border)'}; background:white;">
                <div style="flex:1;">
                  ${p.choice ? `<div class="badge" style="background:#DCFCE7; color:#16A34A; margin-bottom:8px;">✔ Recommended Choice</div>` : ''}
                  <div style="font-weight:700; font-size:16px; margin-bottom:4px; color:var(--primary);">${p.insurer}</div>
                  <div style="font-size:12px; color:var(--text-muted);">Bharat Griha Raksha • ${formatLakhs(currentLead.si)} Cover</div>
                  <a href="#" style="font-size:12px; color:#0065ff; display:inline-block; margin-top:8px;">⭐ View Coverages</a>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:22px; font-weight:800; color:var(--text-heading);">${p.price}</div>
                  <div style="font-size:11px; color:var(--text-muted); margin-bottom:12px;">₹${p.total} one-time</div>
                  <button class="btn btn-primary" onclick="setPBStep('form', ${i})">Select Plan</button>
                </div>
              </div>
            `).join('')}
        `;
      } else {
        const plan = PB_PLANS[G_PBI];
        html += `
            <div style="margin-bottom:24px;">
              <h3 style="margin-bottom:16px;">Policy Proposal Details</h3>
              <div class="card" style="background:white; border-color:var(--primary); margin-bottom:24px;">
                <div style="font-weight:700; color:var(--primary); margin-bottom:8px;">${plan.insurer}</div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:12px;">
                  <span>Building SI</span><span style="font-weight:600;">${formatLakhs(currentLead.si)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; padding-top:12px; border-top:1px dashed var(--border); font-weight:700;">
                  <span>Total Premium</span><span style="color:var(--success);">₹${plan.total}</span>
                </div>
              </div>

              <div style="display:flex; gap:12px; margin-bottom:12px;">
                <div class="form-group" style="flex:1;"><label>First Name</label><input type="text" class="form-control" value="${currentLead.name.split(' ')[0]}" readonly style="background:#F3F4F6;"></div>
                <div class="form-group" style="flex:1;"><label>Last Name</label><input type="text" class="form-control" value="${currentLead.name.split(' ')[1] || ''}" readonly style="background:#F3F4F6;"></div>
              </div>
              <div style="display:flex; gap:12px; margin-bottom:12px;">
                <div class="form-group" style="flex:1;"><label>Date of Birth</label><input type="text" class="form-control" value="05/08/1990" readonly style="background:#F3F4F6;"></div>
                <div class="form-group" style="flex:1;"><label>Email ID</label><input type="text" class="form-control" value="${currentLead.email}" readonly style="background:#F3F4F6;"></div>
              </div>
              
              <button class="btn btn-primary" style="width:100%; margin-top:24px; padding:12px;" onclick="finalizePBPlan()">Select & Import Plan into Sangam CRM</button>
              <button class="btn btn-ghost" style="width:100%; margin-top:12px;" onclick="setPBStep('quotes')">← Back to Quotes</button>
            </div>
        `;
      }

      html += `
          </div>
          <div style="width:280px; background:white; padding:24px; display:flex; flex-direction:column;">
            <div style="font-size:11px; font-weight:600; text-transform:uppercase; color:var(--text-muted); margin-bottom:16px;">Ambak Customer Context</div>
            <div style="margin-bottom:24px;">
              <div style="font-weight:700; font-size:16px; margin-bottom:4px;">${currentLead.name}</div>
              <div style="font-size:12px; color:var(--text-muted);">${currentLead.phone}</div>
            </div>
            
            <div class="card" style="background:#FAFAFA; border:1px solid var(--border); padding:12px; margin-bottom:16px;">
              <div style="font-size:10px; text-transform:uppercase; color:var(--text-muted); margin-bottom:4px;">Loan Amount</div>
              <div style="font-weight:700; font-size:14px; color:var(--primary);">${formatLakhs(currentLead.si)}</div>
            </div>

            <div class="card" style="background:#FAFAFA; border:1px solid var(--border); padding:12px; margin-bottom:16px;">
              <div style="font-size:10px; text-transform:uppercase; color:var(--text-muted); margin-bottom:4px;">Linked Home Loan</div>
              <div style="font-weight:700; font-size:12px;">${currentLead.hlLead ? currentLead.hlLead.bank : '-'}</div>
              <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Stage: ${currentLead.hlLead ? getStageLabel(currentLead.hlLead.hlStage) : '-'}</div>
            </div>

            <div style="margin-top:auto;">
              <div style="font-size:11px; color:var(--text-muted); line-height:1.4; background:#F0FDF4; padding:12px; border-radius:8px; border:1px solid #BBF7D0; color:#16A34A;">
                <b>Tip:</b> PolicyBazaar requires the exact Name and DOB as per Aadhaar. Verify this before generating the link.
              </div>
            </div>
          </div>
        </div>
      `;

      return html;
    }
    function finalizePBPlan() {
      const plan = PB_PLANS[G_PBI];
      currentLead.selectedPlan = {
         insurer: plan.insurer,
         premium: plan.price,
         coverage: formatLakhs(currentLead.si),
         tenure: '10 Years'
      };
      closePolicyBazaar();
      showToast('Plan selection imported from PolicyBazaar.');
      renderLeadDetail();
    }

    function generateInHouseQuote() {
      currentLead.inHouseQuotesGenerated = true;
      showToast('Quotes Generated Successfully');
      renderLeadDetail();
    }

    function selectInHousePlan(insurer, premium, coverage, planType) {
      currentLead.selectedPlan = { 
         insurer: insurer, 
         premium: premium, 
         coverage: coverage || formatLakhs(currentLead.si || 4500000), 
         planType: planType || 'Comprehensive',
         selectedTimestamp: new Date().toISOString(),
         selectedBy: 'Verification Agent'
      };
      
      let logText = `${insurer} Plan Selected<br>Coverage: ${currentLead.selectedPlan.coverage} | Premium: ${premium}`;
      currentLead.log.unshift({ dot: 'var(--primary)', text: logText, time: 'Just now' });
      
      showToast('Plan Selected Successfully');
      renderLeadDetail();
    }

    window.getMilestoneSequence = function() {
        let activeTab = currentLead.newStageActiveTab || currentLead.finalProduct || currentLead.initialProduct || 'lp';
        let insurer = currentLead.finalInsurer || 'CARE Health';
        let productType = activeTab;
        if (activeTab === 'lp') productType = 'loan_protection';
        if (activeTab === 'property') productType = 'property_insurance';
        if (activeTab === 'cl') productType = 'credit_life';
        if (activeTab === 'term') productType = 'term_plan';
        
        let mKey = getMilestoneKey(productType, insurer);
        return MILESTONE_CONFIG[mKey].milestones.map(m => m.label);
    };

    window.toggleJourneySummary = function(event) {
        event.stopPropagation();
        currentLead.journeySummaryExpanded = !currentLead.journeySummaryExpanded;
        renderLeadDetail();
    };

    window.handleAdvanceMilestone = function() {
        let seq = getMilestoneSequence();
        let currentMilestone = seq[currentLead.activeMilestoneIndex];
        
        currentLead.milestoneDates[currentMilestone] = new Date().toISOString().split('T')[0];
        currentLead.activeMilestoneIndex++;
        
        let agentName = (window.IBM_ROLE === 'Manager') ? 'IBM Manager' : 'IBM Agent';
        addActivity('Agent Update', `${currentMilestone} marked as complete`, `by ${agentName}`, 'Just now');
        
        syncBucketStatusFromMilestone();
        
        renderLeadDetail();
        renderRightPanel();
    };

    window.syncBucketStatusFromMilestone = function() {
        let activeTab = currentLead.newStageActiveTab || currentLead.finalProduct || currentLead.initialProduct || 'lp';
        let insurer = currentLead.finalInsurer || 'CARE Health';
        let productType = activeTab;
        if (activeTab === 'lp') productType = 'loan_protection';
        if (activeTab === 'property') productType = 'property_insurance';
        if (activeTab === 'cl') productType = 'credit_life';
        if (activeTab === 'term') productType = 'term_plan';
        
        let mKey = getMilestoneKey(productType, insurer);
        let mNode = MILESTONE_CONFIG[mKey].milestones[currentLead.activeMilestoneIndex];
        if (!mNode) return;
        let id = mNode.id;
        
        if (id === 'documents') {
            currentLead.status = 'Documents';
            currentLead.subStatus = 'Pending';
        } else if (id === 'medical') {
            currentLead.status = 'Medical';
            currentLead.subStatus = 'Scheduled';
        } else if (id === 'proposal_form') {
            currentLead.status = 'Proposal Form';
            currentLead.subStatus = 'Pending';
        } else if (id === 'tele_pd') {
            currentLead.status = 'Tele-PD';
            currentLead.subStatus = 'Pending';
        } else if (id === 'kyc') {
            currentLead.status = 'KYC';
            currentLead.subStatus = 'Pending';
        } else if (id === 'policy_decision') {
            currentLead.status = 'Underwriting';
            currentLead.subStatus = 'Pending';
        } else if (id === 'policy_copy_upload') {
            currentLead.status = 'Policy Copy';
            currentLead.subStatus = 'Pending';
        }
    };

    window.handlePolicyDecisionClick = function(decision) {
        currentLead.selectedPolicyDecision = decision;
        
        if (decision === 'Approved') {
            if (!confirm('Are you sure you want to approve this policy?')) return;
            let seq = getMilestoneSequence();
            currentLead.milestoneDates['Policy Decision'] = new Date().toISOString().split('T')[0];
            currentLead.activeMilestoneIndex++;
            
            let agentName = (window.IBM_ROLE === 'Manager') ? 'IBM Manager' : 'IBM Agent';
            addActivity('Agent Update', 'Policy decision: Approved', '', 'Just now');
            
            syncBucketStatusFromMilestone();
            renderLeadDetail();
            renderRightPanel();
        } else if (decision === 'Rejected') {
            if (!confirm('Are you sure you want to reject this policy?')) return;
            currentLead.bucket = 'Lost';
            currentLead.status = 'Lost';
            currentLead.subStatus = 'Insurer Rejected';
            
            let agentName = (window.IBM_ROLE === 'Manager') ? 'IBM Manager' : 'IBM Agent';
            addActivity('System Update', 'Lead marked as Lost', 'Reason: Insurer Rejected · Full refund will be processed to the customer externally.', 'Just now');
            
            showToast('Lead moved to Lost bucket');
            renderLeadDetail();
            renderRightPanel();
        } else if (decision === 'Counter Offer') {
            if (!confirm('Are you sure you want to create a counter offer?')) return;
            currentLead.showCounterOfferForm = true;
            renderLeadDetail();
        }
    };

    window.handleSaveCounterOffer = function() {
        let amt = document.getElementById('co-revised-premium').value;
        let details = document.getElementById('co-change-details').value;
        let paylink = document.getElementById('co-new-paylink').value;
        
        if (!amt) {
            alert('Revised premium is required.');
            return;
        }
        
        currentLead.coRevisedPremium = amt;
        currentLead.coChangeDetails = details;
        currentLead.coNewPaylink = paylink;
        currentLead.counterOfferSaved = true;
        
        currentLead.status = 'Underwriting';
        currentLead.subStatus = 'Counter Offer';
        
        let agentName = (window.IBM_ROLE === 'Manager') ? 'IBM Manager' : 'IBM Agent';
        addActivity('Agent Update', `Counter offer received · Revised premium: ₹${amt}`, details, 'Just now');
        
        renderLeadDetail();
        renderRightPanel();
    };

    window.handleCounterOfferCustomerDecision = function(accepted) {
        if (accepted) {
            let seq = getMilestoneSequence();
            currentLead.milestoneDates['Policy Decision'] = new Date().toISOString().split('T')[0];
            currentLead.activeMilestoneIndex++;
            
            let agentName = (window.IBM_ROLE === 'Manager') ? 'IBM Manager' : 'IBM Agent';
            addActivity('Agent Update', 'Customer accepted counter offer', '', 'Just now');
            
            syncBucketStatusFromMilestone();
            renderLeadDetail();
            renderRightPanel();
        } else {
            currentLead.bucket = 'Lost';
            currentLead.status = 'Lost';
            currentLead.subStatus = 'Counter Offer Rejected';
            
            let agentName = (window.IBM_ROLE === 'Manager') ? 'IBM Manager' : 'IBM Agent';
            addActivity('System Update', 'Lead marked as Lost', 'Reason: Counter Offer Rejected', 'Just now');
            
            showToast('Lead moved to Lost bucket');
            renderLeadDetail();
            renderRightPanel();
        }
    };

    window.triggerPolicyUploadClick = function() {
        document.getElementById('policy-file-input').click();
    };

    window.handlePolicyUpload = function(files) {
        if (!files || files.length === 0) return;
        let file = files[0];
        currentLead.uploadedPolicyFile = {
            name: file.name,
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
        };
        
        currentLead.policyOcrLoading = true;
        renderLeadDetail();
        
        setTimeout(() => {
            currentLead.policyOcrLoading = false;
            
            let activeTab = currentLead.newStageActiveTab || currentLead.finalProduct || currentLead.initialProduct || 'lp';
            let insurer = currentLead.finalInsurer || 'CARE Health';
            let premium = currentLead.ocrPaymentAmount || 36553;
            let si = currentLead.si || 3500000;
            
            currentLead.policyOcrNumber = 'POL-' + Math.floor(10000000 + Math.random() * 90000000);
            currentLead.policyOcrInsurer = insurer;
            currentLead.policyOcrStartDate = new Date().toISOString().split('T')[0];
            currentLead.policyOcrSumInsured = si;
            currentLead.policyOcrPremium = premium;
            
            renderLeadDetail();
        }, 1200);
    };

    window.handleRemovePolicyFile = function() {
        currentLead.uploadedPolicyFile = null;
        currentLead.policyOcrLoading = false;
        currentLead.policyOcrNumber = null;
        currentLead.policyOcrInsurer = null;
        currentLead.policyOcrStartDate = null;
        currentLead.policyOcrSumInsured = null;
        currentLead.policyOcrPremium = null;
        renderLeadDetail();
    };

    window.validatePolicyOcrFields = function() {
        let num = currentLead.policyOcrNumber;
        let ins = currentLead.policyOcrInsurer;
        let start = currentLead.policyOcrStartDate;
        let si = currentLead.policyOcrSumInsured;
        let prem = currentLead.policyOcrPremium;
        
        let btn = document.getElementById('confirm-policy-copy-btn');
        if (btn) {
            let hasValues = !!(num && ins && start && si && prem);
            if (hasValues) {
                btn.removeAttribute('disabled');
                btn.style.cursor = 'pointer';
                btn.style.opacity = '1';
            } else {
                btn.setAttribute('disabled', 'true');
                btn.style.cursor = 'not-allowed';
                btn.style.opacity = '0.5';
            }
        }
    };

    window.handleConfirmPolicyIssued = function() {
        currentLead.bucket = 'Policy Issued';
        currentLead.status = 'Policy Issued';
        currentLead.subStatus = 'Issued';
        currentLead.productStatus = 'locked';
        
        let agentName = (window.IBM_ROLE === 'Manager') ? 'IBM Manager' : 'IBM Agent';
        let policyNo = currentLead.policyOcrNumber || '';
        let insurerName = currentLead.policyOcrInsurer || '';
        let sumInsured = currentLead.policyOcrSumInsured || '';
        
        addActivity('Agent Update', 'Policy copy received', `Policy No: ${policyNo} · Insurer: ${insurerName} · Sum Insured: ₹${formatMoney(sumInsured)}`, 'Just now');
        
        showToast('Policy copy uploaded. Lead moved to Policy Issued.');
        
        renderLeadDetail();
        renderRightPanel();
    };

        function renderPaymentDoneStage(isReadOnly = false) {
        if (typeof currentLead.activeMilestoneIndex !== 'number') {
            currentLead.activeMilestoneIndex = 1;
        }
        if (!currentLead.milestoneDates) {
            currentLead.milestoneDates = {};
        }
        if (!currentLead.milestoneDates['Payment Verified']) {
            currentLead.milestoneDates['Payment Verified'] = new Date().toISOString().split('T')[0];
        }
        
        let activeTab = currentLead.newStageActiveTab || currentLead.finalProduct || currentLead.initialProduct || 'lp';
        let insurer = currentLead.finalInsurer || 'CARE Health';
        let premium = currentLead.ocrPaymentAmount || 36553;
        
        let productType = activeTab;
        if (activeTab === 'lp') productType = 'loan_protection';
        if (activeTab === 'property') productType = 'property_insurance';
        if (activeTab === 'cl') productType = 'credit_life';
        if (activeTab === 'term') productType = 'term_plan';
        
        let milestoneKey = getMilestoneKey(productType, insurer);
        
        // SECTION 1: Previous Work Summary
        let isExpanded = currentLead.journeySummaryExpanded || false;
        
        let quotesHtml = '';
        if (activeTab === 'lp') {
            quotesHtml = `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                 <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 24px; height: 24px; border-radius: 4px; border: 1px solid #F3F4F6; background: white; display: flex; align-items: center; justify-content: center; font-size: 14px;">🏥</div>
                    <div style="font-size: 12px; font-weight: 500; color: #6B7280;">CARE Health • Group Credit Protect Plus</div>
                 </div>
                 <div style="font-size: 12px; font-weight: 600; color: #6B7280;">₹36,553</div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                 <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 24px; height: 24px; border-radius: 4px; border: 1px solid #F3F4F6; background: white; display: flex; align-items: center; justify-content: center; font-size: 14px;">🛡️</div>
                    <div style="font-size: 12px; font-weight: 500; color: #6B7280;">TATA AIG • Home Guard Shield</div>
                 </div>
                 <div style="font-size: 12px; font-weight: 600; color: #6B7280;">₹45,620</div>
              </div>
            `;
        } else if (activeTab === 'property') {
            quotesHtml = `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                 <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 24px; height: 24px; border-radius: 4px; border: 1px solid #F3F4F6; background: white; display: flex; align-items: center; justify-content: center; font-size: 14px;">🛡️</div>
                    <div style="font-size: 12px; font-weight: 500; color: #6B7280;">HDFC Ergo • Home Shield Plus</div>
                 </div>
                 <div style="font-size: 12px; font-weight: 600; color: #6B7280;">₹4,200</div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                 <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 24px; height: 24px; border-radius: 4px; border: 1px solid #F3F4F6; background: white; display: flex; align-items: center; justify-content: center; font-size: 14px;">🏢</div>
                    <div style="font-size: 12px; font-weight: 500; color: #6B7280;">Bajaj Allianz • My Home Insurance</div>
                 </div>
                 <div style="font-size: 12px; font-weight: 600; color: #6B7280;">₹4,560</div>
              </div>
            `;
        } else {
            quotesHtml = `
              <div style="display: flex; justify-content: space-between; align-items: center;">
                 <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 24px; height: 24px; border-radius: 4px; border: 1px solid #F3F4F6; background: white; display: flex; align-items: center; justify-content: center; font-size: 14px;">🛡️</div>
                    <div style="font-size: 12px; font-weight: 500; color: #6B7280;">PB Partners • Term Protect Plan</div>
                 </div>
                 <div style="font-size: 12px; font-weight: 600; color: #6B7280;">₹8,500</div>
              </div>
            `;
        }
        
        let sharedInsurersStr = (currentLead.sharedQuotes || ['CARE Health']).join(', ');
        let sharedMethod = 'WhatsApp';
        let sharedDetails = `${sharedInsurersStr} · Shared via ${sharedMethod} · Just now`;
        
        let linkText = currentLead.paymentLinkValue || 'https://pay.careinsurance.com/pay?id=83726492';
        let truncatedLink = linkText.length > 40 ? linkText.substring(0, 40) + '...' : linkText;
        let todayStr = new Date().toISOString().split('T')[0];
        
        let verifiedAmt = currentLead.ocrPaymentAmount || premium;
        let verifiedTxid = currentLead.ocrTransactionId || 'TXN827492047';
        let verifiedDate = currentLead.ocrPaymentDate || todayStr;
        
        let expandedContent = `
          <div style="padding: 16px; border-top: 1px solid #E5E7EB;">
             <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; margin-bottom: 8px; letter-spacing: 0.05em;">QUOTES GENERATED</div>
             ${quotesHtml}
          </div>
          <div style="padding: 16px; border-top: 1px solid #E5E7EB;">
             <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; margin-bottom: 8px; letter-spacing: 0.05em;">QUOTE SHARED WITH CUSTOMER</div>
             <div style="font-size: 12px; color: #4B5563; font-weight: 500;">${sharedDetails}</div>
          </div>
          <div style="padding: 16px; border-top: 1px solid #E5E7EB;">
             <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; margin-bottom: 8px; letter-spacing: 0.05em;">PAYMENT</div>
             <div style="font-size: 12px; color: #4B5563; line-height: 1.5; font-weight: 500;">
               Link: <span style="color: #473391; text-decoration: underline;">${truncatedLink}</span><br>
               <span style="color: #9CA3AF;">Shared on ${todayStr}</span><br>
               <div style="margin-top: 6px; font-weight: 600; color: #1A7A4A; display: flex; align-items: center; gap: 4px;">
                 <span>✓ Verified</span> · <span>₹${formatMoney(verifiedAmt)}</span> · <span>UTR: ${verifiedTxid}</span> · <span>${verifiedDate}</span>
               </div>
             </div>
          </div>
        `;
        
        let section1 = `
          <div style="background: white; border: 1px solid #E5E7EB; border-radius: 10px; overflow: hidden; font-family: Poppins; text-align: left;">
             <div style="background: #F9FAFB; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none;" onclick="toggleJourneySummary(event)">
                <div style="font-size: 12px; font-weight: 700; color: #111827;">Journey Summary</div>
                <div style="color: #9CA3AF; font-size: 14px; transform: rotate(${isExpanded ? '180deg' : '0deg'}); transition: transform 0.2s;">▾</div>
             </div>
             ${isExpanded ? expandedContent : ''}
          </div>
        `;
        
        // SECTION 2: Milestone Tracker
        let seq = MILESTONE_CONFIG[milestoneKey].milestones;
        let activeIdx = currentLead.activeMilestoneIndex;
        if (activeIdx >= seq.length) activeIdx = seq.length - 1;
        
        let trackHtml = '<div style="display: flex; align-items: flex-start; justify-content: space-between; position: relative; margin: 20px 0 10px 0;">';
        trackHtml += '<div style="position: absolute; top: 15px; left: 16px; right: 16px; height: 2px; background: #E5E7EB; z-index: 1;"></div>';
        
        seq.forEach((m, i) => {
            if (i > 0) {
                let leftPerc = ((i-1)/(seq.length-1))*100;
                let wPerc = (1/(seq.length-1))*100;
                let lineBg = i <= activeIdx ? '#1A7A4A' : '#E5E7EB';
                trackHtml += `<div style="position: absolute; top: 15px; left: ${leftPerc}%; width: ${wPerc}%; height: 2px; background: ${lineBg}; z-index: 2;"></div>`;
            }
        });
        
        seq.forEach((m, i) => {
            let isDone = i < activeIdx;
            let isActive = i === activeIdx;
            
            let bg = isDone ? '#1A7A4A' : (isActive ? '#473391' : '#F3F4F6');
            let color = isDone || isActive ? 'white' : '#9CA3AF';
            let inner = isDone ? '✓' : (i+1);
            let labelColor = isDone ? '#1A7A4A' : (isActive ? '#473391' : '#9CA3AF');
            let labelWeight = isActive ? '700' : (isDone ? '600' : '500');
            
            let completionDate = currentLead.milestoneDates[m.label] || todayStr;
            let dateText = isDone ? `<div style="font-size:10px; color:#1A7A4A; margin-top:2px;">${completionDate}</div>` : '';
            
            trackHtml += `
               <div style="display: flex; flex-direction: column; align-items: center; z-index: 3; width: ${100/seq.length}%;">
                  <div style="width: 32px; height: 32px; border-radius: 50%; background: ${bg}; color: ${color}; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; ${isActive ? 'box-shadow: 0 0 0 4px #F0EEFB; border: 1.5px solid #473391;' : ''}">${inner}</div>
                  <div style="font-size: 11px; font-weight: ${labelWeight}; color: ${labelColor}; margin-top: 8px; text-align: center; line-height: 1.2;">${m.label}</div>
                  ${dateText}
               </div>
            `;
        });
        trackHtml += '</div>';
        
        let mNode = seq[activeIdx];
        let actionHtml = '';
        
        let DESCRIPTIONS = {
            'kyc': "Customer needs to complete KYC. This is done on the insurer payment portal. Follow up with the customer to confirm completion.",
            'proposal_form': "CARE Health requires the customer to fill a proposal/declaration form. Share the form link with the customer.",
            'tele_pd': "TATA AIG will call the customer for a telephonic personal discussion. Inform the customer to expect a call.",
            'documents': "Collect Aadhaar, PAN, and income proof from the customer and submit to the insurer.",
            'medical': "Medical test has been scheduled. Remind the customer to attend.",
            'policy_decision': "Insurer has reviewed the application. See decision below.",
            'policy_copy_upload': "Policy has been issued. Download the policy copy from the insurer portal and upload it here."
        };
        
        let desc = DESCRIPTIONS[mNode.id] || '';
        
        if (mNode.isUpload) {
            actionHtml = `
              <div style="background: #F0EEFB; border: 1px solid #C5C0F5; border-radius: 8px; padding: 14px 16px; margin-top: 20px;">
                <div style="font-size: 13px; font-weight: 700; color: #473391;">${mNode.label}</div>
                <div style="font-size: 12px; color: #473391; line-height: 1.5; margin-top: 4px;">${desc}</div>
              </div>
            `;
        } else if (mNode.isDecision) {
            let formHtml = '';
            if (currentLead.showCounterOfferForm) {
                let saveDisabled = !currentLead.coRevisedPremium;
                formHtml = `
                  <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #C5C0F5; text-align: left;">
                    <div style="font-size: 11px; font-weight: 700; color: #473391; margin-bottom: 12px; uppercase;">Counter Offer Details</div>
                    <div style="margin-bottom: 10px;">
                      <label style="font-size: 10px; font-weight: 700; color: #9CA3AF; display: block; margin-bottom: 4px;">REVISED PREMIUM AMOUNT *</label>
                      <input type="number" id="co-revised-premium" placeholder="₹ New premium amount" value="${currentLead.coRevisedPremium || ''}" style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; padding: 0 10px; box-sizing: border-box; outline: none;" oninput="currentLead.coRevisedPremium = this.value; document.getElementById('save-co-btn').disabled = !this.value;">
                    </div>
                    <div style="margin-bottom: 10px;">
                      <label style="font-size: 10px; font-weight: 700; color: #9CA3AF; display: block; margin-bottom: 4px;">CHANGES DETAILS</label>
                      <textarea id="co-change-details" placeholder="Describe what changed (coverage, terms, conditions…)" style="width: 100%; height: 56px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; padding: 8px 10px; box-sizing: border-box; outline: none; resize: none;">${currentLead.coChangeDetails || ''}</textarea>
                    </div>
                    <div style="margin-bottom: 12px;">
                      <label style="font-size: 10px; font-weight: 700; color: #9CA3AF; display: block; margin-bottom: 4px;">NEW PAYMENT LINK (if applicable)</label>
                      <input type="text" id="co-new-paylink" placeholder="Paste new payment link if insurer provided one" value="${currentLead.coNewPaylink || ''}" style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; padding: 0 10px; box-sizing: border-box; outline: none;">
                    </div>
                    <button id="save-co-btn" ${saveDisabled ? 'disabled' : ''} style="width: 100%; height: 40px; background: #856404; color: white; border-radius: 8px; font-size: 13px; font-weight: 700; border: none; cursor: pointer;" onclick="handleSaveCounterOffer()">
                      Save Counter Offer
                    </button>
                  </div>
                `;
            }
            
            let counterOfferPendingButtons = '';
            if (currentLead.counterOfferSaved) {
                counterOfferPendingButtons = `
                  <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #C5C0F5; text-align: left;">
                    <div style="font-size: 12px; font-weight: 600; color: #856404; margin-bottom: 8px;">Counter Offer Pending</div>
                    <div style="font-size: 11px; color: #6B7280; margin-bottom: 12px; line-height: 1.5;">Customer has been notified. Waiting for customer response.</div>
                    <div style="display: flex; gap: 8px;">
                      <button style="flex: 1; height: 40px; background: #E6F4ED; color: #1A7A4A; border: 1.5px solid #1A7A4A; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;" onclick="handleCounterOfferCustomerDecision(true)">Customer Accepted</button>
                      <button style="flex: 1; height: 40px; background: #FDECEA; color: #C0392B; border: 1.5px solid #C0392B; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;" onclick="handleCounterOfferCustomerDecision(false)">Customer Rejected</button>
                    </div>
                  </div>
                `;
            }
            
            actionHtml = `
              <div style="background: #F0EEFB; border: 1px solid #C5C0F5; border-radius: 8px; padding: 14px 16px; margin-top: 20px; text-align: center;">
                <div style="font-size: 13px; font-weight: 700; color: #473391; text-align: left;">${mNode.label}</div>
                <div style="font-size: 12px; color: #473391; line-height: 1.5; margin-top: 4px; text-align: left;">${desc}</div>
                
                ${!currentLead.counterOfferSaved ? `
                <div style="display: flex; gap: 8px; margin-top: 12px; width: 100%;">
                  <button style="flex: 1; height: 40px; background: #E6F4ED; color: #1A7A4A; border: 1.5px solid #1A7A4A; border-radius: 20px; font-size: 12px; font-weight: 700; cursor: pointer;" onclick="handlePolicyDecisionClick('Approved')">Approved</button>
                  <button style="flex: 1; height: 40px; background: #FFF8E1; color: #856404; border: 1.5px solid #856404; border-radius: 20px; font-size: 12px; font-weight: 700; cursor: pointer;" onclick="handlePolicyDecisionClick('Counter Offer')">Counter Offer</button>
                  <button style="flex: 1; height: 40px; background: #FDECEA; color: #C0392B; border: 1.5px solid #C0392B; border-radius: 20px; font-size: 12px; font-weight: 700; cursor: pointer;" onclick="handlePolicyDecisionClick('Rejected')">Rejected / Cancelled</button>
                </div>
                ` : ''}
                
                ${formHtml}
                ${counterOfferPendingButtons}
              </div>
            `;
        } else if (mNode.completable) {
            actionHtml = `
              <div style="background: #F0EEFB; border: 1px solid #C5C0F5; border-radius: 8px; padding: 14px 16px; margin-top: 20px; text-align: left;">
                <div style="font-size: 13px; font-weight: 700; color: #473391;">${mNode.label}</div>
                <div style="font-size: 12px; color: #473391; line-height: 1.5; margin-top: 4px;">${desc}</div>
                <button style="width: 100%; height: 40px; background: #473391; color: white; border-radius: 8px; font-size: 13px; font-weight: 700; border: none; cursor: pointer; margin-top: 12px; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'" onclick="handleAdvanceMilestone()">
                  ${mNode.actionButton}
                </button>
              </div>
            `;
        }
        
        let section2 = `
          <div style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin-top: 16px; font-family: Poppins; text-align: left;">
             <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <div>
                   <div style="font-size: 14px; font-weight: 700; color: #111827;">Processing Milestones</div>
                   <div style="font-size: 11px; color: #9CA3AF; margin-top: 4px;">${insurer} · ${activeTab.toUpperCase()}</div>
                </div>
                <div style="background: #FFF8E1; color: #856404; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px;">Payment Done</div>
             </div>
             ${trackHtml}
             ${actionHtml}
          </div>
        `;
        
        // SECTION 3: Policy Copy Upload
        let section3 = '';
        if (mNode && mNode.isUpload) {
            let uploadAreaHtml = '';
            let detailsAreaHtml = '';
            let btnDisabled = true;
            
            if (!currentLead.uploadedPolicyFile) {
                uploadAreaHtml = `
                  <div onclick="triggerPolicyUploadClick()" style="border: 2px dashed #C5C0F5; border-radius: 8px; padding: 32px; text-align: center; background: #FAFAFA; cursor: pointer; transition: background 0.2s;" onmouseenter="this.style.background='#F5F3FD'" onmouseleave="this.style.background='#FAFAFA'">
                     <div style="font-size: 24px; color: #473391; margin-bottom: 8px;">↑</div>
                     <div style="font-size: 13px; font-weight: 600; color: #473391;">Click to upload Policy Copy</div>
                     <div style="font-size: 11px; color: #9CA3AF; margin-top: 4px;">PDF or Image · Max 10MB</div>
                  </div>
                  <input type="file" id="policy-file-input" accept="application/pdf, image/png, image/jpeg" style="display: none;" onchange="handlePolicyUpload(this.files)">
                `;
            } else if (currentLead.policyOcrLoading) {
                uploadAreaHtml = `
                  <div style="background: #F0EEFB; border-radius: 6px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box;">
                     <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 16px;">📄</span>
                        <div style="font-size: 12px; color: #473391; font-weight: 600;">${currentLead.uploadedPolicyFile.name} <span style="font-size: 10px; color: #9CA3AF; font-weight: normal;">(${currentLead.uploadedPolicyFile.size})</span></div>
                     </div>
                     <span style="font-size: 14px; color: #6B7280; cursor: not-allowed; font-weight: bold; user-select: none;">✕</span>
                  </div>
                `;
                detailsAreaHtml = `
                  <style>
                    @keyframes ocr-spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  </style>
                  <div style="text-align: center; padding: 24px; font-family: Poppins;">
                     <div style="display: inline-block; width: 24px; height: 24px; border: 3px solid #F3F4F6; border-top-color: #473391; border-radius: 50%; animation: ocr-spin 1s linear infinite; margin-bottom: 8px;"></div>
                     <div style="font-size: 13px; font-weight: 600; color: #473391;">Reading policy details...</div>
                  </div>
                `;
            } else {
                let f = currentLead.uploadedPolicyFile;
                uploadAreaHtml = `
                  <div style="background: #F0EEFB; border-radius: 6px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box;">
                     <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 16px;">📄</span>
                        <div style="font-size: 12px; color: #473391; font-weight: 600;">${f.name} <span style="font-size: 10px; color: #9CA3AF; font-weight: normal;">(${f.size})</span></div>
                     </div>
                     <span style="font-size: 14px; color: #6B7280; cursor: pointer; font-weight: bold; user-select: none;" onclick="handleRemovePolicyFile()">✕</span>
                  </div>
                `;
                
                let num = currentLead.policyOcrNumber || '';
                let ins = currentLead.policyOcrInsurer || '';
                let start = currentLead.policyOcrStartDate || '';
                let si = currentLead.policyOcrSumInsured || '';
                let prem = currentLead.policyOcrPremium || '';
                btnDisabled = !(num && ins && start && si && prem);
                
                detailsAreaHtml = `
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px;">
                    <div>
                      <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                        POLICY NUMBER <span style="background: #EEF0FD; color: #473391; font-size: 9px; font-weight: 700; border-radius: 3px; padding: 1px 4px;">OCR</span>
                      </label>
                      <input type="text" value="${num}" oninput="currentLead.policyOcrNumber = this.value; validatePolicyOcrFields();" style="height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; background: #F9FAFB; padding: 0 10px; outline: none; width: 100%; box-sizing: border-box; transition: all 0.2s;" onfocus="this.style.borderColor='#473391'; this.style.background='white';" onblur="this.style.borderColor='#E5E7EB'; this.style.background='#F9FAFB';">
                    </div>
                    <div>
                      <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                        INSURER NAME <span style="background: #EEF0FD; color: #473391; font-size: 9px; font-weight: 700; border-radius: 3px; padding: 1px 4px;">OCR</span>
                      </label>
                      <input type="text" value="${ins}" oninput="currentLead.policyOcrInsurer = this.value; validatePolicyOcrFields();" style="height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; background: #F9FAFB; padding: 0 10px; outline: none; width: 100%; box-sizing: border-box; transition: all 0.2s;" onfocus="this.style.borderColor='#473391'; this.style.background='white';" onblur="this.style.borderColor='#E5E7EB'; this.style.background='#F9FAFB';">
                    </div>
                    <div style="grid-column: span 2;">
                      <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                        POLICY START DATE <span style="background: #EEF0FD; color: #473391; font-size: 9px; font-weight: 700; border-radius: 3px; padding: 1px 4px;">OCR</span>
                      </label>
                      <input type="date" value="${start}" oninput="currentLead.policyOcrStartDate = this.value; validatePolicyOcrFields();" style="height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; background: #F9FAFB; padding: 0 10px; outline: none; width: 100%; box-sizing: border-box; transition: all 0.2s;" onfocus="this.style.borderColor='#473391'; this.style.background='white';" onblur="this.style.borderColor='#E5E7EB'; this.style.background='#F9FAFB';">
                    </div>
                    <div style="grid-column: span 2;">
                      <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                        SUM INSURED <span style="background: #EEF0FD; color: #473391; font-size: 9px; font-weight: 700; border-radius: 3px; padding: 1px 4px;">OCR</span>
                      </label>
                      <input type="number" value="${si}" oninput="currentLead.policyOcrSumInsured = this.value; validatePolicyOcrFields();" style="height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; background: #F9FAFB; padding: 0 10px; outline: none; width: 100%; box-sizing: border-box; transition: all 0.2s;" onfocus="this.style.borderColor='#473391'; this.style.background='white';" onblur="this.style.borderColor='#E5E7EB'; this.style.background='#F9FAFB';">
                    </div>
                    <div style="grid-column: span 2;">
                      <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                        PREMIUM AMOUNT <span style="background: #EEF0FD; color: #473391; font-size: 9px; font-weight: 700; border-radius: 3px; padding: 1px 4px;">OCR</span>
                      </label>
                      <input type="number" value="${prem}" oninput="currentLead.policyOcrPremium = this.value; validatePolicyOcrFields();" style="height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; background: #F9FAFB; padding: 0 10px; outline: none; width: 100%; box-sizing: border-box; transition: all 0.2s;" onfocus="this.style.borderColor='#473391'; this.style.background='white';" onblur="this.style.borderColor='#E5E7EB'; this.style.background='#F9FAFB';">
                    </div>
                  </div>
                  <div style="font-size: 11px; color: #9CA3AF; font-style: italic; margin-top: 8px;">
                    Please verify the extracted details before confirming.
                  </div>
                `;
            }
            
            section3 = `
              <div style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin-top: 16px; font-family: Poppins; text-align: left;">
                 <div style="font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 2px;">Upload Policy Copy</div>
                 <div style="font-size: 12px; color: #9CA3AF; margin-bottom: 16px; margin-top: 4px;">Download the policy copy from the insurer portal and upload it here to complete this stage.</div>
                 
                 ${uploadAreaHtml}
                 ${detailsAreaHtml}
                 
                 <button id="confirm-policy-copy-btn" ${btnDisabled ? 'disabled' : ''} style="width: 100%; height: 44px; background: #1A7A4A; color: white; border-radius: 8px; font-size: 13px; font-weight: 700; margin-top: 16px; border: none; cursor: ${btnDisabled ? 'not-allowed' : 'pointer'}; opacity: ${btnDisabled ? '0.5' : '1'}; transition: opacity 0.2s;" onclick="handleConfirmPolicyIssued()">
                   \${mNode.uploadButtonLabel}
                 </button>
              </div>
            `;
        }
        
        return `
          <div style="font-family: Poppins;">
            ${section1}
            ${section2}
            ${section3}
          </div>
        `;
    }




    function renderPolicyStage() {
      let insurer = currentLead.selectedPlan ? currentLead.selectedPlan.insurer : 'Unknown Insurer';
      let premiumStr = currentLead.selectedPlan ? currentLead.selectedPlan.premium : '₹0';
      let premiumNum = parseInt(premiumStr.replace(/[^0-9]/g, '')) || 0;
      let commission = premiumNum * 0.20;
      
      return `
        <div class="card" style="padding:32px; box-shadow:0 4px 15px rgba(0,0,0,0.05); border:none; margin: 24px auto; max-width:600px;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:16px; margin-bottom:24px;">
             <h2 style="margin:0; font-size:20px;">Policy Summary</h2>
             <div class="badge" style="background:#DCFCE7; color:#16A34A; border:1px solid #BBF7D0;">Policy Stage</div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:24px;">
             <div class="form-group">
               <label class="label">Policy Number</label>
               <input type="text" class="form-control" placeholder="Enter Policy Number">
             </div>
             <div class="form-group">
               <label class="label">Policy Start Date</label>
               <input type="date" class="form-control" id="policy-start-date" onchange="updateFreelookExpiry()">
             </div>
          </div>

          <div style="background:#FAFAFA; border:1px solid var(--border); border-radius:8px; padding:16px;">
             <div style="display:flex; justify-content:space-between; margin-bottom:12px; border-bottom:1px dashed var(--border); padding-bottom:12px;">
                <div style="font-size:12px; color:var(--text-muted);">Insurer</div>
                <div style="font-weight:600; font-size:13px;">${insurer}</div>
             </div>
             <div style="display:flex; justify-content:space-between; margin-bottom:12px; border-bottom:1px dashed var(--border); padding-bottom:12px;">
                <div style="font-size:12px; color:var(--text-muted);">Premium Paid</div>
                <div style="font-weight:600; font-size:13px;">${premiumStr}</div>
             </div>
             <div style="display:flex; justify-content:space-between; margin-bottom:12px; border-bottom:1px dashed var(--border); padding-bottom:12px;">
                <div style="font-size:12px; color:var(--text-muted);">Freelook Expiry</div>
                <div style="font-weight:600; font-size:13px;" id="freelook-expiry-display">Enter start date to calculate</div>
             </div>
             <div style="display:flex; justify-content:space-between;">
                <div style="font-size:12px; color:var(--text-muted);">Commission Expected (20%)</div>
                <div style="font-weight:700; font-size:14px; color:var(--success);">₹${commission.toLocaleString('en-IN')}</div>
             </div>
          </div>
          
          <div style="text-align:center; margin-top:24px;">
            <button class="btn btn-primary" style="padding:10px 24px;" onclick="showToast('Policy details saved!')">Save Policy Details</button>
          </div>
        </div>
      `;
    }

    window.updateFreelookExpiry = function() {
      const dateInput = document.getElementById('policy-start-date');
      const display = document.getElementById('freelook-expiry-display');
      if (!dateInput || !display || !dateInput.value) {
        if (display) display.textContent = 'Enter start date to calculate';
        return;
      }
      const startDate = new Date(dateInput.value);
      const expiryDate = new Date(startDate.getTime() + (15 * 86400000));
      display.textContent = expiryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      display.style.color = '#DC2626';
    };

    function renderSectionForm(sec) {
      let content = '';
      
      let misinp = (lbl) => `
        <div class="form-group">
          <label>${lbl}</label>
          <input type="text" class="form-control" placeholder="Enter ${lbl}">
        </div>
      `;
      let hlinp = (lbl, val) => `
        <div class="form-group">
          <label>${lbl}</label>
          <div style="position:relative;">
            <input type="text" class="form-control" style="background:#F0FDF4; border-color:#BBF7D0;" value="${val}" readonly>
            <span class="badge" style="background:#DCFCE7; color:#16A34A; position:absolute; right:8px; top:6px; font-size:9px;">Auto-filled from Sangam</span>
          </div>
        </div>
      `;

      if (sec === 'Insurance Details') {
        content = `
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div class="form-group"><label>Product</label><select class="form-control"><option>Loan Protection</option><option>Property Insurance</option><option>Credit Life</option><option>Term Insurance</option></select></div>
            ${misinp('Plan')}
            <div class="form-group"><label>Tenure</label><select class="form-control"><option>1 Year</option><option>5 Years</option><option>20 Years</option></select></div>
            <div class="form-group"><label>Insurer</label><select class="form-control"><option>Any</option><option>CARE</option><option>TATA AIG</option><option>HDFC Life</option></select></div>
            ${misinp('Add-ons')}
            ${misinp('Sum Insured')}
            <div class="form-group"><label>Premium Mode</label><select class="form-control"><option>Single</option><option>Annual</option><option>Monthly</option></select></div>
          </div>
        `;
      } else if (sec === 'Customer Details') {
        content = `
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            ${hlinp('Name', currentLead.name)}
            ${hlinp('DOB', '05 Aug 1990')}
            <div class="form-group"><label>Gender</label><select class="form-control"><option>Male</option><option>Female</option><option>Other</option></select></div>
            ${hlinp('Mobile', currentLead.phone)}
            ${hlinp('Email', currentLead.email)}
            ${misinp('PAN')}
            ${misinp('Aadhaar')}
            <div class="form-group"><label>Marital Status</label><select class="form-control"><option>Single</option><option>Married</option></select></div>
            ${misinp('Spouse')}
            ${misinp('Dependents')}
            ${misinp('Language')}
            <div class="form-group" style="grid-column: span 2;"><label>Address</label><input type="text" class="form-control"></div>
            ${misinp('Occupation')}
            ${misinp('Designation')}
            ${misinp('Official Email')}
            ${misinp("Mother's Name")}
          </div>
        `;
      } else if (sec === 'Income Details') {
        content = `
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div class="form-group"><label>Employment Type</label><select class="form-control"><option>Salaried</option><option>Self Employed</option></select></div>
            ${misinp('Annual Income')}
            ${misinp('Company/Employer')}
            <div class="form-group"><label>ITR Filed</label><select class="form-control"><option>No</option><option>Yes</option></select></div>
            ${misinp('ITR Income')}
            ${misinp('Bank Statement Months')}
            ${misinp('CIBIL Score')}
          </div>
        `;
      } else if (sec === 'Property Details') {
        content = `
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            ${misinp('Property Value')}
            <div class="form-group"><label>Type</label><select class="form-control"><option>Residential</option><option>Commercial</option></select></div>
            <div class="form-group" style="grid-column: span 2;"><label>Address</label><input type="text" class="form-control"></div>
            ${misinp('Pin Code')}
            ${misinp('Construction Year')}
            <div class="form-group"><label>Construction Type</label><select class="form-control"><option>Pucca</option><option>Kutcha</option></select></div>
            ${misinp('Built-up Area')}
            ${misinp('Floor Number')}
          </div>
        `;
      } else if (sec === 'Nominee Details') {
        content = `
          <div class="card" style="background:#FAFAFA; border:1px solid var(--border); padding:16px; margin-bottom:16px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
              ${misinp('Full Name')}
              <div class="form-group"><label>Relationship</label><select class="form-control"><option>Spouse</option><option>Parent</option><option>Child</option><option>Sibling</option></select></div>
              <div class="form-group"><label>Date of Birth</label><input type="date" class="form-control"></div>
              <div class="form-group"><label>Share %</label><input type="number" class="form-control" value="100" onchange="if(this.value!=100) document.getElementById('nom-warn').style.display='block'; else document.getElementById('nom-warn').style.display='none';"></div>
            </div>
            <div id="nom-warn" style="display:none; color:var(--danger); font-size:12px; font-weight:600; margin-top:12px; background:var(--danger-bg); padding:8px; border-radius:4px;">⚠ Warning: Total share must equal 100%</div>
          </div>
          <button class="btn btn-ghost btn-small">+ Add Another Nominee</button>
        `;
      } else if (sec === 'Health Screening') {
        let tgl = (q) => `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; padding-bottom:16px; border-bottom:1px solid var(--border);">
            <div style="font-weight:500;">${q}</div>
            <div class="form-group" style="margin:0; width:120px;">
              <select class="form-control"><option>No</option><option>Yes</option></select>
            </div>
          </div>
        `;
        content = `
          ${tgl('Smoker')}
          ${tgl('Pre-existing Illness')}
          ${tgl('Disability')}
          ${tgl('Existing Insurance')}
        `;
      } else {
        content = `<div style="padding:40px; text-align:center; color:var(--text-muted); background:var(--bg); border-radius:8px;">Form fields for ${sec} would go here.</div>`;
      }
      
      return `
        <div class="card" style="min-height: 400px; padding:24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
            <h2 style="margin:0;">${sec}</h2>
            <button class="btn btn-ghost" onclick="setSection(null)">← Back to Stage</button>
          </div>
          ${content}
          <div style="margin-top:32px; border-top:1px solid var(--border); padding-top:24px; display:flex; justify-content:flex-end;">
            <button class="btn btn-primary" onclick="showToast('${sec} Saved'); setSection(null)">Save Changes</button>
          </div>
        </div>
      `;
    }

    function toggleDynFields(val) {
      document.getElementById('dyn-fields-lp').style.display = 'none';
      document.getElementById('dyn-fields-prop').style.display = 'none';
      document.getElementById('dyn-fields-cl').style.display = 'none';
      document.getElementById('acc-health').style.display = 'none';

      if(val === 'lp') document.getElementById('dyn-fields-lp').style.display = 'block';
      if(val === 'prop') document.getElementById('dyn-fields-prop').style.display = 'block';
      if(val === 'cl' || val === 'term') {
        document.getElementById('dyn-fields-cl').style.display = 'block';
        document.getElementById('acc-health').style.display = 'block';
      }
    }

    window.handleStatusChange = function(status) {
      document.getElementById('update-substatus').innerHTML = (SUBSTATUS_MAP[status] || []).map(s => `<option value="${s}">${s}</option>`).join('');
      window.handleSubStatusChange();
    };

    window.handleSubStatusChange = function() {
      const status = document.getElementById('update-status').value;
      const subStatus = document.getElementById('update-substatus').value;
      
      let html = '';
      if (status === 'Not Connected' || status === 'Callback') {
        html = `
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <label style="font-size:10px; font-weight:600; color:var(--text-muted); text-transform:uppercase;">Follow-up Date *</label>
              <input type="date" class="form-control" style="padding:6px; font-size:12px;" id="update-fdate">
            </div>
            <div>
              <label style="font-size:10px; font-weight:600; color:var(--text-muted); text-transform:uppercase;">Follow-up Time *</label>
              <input type="time" class="form-control" style="padding:6px; font-size:12px;" id="update-ftime">
            </div>
          </div>
        `;
      } else if (status === 'Payment Done' && subStatus === 'Payment Verified') {
        html = `
          <div>
            <label style="font-size:10px; font-weight:600; color:var(--text-muted); text-transform:uppercase;">Payment Proof Upload *</label>
            <input type="file" class="form-control" style="padding:6px; font-size:12px;" id="update-proof" onchange="validateStatusUpdate()">
          </div>
        `;
      } else if (status === 'Policy Issued') {
        html = `
          <div>
            <label style="font-size:10px; font-weight:600; color:var(--text-muted); text-transform:uppercase;">Policy Copy Upload *</label>
            <input type="file" class="form-control" style="padding:6px; font-size:12px;" id="update-policy">
          </div>
        `;
      }
      
      let remarksMandatory = (status === 'Counter Offer') || (status === 'Payment Done' && subStatus === 'Verification Failed');
      html += `
        <div>
          <label style="font-size:10px; font-weight:600; color:var(--text-muted); text-transform:uppercase;">Remarks ${remarksMandatory ? '*' : ''}</label>
          <textarea class="form-control" rows="2" style="padding:6px; font-size:12px;" id="update-remarks" onkeyup="validateStatusUpdate()"></textarea>
        </div>
      `;
      
      const df = document.getElementById('dynamic-fields');
      if(df) df.innerHTML = html;
      validateStatusUpdate();
    };

    window.validateStatusUpdate = function() {
      const status = document.getElementById('update-status').value;
      const subStatus = document.getElementById('update-substatus').value;
      const btn = document.getElementById('update-status-btn');
      if(!btn) return;
      
      let valid = true;
      if (status === 'Payment Done' && subStatus === 'Payment Verified') {
         const proof = document.getElementById('update-proof');
         if (!proof || !proof.value) valid = false;
      }
      if ((status === 'Counter Offer') || (status === 'Payment Done' && subStatus === 'Verification Failed')) {
         const remarks = document.getElementById('update-remarks');
         if (!remarks || !remarks.value.trim()) valid = false;
      }
      
      btn.disabled = !valid;
    };

    function getRightPanelTabContent(activeTab) {
      if (activeTab === 'History') {
        return `
          <div style="background: white; border: 1px solid #E5E7EB; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
              <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #9CA3AF;">SYSTEM UPDATE</div>
              <div style="font-size: 11px; font-weight: 600; color: #473391;">Verification Agent</div>
            </div>
            <div style="font-size: 12px; font-weight: 600; color: #111827;">Call attempt: Not connected</div>
            <div style="font-size: 11px; color: #4B5563; margin-top: 2px; line-height: 1.5;">Automatic call attempt triggered. Customer did not pick up.</div>
            <div style="font-size: 10px; color: #9CA3AF; margin-top: 6px;">Yesterday • Sangam</div>
          </div>
        `;
      } else if (activeTab === 'FollowUp') {
        return `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 20px;">
            <div style="width: 60px; height: 60px; background: #F3F4F6; border-radius: 8px; margin-bottom: 12px;"></div>
            <div style="font-size: 12px; font-weight: 600; color: #6B7280; margin-bottom: 4px;">No follow-up scheduled</div>
            <div style="font-size: 11px; color: #9CA3AF; text-align: center;">Set a follow-up from Update Status above.</div>
          </div>
        `;
      } else if (activeTab === 'Documents') {
        return `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 20px;">
            <div style="width: 60px; height: 60px; background: #F3F4F6; border-radius: 8px; margin-bottom: 12px;"></div>
            <div style="font-size: 12px; font-weight: 600; color: #6B7280; margin-bottom: 4px;">No documents uploaded yet</div>
            <div style="font-size: 11px; color: #9CA3AF; text-align: center;">Documents will appear here once uploaded.</div>
          </div>
        `;
      }
      return '';
    }


    function renderRightPanel() {
      const l = currentLead;
      const bucketConfig = STATE_MACHINE_CONFIG[l.bucket || 'New'];
      let statusKeys = Object.keys(bucketConfig.statuses);
      
      if (l.bucket === 'Payment Done') {
          let activeTab = l.newStageActiveTab || l.finalProduct || l.initialProduct || 'lp';
          let insurer = l.finalInsurer || 'CARE Health';
          let productType = activeTab;
          if (activeTab === 'lp') productType = 'loan_protection';
          if (activeTab === 'property') productType = 'property_insurance';
          if (activeTab === 'cl') productType = 'credit_life';
          if (activeTab === 'term') productType = 'term_plan';
          
          let mKey = getMilestoneKey(productType, insurer);
          let milestones = MILESTONE_CONFIG[mKey].milestones;
          
          const ID_TO_STATUS = {
              'proposal_form': 'Proposal Form',
              'tele_pd': 'Tele-PD',
              'kyc': 'KYC',
              'documents': 'Documents',
              'medical': 'Medical',
              'policy_decision': 'Underwriting',
              'policy_copy_upload': 'Policy Copy'
          };
          
          let keysSet = new Set();
          milestones.forEach(m => {
              for (let prefix in ID_TO_STATUS) {
                  if (m.id.startsWith(prefix)) {
                      keysSet.add(ID_TO_STATUS[prefix]);
                  }
              }
          });
          statusKeys = Array.from(keysSet);
      }
      
      let statusOptionsHtml = statusKeys.map((k, i) => `<option value="${k}" ${i===0?'selected':''}>${k}</option>`).join('');
      
      let activeTab = l.activeTab || 'History';
      let showFupFields = (l.bucket !== 'Payment Done');
      
      // Status bar chip color
      const STATUS_CHIP_COLORS = {
        'Not Connected':      { bg: '#FDECEA', color: '#C0392B' },
        'Call Back':          { bg: '#E8F1FF', color: '#0A58CA' },
        'Interested':         { bg: '#E6F4ED', color: '#1A7A4A' },
        'Quote Shared':       { bg: '#FFF8E1', color: '#856404' },
        'Payment Link Shared':{ bg: '#FFF8E1', color: '#856404' },
        'Payment Done':       { bg: '#E6F4ED', color: '#1A7A4A' },
        'Policy Issued':      { bg: '#E0F2FE', color: '#0369A1' },
        'Counter Offer':      { bg: '#FFF3E0', color: '#E65100' },
        'Fresh':              { bg: '#F3F4F6', color: '#374151' },
      };
      const chipC = STATUS_CHIP_COLORS[l.status] || { bg: '#EEEDFE', color: '#473391' };

      
      let html = `
        <style>
          #detail-right select:focus, #detail-right input:focus, #detail-right textarea:focus {
            border-color: #473391 !important;
            background: white !important;
          }
        </style>
        <div style="flex-shrink: 0; padding: 16px 24px; border-bottom: 2px solid #E5E7EB; background: white;">
          <div style="background:#F9FAFB; border-bottom:1px solid #E5E7EB; padding:12px 0 12px 0; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span id="status-bar-chip" style="padding:2px 8px; border-radius:4px; font-size:11px; font-weight:700; background:${chipC.bg}; color:${chipC.color};">${l.status || ''}</span>
                <span style="font-size:12px; color:#4B5563; font-weight:500;">${l.subStatus || ''}</span>
              </div>
              <div style="font-size:11px; color:#9CA3AF;">Updated: ${l.lastUpdated || 'Just now'}</div>
            </div>
            <div style="font-size:11px; color:${l.followUpDate && l.followUpDate.toLowerCase().includes('overdue') ? '#C0392B' : (l.followUpDate && l.followUpDate !== 'No Follow-up' ? '#4B5563' : '#9CA3AF')}; font-weight:${l.followUpDate && l.followUpDate.toLowerCase().includes('overdue') ? '700' : '500'};">
              ${l.followUpDate && l.followUpDate !== 'No Follow-up' ? '📅 ' + l.followUpDate : 'No Follow-up set'}
            </div>
          </div>
          <div style="font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 16px;">Update Status</div>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div>
              <label style="font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 5px; display: block;">STATUS</label>
              <select id="detail-status" style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; font-family: Poppins; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;" onchange="handleDetailStatusChange()">
                ${statusOptionsHtml}
              </select>
            </div>
            <div>
              <label style="font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 5px; display: block;">SUB STATUS</label>
              <select id="detail-substatus" style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; font-family: Poppins; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;" onchange="handleDetailSubStatusChange()">
              </select>
            </div>
            <div id="detail-fup-wrapper" style="display: ${showFupFields ? 'flex' : 'none'}; gap: 8px;">
              <div style="flex: 1;">
                <label style="font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 5px; display: block;">FOLLOW-UP DATE <span style="color: #C0392B;">*</span></label>
                <input type="date" id="detail-fup-date" placeholder="dd/mm/yyyy" style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; font-family: Poppins; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
              </div>
              <div style="flex: 1;">
                <label style="font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 5px; display: block;">PENDING WITH <span style="color: #C0392B;">*</span></label>
                <select id="detail-pending-with" style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; font-family: Poppins; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                  <option value="Customer" selected>Customer</option>
                  <option value="IBM Agent">IBM Agent</option>
                  <option value="PolicyBazaar">PolicyBazaar</option>
                  <option value="Insurer">Insurer</option>
                  <option value="Ambak Operations">Ambak Operations</option>
                  <option value="Finance Team">Finance Team</option>
                </select>
              </div>
            </div>
            <div>
              <label style="font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 5px; display: block;">REMARKS</label>
              <textarea id="detail-remarks" placeholder="Add remarks..." style="width: 100%; height: 72px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; font-family: Poppins; background: #FAFAFA; padding: 8px 10px; outline: none; resize: none; transition: border-color 0.2s, background 0.2s; box-sizing: border-box;"></textarea>
            </div>
            <button style="width: 100%; height: 42px; background: #473391; color: white; font-size: 13px; font-weight: 700; border-radius: 8px; margin-top: 16px; border: none; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'" onclick="saveDetailStatusUpdate()">Update Status</button>
          </div>
        </div>
        
      `;
      document.getElementById('detail-right').innerHTML = html;
      
      handleDetailStatusChange();
    }
    
    window.completeTask
    window.handleDetailStatusChange = function() {
      if(!currentLead) return;
      const status = document.getElementById('detail-status').value;
      const subSelect = document.getElementById('detail-substatus');
      
      const bucketConfig = STATE_MACHINE_CONFIG[currentLead.bucket || 'New'];
      const statusConfig = bucketConfig.statuses[status];
      
      let options = statusConfig ? statusConfig.subStatuses : [];
      
      subSelect.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join('');
      
      // Auto-select if there is only one option and disable it
      if (options.length === 1) {
         subSelect.value = options[0];
         subSelect.disabled = true;
         subSelect.style.background = '#F3F4F6';
         subSelect.style.color = '#6B7280';
      } else {
         subSelect.disabled = false;
         subSelect.style.background = '#FAFAFA';
         subSelect.style.color = '#111827';
      }
      
      window.handleDetailSubStatusChange();
    };

    window.handleDetailSubStatusChange = function() {
      if(!currentLead) return;
      const status = document.getElementById('detail-status').value;
      const fupWrapper = document.getElementById('detail-fup-wrapper');
      
      const bucketConfig = STATE_MACHINE_CONFIG[currentLead.bucket || 'New'];
      const statusConfig = bucketConfig.statuses[status];
      
      if (currentLead.bucket === 'Payment Done') {
          if (fupWrapper) fupWrapper.style.display = 'none';
      } else {
          if (statusConfig && statusConfig.mandatoryFollowUp) {
            if (fupWrapper) fupWrapper.style.display = 'flex';
          } else {
            if (fupWrapper) fupWrapper.style.display = 'none';
          }
      }
    };

    window.saveDetailStatusUpdate = function() {
      if(!currentLead) return;
      const bucket = currentLead.bucket || 'New';
      const status = document.getElementById('detail-status').value;
      const subStatus = document.getElementById('detail-substatus').value;
      const fupDate = document.getElementById('detail-fup-date').value;
      const pendingWith = document.getElementById('detail-pending-with').value;
      const remarks = document.getElementById('detail-remarks').value;
      
      if (!status || !subStatus) {
        alert("Please select Status and Sub Status."); return;
      }
      
      const config = STATE_MACHINE_CONFIG[bucket].statuses[status];
      if (config.mandatoryFollowUp && !fupDate) {
        alert("Follow-up date is mandatory for this status."); return;
      }
      
      let paymentLog = '';
      if (config.mandatoryUpload && typeof config.mandatoryUpload === 'function') {
        const uploadLabel = config.mandatoryUpload(subStatus);
        if (uploadLabel) {
          if (!document.getElementById('detail-upload-input').value) {
             alert(uploadLabel + " is mandatory for this status."); return;
          }
          if (uploadLabel === 'Payment Proof') {
             const amt = document.getElementById('detailPaymentAmountInput').value;
             const utr = document.getElementById('detailPaymentUtrInput').value;
             const dt = document.getElementById('detailPaymentDateInput').value;
             if(!amt || !utr || !dt) {
                alert("Payment Amount, UTR, and Date are mandatory."); return;
             }
             paymentLog = `<br>Payment Amt: ₹${amt} | UTR: ${utr} | Date: ${dt}`;
          }
        }
      }
      
      let nextBucket = config.nextBucket;
      if (config.conditionNextBucket) {
        nextBucket = config.conditionNextBucket(subStatus);
      }
      
      let coLog = '';
      if (config.captureCounterOffer && typeof config.captureCounterOffer === 'function') {
        const showCO = config.captureCounterOffer(subStatus);
        if (showCO) {
           const coAmount = document.getElementById('detail-co-amount').value;
           const coResponse = document.getElementById('detail-co-response').value;
           const coPremium = document.getElementById('detail-co-premium').value;
           if (coAmount) coLog += `<br>CO Amount: ₹${coAmount}`;
           if (coResponse) coLog += `<br>Customer Response: ${coResponse}`;
           if (coPremium) coLog += `<br>Addl Premium: ₹${coPremium}`;
        }
      }
      
      currentLead.bucket = nextBucket;
      currentLead.status = status;
      currentLead.subStatus = subStatus;
      
      if (config.mandatoryFollowUp) {
        let dateObj = new Date(fupDate + 'T00:00');
        currentLead.followUpDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        currentLead.followUpDate = 'No Follow-up';
      }
      
      let logText = `Status updated to ${status} - ${subStatus} (Pending With: ${pendingWith})`;
      if (remarks) logText += ` | Remarks: ${remarks}`;
      logText += coLog;
      logText += paymentLog;
      
      currentLead.log.unshift({ dot: '#473391', text: logText, time: 'Just now' });
      
      renderLeadTable();
      renderLeadDetail();
      showToast('Status Updated Successfully!');
    };

    let G_CMODAL = 1;

    function openCreateModal() {
      document.getElementById('modalOverlay').classList.add('open');
      document.getElementById('createModal').style.display = 'flex';
      G_CMODAL = 1;
      renderCreateModal();
    }

    function closeCreateModal() {
      document.getElementById('modalOverlay').classList.remove('open');
      document.getElementById('createModal').style.display = 'none';
    }

    function renderCreateModal() {
      let html = '';
      if (G_CMODAL === 1) {
        html = `
          <p style="color:var(--text-muted); margin-bottom:24px;">Search for the customer's home loan lead in Sangam. Details will auto-fill.</p>
          <div style="display:flex; align-items:center; gap:16px; margin-bottom:24px;">
            <div style="flex:1;">
              <label class="label">Lead ID</label>
              <input type="text" class="form-control" placeholder="e.g. 194856" id="s_lid">
            </div>
            <div style="color:var(--text-muted); font-weight:600; margin-top:16px;">OR</div>
            <div style="flex:1;">
              <label class="label">Mobile Number</label>
              <input type="text" class="form-control" placeholder="e.g. 9876543210" id="s_mob">
            </div>
          </div>
          <div style="background:var(--bg); border-radius:8px; padding:16px; margin-bottom:32px;">
            <div style="font-size:11px; font-weight:600; color:var(--primary); margin-bottom:8px;">💡 Try Lead ID '194856' for success, anything else for not found</div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <a href="#" onclick="G_CMODAL=4; renderCreateModal(); return false;" style="color:var(--primary); font-weight:600; font-size:13px; text-decoration:none;">Proceed to create lead without home loan</a>
            <div style="display:flex; gap:12px;">
              <button class="btn btn-ghost" onclick="closeCreateModal()">Cancel</button>
              <button class="btn btn-primary" onclick="searchLead()">Search Lead →</button>
            </div>
          </div>
        `;
      } else if (G_CMODAL === 2) {
        html = `
          <div style="background:#F0FDF4; border:1px solid #16A34A; border-radius:8px; padding:16px; margin-bottom:24px;">
            <div style="color:#16A34A; font-weight:700; margin-bottom:12px;">✓ Home loan lead found</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:12px;">
              <div><span style="color:var(--text-muted);">Lead ID:</span> <b>#194856</b></div>
              <div><span style="color:var(--text-muted);">Customer:</span> <b>Amit Kumar</b></div>
              <div><span style="color:var(--text-muted);">Loan:</span> <b>₹50L (HDFC)</b></div>
              <div><span style="color:var(--text-muted);">Stage:</span> <b>Sanctioned</b></div>
            </div>
          </div>
          <h3 style="margin-bottom:16px;">Insurance Details</h3>
          <div class="form-group">
            <label>Initial Product Interest (Optional)</label>
            <select class="form-control"><option value="">Not Sure Yet</option><option value="lp">Loan Protection</option><option value="property">Property Insurance</option><option value="cl">Credit Life</option><option value="term">Term Plan</option></select>
            <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Lead will be created as a generic Insurance Lead. Product is locked only after payment verification.</div>
          </div>
          <div class="form-group" style="margin-bottom:32px;">
            <label>Assign IBM Agent</label>
            <select class="form-control"><option>Rohit M.</option></select>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <button class="btn btn-ghost" onclick="G_CMODAL=1; renderCreateModal()">← Search Again</button>
            <button class="btn btn-primary" onclick="closeCreateModal(); showToast('Insurance lead created for Amit Kumar')">Create Insurance Lead →</button>
          </div>
        `;
      } else if (G_CMODAL === 4) {
        html = `
          <div style="background:#EFF6FF; border:1px solid #BFDBFE; border-radius:8px; padding:12px; margin-bottom:24px; font-size:12px; color:#1D4ED8;">
            ℹ️ No linked HL lead found. Please enter details manually below.
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px;">
            <div class="form-group"><label>First Name *</label><input type="text" class="form-control" id="ml_fname"></div>
            <div class="form-group"><label>Last Name *</label><input type="text" class="form-control" id="ml_lname"></div>
            <div class="form-group" style="grid-column: span 2;"><label>Mobile Number *</label><input type="text" class="form-control" id="ml_mob"></div>
            <div class="form-group">
              <label>Insurance Product *</label>
              <select class="form-control" id="ml_prod">
                 <option value="lp">Loan Protection</option>
                 <option value="property">Property Insurance</option>
                 <option value="cl">Credit Life</option>
                 <option value="term">Term Plan</option>
              </select>
            </div>
            <div class="form-group">
              <label>Assign IBM Agent *</label>
              <select class="form-control" id="ml_agent">
                 <option value="Rohit M">Rohit M</option>
                 <option value="Priya S">Priya S</option>
              </select>
            </div>
            <div class="form-group" style="grid-column: span 2;">
              <label>Loan Amount *</label>
              <input type="text" class="form-control" id="ml_lamount" placeholder="e.g. 5000000">
            </div>
          </div>
          
          <div style="display:flex; justify-content:space-between;">
            <button class="btn btn-ghost" onclick="G_CMODAL=1; renderCreateModal()">← Back</button>
            <button class="btn btn-primary" onclick="createManualLead()">Create Insurance Lead →</button>
          </div>
        `;
      }
      document.getElementById('createModalBody').innerHTML = html;
    }

    function createManualLead() {
      const fname = document.getElementById('ml_fname').value;
      const lname = document.getElementById('ml_lname').value;
      const mob = document.getElementById('ml_mob').value;
      const lamount = document.getElementById('ml_lamount').value;
      
      if (!fname || !lname || !mob || !lamount) {
         showToast('Please fill all required fields (including Loan Amount)');
         return;
      }
      
      const newLead = {
        id: 'INS-' + Math.floor(Math.random() * 90000 + 10000),
        name: fname + ' ' + lname,
        phone: mob,
        bucket: 'New',
        status: null,
        subStatus: null,
        createdDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        initialProduct: document.getElementById('ml_prod').value,
        source: 'Manual',
        si: parseInt(document.getElementById('ml_lamount').value) || 0,
        hlLead: {
          id: 'HL-' + Math.floor(Math.random() * 90000),
          bank: 'Unknown',
          hlStage: 'Unknown',
          rm: document.getElementById('ml_agent').value
        },
        log: [
          { dot: 'var(--primary)', text: 'Lead manually created in system', time: 'Just now' }
        ]
      };
      
      LEADS.unshift(newLead);
      closeCreateModal();
      showToast('Insurance Lead Created Successfully!');
      currentLead = newLead;
      renderLeadDetail();
      renderLeadTable();
      renderPipelineCards();
    }

    function searchLead() {
      let lid = document.getElementById('s_lid')?.value;
      if (lid === '194856') G_CMODAL = 2;
      else G_CMODAL = 4;
      renderCreateModal();
    }

    window.openPBDrawer = function(product) {
      document.getElementById('pbOverlay').classList.add('open');
      document.getElementById('pbDrawer').classList.add('open-right');
      
      let prodName = 'Property Insurance';
      if (product === 'cl') prodName = 'Credit Life';
      if (product === 'term') prodName = 'Term Plan';
      
      let html = `
        <div style="padding:16px 24px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; background:white;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="font-weight:700; font-size:18px;">PolicyBazaar Workspace</div>
            <div class="badge" style="background:#EFF6FF; color:#1E3A8A;">${prodName}</div>
          </div>
          <button class="btn btn-ghost" onclick="closePolicyBazaar()">✕ Close</button>
        </div>
        <div style="flex:1; padding:24px; overflow-y:auto; background:#F3F4F6;">
          <!-- Mock PB UI -->
          <div style="background:white; border-radius:12px; height:100%; min-height:600px; display:flex; flex-direction:column; align-items:center; justify-content:center; border:1px dashed #D1D5DB;">
             <div style="font-size:24px; color:var(--text-muted); margin-bottom:16px;">PolicyBazaar Portal</div>
             <div style="font-size:14px; color:#6B7280; margin-bottom:24px; max-width:400px; text-align:center;">Customer details are pre-filled. Agent compares plans, selects one, and reaches the payment page inside this view.</div>
          </div>
        </div>
        <div style="padding:16px 24px; border-top:1px solid var(--border); background:white; display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:12px; color:var(--text-muted);">After finalizing the plan, copy the link to share.</div>
          <button class="btn btn-primary" onclick="copyPBLink()">Copy Payment Link</button>
        </div>
      `;
      document.getElementById('pbContent').innerHTML = html;
    };

    window.closePolicyBazaar = function() {
      document.getElementById('pbOverlay').classList.remove('open');
      document.getElementById('pbDrawer').classList.remove('open-right');
    };

    window.copyPBLink = function() {
      showToast('Payment Link Copied! (Dummy)');
    };

    function renderLeadDetailsDrawer() {
      let html = `
        <div style="padding: 16px 20px; border-bottom: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: center; background: white;">
          <div style="font-size: 16px; font-weight: 700; color: #111827;">Lead Details</div>
          <div style="font-size: 16px; color: #9CA3AF; cursor: pointer;" onclick="closeLeadDetailsDrawer()">✕</div>
        </div>
        <div style="flex: 1; overflow-y: auto; background: white;" id="drawer-accordion-container">
          <!-- Section 1 -->
          <div class="drawer-section" id="drawer-sec-1">
            <div style="padding: 14px 20px; background: #FAFAFA; border-bottom: 1px solid #F3F4F6; cursor: pointer; display: flex; align-items: center; justify-content: space-between;" onclick="toggleDrawerSection('drawer-sec-1')">
              <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #473391;">Insurance Details</div>
              <div class="chevron" style="color: #473391; font-size: 12px; transition: transform 0.2s;">▾</div>
            </div>
            <div class="drawer-content" style="padding: 16px 20px; border-bottom: 1px solid #F3F4F6;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">Recommended Product <span style="background: #EEF0FD; color: #473391; font-size: 9px; padding: 1px 5px; border-radius: 4px; margin-left: 4px;">HL</span></label>
                  <select style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                    <option selected>Loan Protection</option>
                    <option>Property Insurance</option>
                    <option>Credit Life</option>
                    <option>Term Plan</option>
                  </select>
                </div>
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">Product Status</label>
                  <div style="width: 100%; height: 36px; display: flex; align-items: center;">
                    <div style="background: #F3F4F6; color: #4B5563; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 12px;">Draft</div>
                  </div>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">Sum Insured</label>
                  <input type="text" placeholder="₹ Amount" value="50,00,000" style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                </div>
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">Tenure</label>
                  <select style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                    <option>1 year</option>
                    <option>2 years</option>
                    <option>3 years</option>
                    <option>4 years</option>
                    <option selected>5 years</option>
                  </select>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">Plan Type</label>
                  <select style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                    <option>PA Only</option>
                    <option selected>PA + CI</option>
                  </select>
                </div>
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">Insurer</label>
                  <input type="text" placeholder="Assigned after quote" style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                </div>
              </div>
            </div>
          </div>
          
          <!-- Section 2 -->
          <div class="drawer-section collapsed" id="drawer-sec-2">
            <div style="padding: 14px 20px; background: #FAFAFA; border-bottom: 1px solid #F3F4F6; cursor: pointer; display: flex; align-items: center; justify-content: space-between;" onclick="toggleDrawerSection('drawer-sec-2')">
              <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #473391;">Customer Details</div>
              <div class="chevron" style="color: #473391; font-size: 12px; transition: transform 0.2s; transform: rotate(-90deg);">▾</div>
            </div>
            <div class="drawer-content" style="padding: 16px 20px; border-bottom: 1px solid #F3F4F6; display: none;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">First Name <span style="background: #EEF0FD; color: #473391; font-size: 9px; padding: 1px 5px; border-radius: 4px; margin-left: 4px;">HL</span></label>
                  <input type="text" value="Rajesh" style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                </div>
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">Last Name <span style="background: #EEF0FD; color: #473391; font-size: 9px; padding: 1px 5px; border-radius: 4px; margin-left: 4px;">HL</span></label>
                  <input type="text" value="Kumar" style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">Mobile <span style="background: #EEF0FD; color: #473391; font-size: 9px; padding: 1px 5px; border-radius: 4px; margin-left: 4px;">HL</span></label>
                  <input type="text" value="+91 87654 32109" style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                </div>
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">Email</label>
                  <input type="text" value="rajesh.kumar@example.com" style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">Date of Birth</label>
                  <input type="date" value="1982-05-14" style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                </div>
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">Gender</label>
                  <select style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                    <option selected>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">PAN Number</label>
                  <input type="text" value="ABCDE1234F" style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                </div>
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">Aadhaar Number</label>
                  <input type="text" value="XXXX XXXX 1234" style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">Marital Status</label>
                  <select style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                    <option>Single</option>
                    <option selected>Married</option>
                    <option>Divorced</option>
                    <option>Widowed</option>
                  </select>
                </div>
              </div>
              <div style="margin-bottom: 14px;">
                <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">Address</label>
                <textarea style="width: 100%; height: 56px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 8px 10px; outline: none; transition: border-color 0.2s, background 0.2s; resize: none;">A-42, Residency Greens, Sector 45, Gurgaon, Haryana 122003</textarea>
              </div>
            </div>
          </div>

          <!-- Section 3 -->
          <div class="drawer-section collapsed" id="drawer-sec-3">
            <div style="padding: 14px 20px; background: #FAFAFA; border-bottom: 1px solid #F3F4F6; cursor: pointer; display: flex; align-items: center; justify-content: space-between;" onclick="toggleDrawerSection('drawer-sec-3')">
              <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #473391;">Income Details</div>
              <div class="chevron" style="color: #473391; font-size: 12px; transition: transform 0.2s; transform: rotate(-90deg);">▾</div>
            </div>
            <div class="drawer-content" style="padding: 16px 20px; border-bottom: 1px solid #F3F4F6; display: none;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">Employment Type</label>
                  <select style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                    <option selected>Salaried</option>
                    <option>Self-Employed</option>
                    <option>Business Owner</option>
                    <option>Retired</option>
                  </select>
                </div>
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">Annual Income <span style="background: #EEF0FD; color: #473391; font-size: 9px; padding: 1px 5px; border-radius: 4px; margin-left: 4px;">HL</span></label>
                  <select style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                    <option>Below 5L</option>
                    <option>5L–10L</option>
                    <option selected>10L–25L</option>
                    <option>25L–50L</option>
                    <option>50L+</option>
                  </select>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">ITR Filed</label>
                  <select style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                    <option selected>Yes</option>
                    <option>No</option>
                  </select>
                </div>
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">CIBIL Score <span style="background: #EEF0FD; color: #473391; font-size: 9px; padding: 1px 5px; border-radius: 4px; margin-left: 4px;">HL</span></label>
                  <input type="text" placeholder="Enter score" value="780" style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                </div>
              </div>
            </div>
          </div>

          <!-- Section 4 -->
          <div class="drawer-section collapsed" id="drawer-sec-4">
            <div style="padding: 14px 20px; background: #FAFAFA; border-bottom: 1px solid #F3F4F6; cursor: pointer; display: flex; align-items: center; justify-content: space-between;" onclick="toggleDrawerSection('drawer-sec-4')">
              <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #473391;">Property Details</div>
              <div class="chevron" style="color: #473391; font-size: 12px; transition: transform 0.2s; transform: rotate(-90deg);">▾</div>
            </div>
            <div class="drawer-content" style="padding: 16px 20px; border-bottom: 1px solid #F3F4F6; display: none;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">Property Value <span style="background: #EEF0FD; color: #473391; font-size: 9px; padding: 1px 5px; border-radius: 4px; margin-left: 4px;">HL</span></label>
                  <input type="text" placeholder="₹ Market value" value="85,00,000" style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                </div>
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">Property Type</label>
                  <select style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                    <option selected>Flat</option>
                    <option>Independent House</option>
                    <option>Villa</option>
                    <option>Plot</option>
                  </select>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">Pin Code <span style="background: #EEF0FD; color: #473391; font-size: 9px; padding: 1px 5px; border-radius: 4px; margin-left: 4px;">HL</span></label>
                  <input type="text" value="122003" style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                </div>
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">City <span style="background: #EEF0FD; color: #473391; font-size: 9px; padding: 1px 5px; border-radius: 4px; margin-left: 4px;">HL</span></label>
                  <input type="text" value="Gurgaon" style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">Construction Year</label>
                  <input type="text" placeholder="YYYY" value="2018" style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                </div>
              </div>
              <div style="margin-bottom: 14px;">
                <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">Property Address</label>
                <textarea style="width: 100%; height: 56px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 8px 10px; outline: none; transition: border-color 0.2s, background 0.2s; resize: none;">Tower B, 14th Floor, Sector 45</textarea>
              </div>
            </div>
          </div>

          <!-- Section 5 -->
          <div class="drawer-section collapsed" id="drawer-sec-5">
            <div style="padding: 14px 20px; background: #FAFAFA; border-bottom: 1px solid #F3F4F6; cursor: pointer; display: flex; align-items: center; justify-content: space-between;" onclick="toggleDrawerSection('drawer-sec-5')">
              <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #473391;">Nominee Details</div>
              <div class="chevron" style="color: #473391; font-size: 12px; transition: transform 0.2s; transform: rotate(-90deg);">▾</div>
            </div>
            <div class="drawer-content" style="padding: 16px 20px; border-bottom: 1px solid #F3F4F6; display: none;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">Full Name</label>
                  <input type="text" value="Priya Kumar" style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                </div>
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">Relationship</label>
                  <select style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                    <option selected>Spouse</option>
                    <option>Parent</option>
                    <option>Child</option>
                    <option>Sibling</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">Date of Birth</label>
                  <input type="date" value="1985-08-20" style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                </div>
                <div>
                  <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 4px; display: block;">Share %</label>
                  <input type="text" placeholder="e.g. 100" value="100" style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-family: Poppins; font-size: 12px; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                </div>
              </div>
            </div>
          </div>

          <!-- Section 6 -->
          <div class="drawer-section collapsed" id="drawer-sec-6">
            <div style="padding: 14px 20px; background: #FAFAFA; border-bottom: 1px solid #F3F4F6; cursor: pointer; display: flex; align-items: center; justify-content: space-between;" onclick="toggleDrawerSection('drawer-sec-6')">
              <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #473391;">Health Screening</div>
              <div class="chevron" style="color: #473391; font-size: 12px; transition: transform 0.2s; transform: rotate(-90deg);">▾</div>
            </div>
            <div class="drawer-content" style="padding: 16px 20px; border-bottom: 1px solid #F3F4F6; display: none;">
              <!-- Q1 -->
              <div style="padding: 10px 0; border-bottom: 1px solid #F9FAFB; display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 13px; color: #111827; font-weight: 500; padding-right: 16px;">Does the customer smoke or use tobacco products?</div>
                <div style="display: flex; gap: 8px; flex-shrink: 0;">
                  <button class="yes-btn" onclick="togglePill(this, 'yes')" style="height: 30px; width: 52px; border-radius: 20px; font-size: 12px; font-weight: 600; border: 1.5px solid #E5E7EB; background: white; color: #9CA3AF; cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none;">Yes</button>
                  <button class="no-btn" onclick="togglePill(this, 'no')" style="height: 30px; width: 52px; border-radius: 20px; font-size: 12px; font-weight: 600; border: 1.5px solid #E5E7EB; background: white; color: #9CA3AF; cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none;">No</button>
                </div>
              </div>
              <!-- Q2 -->
              <div style="padding: 10px 0; border-bottom: 1px solid #F9FAFB; display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 13px; color: #111827; font-weight: 500; padding-right: 16px;">Does the customer have any pre-existing medical conditions?</div>
                <div style="display: flex; gap: 8px; flex-shrink: 0;">
                  <button class="yes-btn" onclick="togglePill(this, 'yes')" style="height: 30px; width: 52px; border-radius: 20px; font-size: 12px; font-weight: 600; border: 1.5px solid #E5E7EB; background: white; color: #9CA3AF; cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none;">Yes</button>
                  <button class="no-btn" onclick="togglePill(this, 'no')" style="height: 30px; width: 52px; border-radius: 20px; font-size: 12px; font-weight: 600; border: 1.5px solid #E5E7EB; background: white; color: #9CA3AF; cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none;">No</button>
                </div>
              </div>
              <!-- Q3 -->
              <div style="padding: 10px 0; border-bottom: 1px solid #F9FAFB; display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 13px; color: #111827; font-weight: 500; padding-right: 16px;">Does the customer have any physical disability?</div>
                <div style="display: flex; gap: 8px; flex-shrink: 0;">
                  <button class="yes-btn" onclick="togglePill(this, 'yes')" style="height: 30px; width: 52px; border-radius: 20px; font-size: 12px; font-weight: 600; border: 1.5px solid #E5E7EB; background: white; color: #9CA3AF; cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none;">Yes</button>
                  <button class="no-btn" onclick="togglePill(this, 'no')" style="height: 30px; width: 52px; border-radius: 20px; font-size: 12px; font-weight: 600; border: 1.5px solid #E5E7EB; background: white; color: #9CA3AF; cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none;">No</button>
                </div>
              </div>
              <!-- Q4 -->
              <div style="padding: 10px 0; border-bottom: 1px solid #F9FAFB; display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 13px; color: #111827; font-weight: 500; padding-right: 16px;">Does the customer already have an existing insurance policy?</div>
                <div style="display: flex; gap: 8px; flex-shrink: 0;">
                  <button class="yes-btn" onclick="togglePill(this, 'yes')" style="height: 30px; width: 52px; border-radius: 20px; font-size: 12px; font-weight: 600; border: 1.5px solid #E5E7EB; background: white; color: #9CA3AF; cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none;">Yes</button>
                  <button class="no-btn" onclick="togglePill(this, 'no')" style="height: 30px; width: 52px; border-radius: 20px; font-size: 12px; font-weight: 600; border: 1.5px solid #E5E7EB; background: white; color: #9CA3AF; cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none;">No</button>
                </div>
              </div>
            </div>
          </div>
          
        </div>
        <div style="padding: 14px 20px; border-top: 1px solid #E5E7EB; display: flex; gap: 10px; background: white;">
          <button style="flex: 1; height: 40px; border: 1.5px solid #E5E7EB; background: white; color: #6B7280; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;" onclick="closeLeadDetailsDrawer()">Cancel</button>
          <button style="flex: 1; height: 40px; background: #473391; color: white; border-radius: 8px; font-size: 13px; font-weight: 700; border: none; cursor: pointer;" onclick="saveLeadDetailsDrawer()">Save Details</button>
        </div>
      `;
      document.getElementById('lead-details-drawer').innerHTML = html;
      
      // Inject focus styles globally for the drawer inputs if not already present
      if (!document.getElementById('drawer-focus-styles')) {
        let style = document.createElement('style');
        style.id = 'drawer-focus-styles';
        style.innerHTML = `
          #drawer-accordion-container select:focus, 
          #drawer-accordion-container input:focus, 
          #drawer-accordion-container textarea:focus {
            border-color: #473391 !important;
            background: white !important;
          }
        `;
        document.head.appendChild(style);
      }
    }

    window.openLeadDetailsDrawer = function() {
      if(!document.getElementById('lead-details-drawer').innerHTML) {
         renderLeadDetailsDrawer();
      }
      document.getElementById('drawer-overlay').style.display = 'block';
      setTimeout(() => {
        document.getElementById('lead-details-drawer').style.transform = 'translateX(0)';
      }, 10);
    };

    window.closeLeadDetailsDrawer = function() {
      document.getElementById('lead-details-drawer').style.transform = 'translateX(-100%)';
      setTimeout(() => {
        document.getElementById('drawer-overlay').style.display = 'none';
      }, 250);
    };

    window.toggleDrawerSection = function(id) {
      const sec = document.getElementById(id);
      const content = sec.querySelector('.drawer-content');
      const chevron = sec.querySelector('.chevron');
      if (sec.classList.contains('collapsed')) {
        sec.classList.remove('collapsed');
        content.style.display = 'block';
        chevron.style.transform = 'rotate(0deg)';
      } else {
        sec.classList.add('collapsed');
        content.style.display = 'none';
        chevron.style.transform = 'rotate(-90deg)';
      }
    };

    window.togglePill = function(btn, type) {
      const parent = btn.parentElement;
      const yesBtn = parent.querySelector('.yes-btn');
      const noBtn = parent.querySelector('.no-btn');
      
      yesBtn.style.background = 'white'; yesBtn.style.color = '#9CA3AF'; yesBtn.style.borderColor = '#E5E7EB';
      noBtn.style.background = 'white'; noBtn.style.color = '#9CA3AF'; noBtn.style.borderColor = '#E5E7EB';
      
      if (type === 'yes') {
        yesBtn.style.background = '#FDECEA'; yesBtn.style.color = '#C0392B'; yesBtn.style.borderColor = '#C0392B';
      } else {
        noBtn.style.background = '#E6F4ED'; noBtn.style.color = '#1A7A4A'; noBtn.style.borderColor = '#1A7A4A';
      }
    };
    
    window.saveLeadDetailsDrawer = function() {
      showToast('Lead details saved successfully!');
      closeLeadDetailsDrawer();
    };
    window.newStageActiveTab = null;
    window.newStageFormData = {};
    window.newStageSaveTimer = null;
    window.newStageSavedTimer = null;
    
    // Persist IBM_ROLE
    window.IBM_ROLE = localStorage.getItem('IBM_ROLE') || 'Manager';

    window.toggleIBMRole = function() {
        if (window.IBM_ROLE === 'Manager') {
            window.IBM_ROLE = 'Agent';
            showToast('Switched role to IBM Agent');
        } else {
            window.IBM_ROLE = 'Manager';
            showToast('Switched role to IBM Manager');
        }
        localStorage.setItem('IBM_ROLE', window.IBM_ROLE);
        let label = document.getElementById('ibm-role-label');
        if (label) {
            label.textContent = window.IBM_ROLE === 'Manager' ? 'IBM Manager' : 'IBM Agent';
        }
        renderLeadDetail();
    };

    // Make sure header role displays correctly on load
    setTimeout(() => {
        let label = document.getElementById('ibm-role-label');
        if (label) {
            label.textContent = window.IBM_ROLE === 'Manager' ? 'IBM Manager' : 'IBM Agent';
        }
    }, 100);

    window.switchNewStageTab = function(tab) {
       // auto-save effect on switch
       triggerNewStageSave();
       window.newStageActiveTab = tab;
       renderLeadDetail();
    };
    
    window.triggerNewStageSave = function() {
       let sv = document.getElementById('new-stage-save-status');
       if(sv) {
          sv.textContent = 'Saving...';
          sv.style.color = '#9CA3AF';
          sv.style.display = 'block';
          clearTimeout(window.newStageSaveTimer);
          clearTimeout(window.newStageSavedTimer);
          
          window.newStageSaveTimer = setTimeout(() => {
             sv.textContent = '✓ Saved';
             sv.style.color = '#1A7A4A';
             window.newStageSavedTimer = setTimeout(() => {
                sv.style.display = 'none';
             }, 2000);
          }, 400);
       }
       updateNewStageCompletion();
    };
    window.toggleCustomRadio = function(name, val) {
       currentLead[name] = val;
       triggerNewStageSave();
       renderLeadDetail(); // To reflect active UI
    };
    window.toggleCustomCheckbox = function(name) {
       currentLead[name] = !currentLead[name];
       triggerNewStageSave();
       renderLeadDetail();
    };



    window.togglePaymentSharePopup = function(event) {
        if(!currentLead.paymentLinkValue) return; // safety
        
        event.stopPropagation();
        let existing = document.getElementById('payment-share-popup');
        if (existing) {
           existing.remove();
           return;
        }
        
        let target = event.currentTarget;
        let rect = target.getBoundingClientRect();
        
        let popup = document.createElement('div');
        popup.id = 'payment-share-popup';
        popup.style.position = 'absolute';
        popup.style.top = (rect.bottom + window.scrollY + 8) + 'px';
        popup.style.left = (rect.left + window.scrollX - (200 - rect.width)/2) + 'px';
        popup.style.width = '200px';
        popup.style.background = 'white';
        popup.style.border = '1px solid #E5E7EB';
        popup.style.borderRadius = '10px';
        popup.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
        popup.style.padding = '8px';
        popup.style.zIndex = '9999';
        
        popup.innerHTML = `
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; padding: 4px 8px; margin-bottom: 4px;">Share via</div>
            <div style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 6px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='transparent'" onclick="sharePaymentLink('WhatsApp'); document.getElementById('payment-share-popup').remove();">
               <div style="width: 24px; height: 24px; border-radius: 50%; background: #25D366; color: white; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">WA</div>
               <div style="font-size: 13px; font-weight: 600; color: #111827;">WhatsApp</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 6px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='transparent'" onclick="sharePaymentLink('Email'); document.getElementById('payment-share-popup').remove();">
               <div style="width: 24px; height: 24px; border-radius: 50%; background: #EA4335; color: white; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">EM</div>
               <div style="font-size: 13px; font-weight: 600; color: #111827;">Email</div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        setTimeout(() => {
            document.addEventListener('click', function closePopup(e) {
                if(!popup.contains(e.target)) {
                    popup.remove();
                    document.removeEventListener('click', closePopup);
                }
            });
        }, 0);
    };



    // Payment Done Helpers
    window.togglePaymentDoneSummary = function() {
        currentLead.paymentSummaryExpanded = !currentLead.paymentSummaryExpanded;
        renderLeadDetail();
    };

    window.markMilestonePending = function(label, pendingSubStatus) {
        currentLead.status = label;
        currentLead.subStatus = pendingSubStatus || 'Pending';
        currentLead.log.unshift({dot:'var(--warning)', text:`${label} marked as ${currentLead.subStatus}`, time:'Just now', user: window.IBM_ROLE === 'Manager' ? 'IBM Manager' : 'IBM Agent'});
        renderLeadDetail();
    };

    window.advanceMilestone = function(currentLabel, nextLabel) {
        currentLead.log.unshift({dot:'#10B981', text:`${currentLabel} marked as complete`, time:'Just now', user: window.IBM_ROLE === 'Manager' ? 'IBM Manager' : 'IBM Agent'});
        currentLead.status = nextLabel;
        currentLead.subStatus = '';
        renderLeadDetail();
    };

    window.handlePolicyDecision = function(decision, nextLab) {
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
    };

    window.saveCounterOffer = function() {
        let amt = document.getElementById('co-prem') ? document.getElementById('co-prem').value : '';
        let reason = document.getElementById('co-reason') ? document.getElementById('co-reason').value : '';
        
        if(!amt || !reason) {
            showToast('Please enter revised premium and reason');
            return;
        }
        
        currentLead.coPrem = amt;
        currentLead.coReason = reason;
        currentLead.counterOfferStatus = true;
        
        currentLead.log.unshift({dot:'#F59E0B', text:`Counter offer received · Revised premium: ₹${amt}`, time:'Just now', user: window.IBM_ROLE === 'Manager' ? 'IBM Manager' : 'IBM Agent'});
        currentLead.showCounterOfferForm = false;
        currentLead.status = 'Underwriting'; currentLead.subStatus = 'Counter Offer';
        renderLeadDetail();
    };
    
    window.handleCustomerDecision = function(accepted) {
        if (accepted) {
            currentLead.log.unshift({dot:'#10B981', text:`Customer accepted counter offer`, time:'Just now', user: window.IBM_ROLE === 'Manager' ? 'IBM Manager' : 'IBM Agent'});
            currentLead.status = 'Policy Copy Upload'; currentLead.subStatus = ''; // Advances to Policy Copy Upload
            currentLead.counterOfferStatus = false;
            renderLeadDetail();
        } else {
            document.getElementById('lost-reason').value = 'Counter Offer Rejected';
            toggleModal('mark-lost-modal', true);
        }
    };

    window.simulatePolicyUpload = function() {
        currentLead.policyFileUploaded = true;
        renderLeadDetail();
    };

    window.removePolicyUpload = function() {
        currentLead.policyFileUploaded = false;
        renderLeadDetail();
    };

    window.moveToPolicyIssued = function() {
        currentLead.bucket = 'Policy Issued';
        currentLead.status = 'Policy Copy';
        currentLead.subStatus = 'Issued';
        currentLead.log.unshift({dot:'#10B981', text:`Policy copy uploaded · Lead moved to Policy Issued`, time:'Just now', user: window.IBM_ROLE === 'Manager' ? 'IBM Manager' : 'IBM Agent'});
        showToast('Policy copy uploaded. Lead moved to Policy Issued.', 'success');
        renderLeadDetail();
    };


    window.lockPlan = function(id, insurer, plan, premium) {
      currentLead.lockedPlan = id;
      currentLead.finalInsurer = insurer;
      currentLead.lockedPlanName = plan;
      currentLead.lockedPremium = premium;
      currentLead.productStatus = 'locked';
      
      if(!currentLead.log) currentLead.log = [];
      currentLead.log.unshift({
        type: 'Agent Update',
        by: 'Rohit M',
        text: 'Customer selected plan',
        desc: `${insurer} &middot; ${plan} &middot; ${premium}`,
        time: 'Just now'
      });
      renderLeadDetail();
    };

    window.unlockPlan = function() {
      currentLead.lockedPlan = null;
      currentLead.finalInsurer = null;
      currentLead.lockedPlanName = null;
      currentLead.lockedPremium = null;
      currentLead.productStatus = null;
      renderLeadDetail();
    };

    window.sharePaymentLink = function(method) {
      showToast('Payment link sent successfully');
      
      currentLead.paymentLinkShared = true;
      currentLead.status = 'Payment Link Shared';
      currentLead.subStatus = 'Awaiting Payment';
      
      if(!currentLead.log) currentLead.log = [];
      currentLead.log.unshift({
        type: 'Agent Update',
        by: 'Rohit M',
        text: `Payment link shared with customer via ${method}`,
        desc: `${currentLead.finalInsurer}`,
        time: 'Just now'
      });
      
      renderLeadDetail();
      setTimeout(() => {
         let sub = document.getElementById('detail-substatus');
         if (sub) {
             sub.value = 'Awaiting Payment';
             handleDetailSubStatusChange();
         }
      }, 50);
    };

    
    window.generateQuoteFromNew = function() {
        let reqCount = parseInt(document.getElementById('new-stage-completion')?.getAttribute('data-req') || '0');
        let filledCount = 0;
        let inputs = document.querySelectorAll('#detail-center input:not([disabled]), #detail-center select:not([disabled])');
        inputs.forEach(inp => {
            if(inp.type === 'radio' || inp.type === 'checkbox') return;
            if(inp.value.trim() !== '') filledCount++;
        });
        
        // If not all filled, just visually fail or ignore.
        // Assuming user filled it since it says "All required fields filled"
        
        let saveStatus = document.getElementById('new-stage-save-status');
        if(saveStatus) {
            saveStatus.style.display = 'block';
            saveStatus.innerText = 'Generating...';
        }
        
        setTimeout(() => {
            currentLead.bucket = 'Contacted'; // Moves to Contacted after Generate Quote
            if (!currentLead.log) currentLead.log = [];
            currentLead.log.unshift({
                type: 'System Update',
                by: 'Verification Agent',
                text: 'Quote generation initiated from NEW stage',
                desc: `Product: ${window.newStageActiveTab || 'Loan Protection'}`,
                time: 'Just now'
            });
            renderLeadDetail();
            renderLeadTable();
        }, 500);
    };

    window.generateQuoteFromContacted = function(reqCount) {
        let saveStatus = document.getElementById('contacted-stage-save-status');
        if(saveStatus) {
            saveStatus.style.display = 'block';
            saveStatus.innerText = 'Generating...';
        }
        
        setTimeout(() => {
            currentLead.quoteResultsVisible = true;
            if (!currentLead.log) currentLead.log = [];
            currentLead.log.unshift({
                type: 'System Update',
                by: 'Verification Agent',
                text: 'Quotes generated successfully',
                desc: `Product: ${window.newStageActiveTab || 'Loan Protection'}`,
                time: 'Just now'
            });
            renderLeadDetail();
            renderLeadTable();
        }, 500);
    };

    
    window.shareQuotesFromContacted = function(insurer, premium, method) {
        showSuccessToast('Quote shared successfully');
        window.selectedQuoteForPayment = {
             insurer: insurer,
             plan: 'Click2Protect', // mock
             premium: premium
        };
        currentLead.bucket = 'Quote';
        currentLead.status = 'Quote Shared';
        currentLead.subStatus = 'Consent Pending';
        if (!currentLead.log) currentLead.log = [];
        currentLead.log.unshift({ dot: '#10B981', text: `Agent Update &middot; User &middot; Quote shared with customer &middot; ${insurer} &middot; ${premium} &middot; via ${method}`, time: 'Just now' });
        renderLeadDetail();
        renderLeadTable();
        updateRightPanel();
    };

    window.sharePaymentLink = function(method) {
        showSuccessToast('Payment link shared with customer via ' + (method || 'WhatsApp'));
        window.paymentLinkShared = true;
        currentLead.status = 'Payment Link Shared';
        currentLead.subStatus = 'Awaiting Payment';
        currentLead.log.unshift({ dot: '#3B82F6', text: `Agent Update &middot; User &middot; Payment link sent to customer &middot; Just now`, time: 'Just now' });
        renderLeadDetail();
        renderLeadTable();
        updateRightPanel();
    };

    window.openPolicyBazaarWorkspace = function() {
        currentLead.pbOpened = true;
        renderLeadDetail();
        try {
            window.open('https://firebasestorage.googleapis.com/v0/b/ambak-cdn.appspot.com/o/mock-pb-dashboard.png?alt=media', '_blank');
        } catch (e) {
            console.error("Popup blocked or error:", e);
        }
    };
    
    // Bulk assign functions for the Lead Table
    window.enterBulkAssignMode = function() {
        window.bulkAssignMode = true;
        renderLeadTable();
    };
    
    window.exitBulkAssignMode = function() {
        window.bulkAssignMode = false;
        window.bulkSelectedLeads = [];
        renderLeadTable();
    };
    
    window.toggleAllBulkSelect = function(el) {
        let isChecked = el.checked;
        let cbs = document.querySelectorAll('.bulk-checkbox');
        cbs.forEach(cb => cb.checked = isChecked);
        if (isChecked) {
            window.bulkSelectedLeads = window.leads.map(l => l.id);
        } else {
            window.bulkSelectedLeads = [];
        }
    };
    
    window.openBulkAssignModal = function() {
        let selected = window.bulkSelectedLeads || [];
        if (selected.length === 0) {
            // If they just clicked checkboxes without using the global toggle
            let cbs = document.querySelectorAll('.bulk-checkbox:checked');
            selected = Array.from(cbs).map(cb => cb.getAttribute('data-id'));
            window.bulkSelectedLeads = selected;
        }
        if (selected.length === 0) {
            showToast('Select at least one lead');
            return;
        }
        let modal = document.getElementById('bulk-assign-modal');
        if(modal) {
            document.getElementById('bulk-assign-count').innerText = selected.length;
            modal.style.display = 'flex';
        }
    };
    
    window.confirmBulkAssign = function() {
        let rm = document.getElementById('bulk-rm-select').value;
        if (!rm) { showToast('Select an RM'); return; }
        let selected = window.bulkSelectedLeads || [];
        
        window.leads.forEach(l => {
            if (selected.includes(l.id)) {
                l.rmName = rm;
                l.rmAssignedAt = 'Just now';
            }
        });
        
        showSuccessToast(selected.length + ' leads assigned to ' + rm);
        document.getElementById('bulk-assign-modal').style.display = 'none';
        exitBulkAssignMode();
    };
    
    // Toggle Payment Share Popup
    window.togglePaymentSharePopup = function(event) {
        let existing = document.getElementById('payment-share-popup');
        if (existing) {
            existing.remove();
            return;
        }
        let target = event.currentTarget;
        let rect = target.getBoundingClientRect();
        let popup = document.createElement('div');
        popup.id = 'payment-share-popup';
        popup.style.position = 'absolute';
        popup.style.top = (rect.bottom + window.scrollY + 8) + 'px';
        popup.style.left = (rect.left + window.scrollX - (200 - rect.width)/2) + 'px';
        popup.style.width = '200px';
        popup.style.background = 'white';
        popup.style.border = '1px solid #E5E7EB';
        popup.style.borderRadius = '10px';
        popup.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
        popup.style.padding = '8px';
        popup.style.zIndex = '9999';
        popup.innerHTML = `
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; padding: 4px 8px; margin-bottom: 4px;">Share via</div>
            <div style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 6px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='transparent'" onclick="sharePaymentLink('WhatsApp'); document.getElementById('payment-share-popup').remove();">
               <div style="width: 24px; height: 24px; border-radius: 50%; background: #E6F4ED; color: #1A7A4A; display: flex; align-items: center; justify-content: center; font-size: 12px;">💬</div>
               <div style="font-size: 13px; font-weight: 600; color: #111827;">WhatsApp</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 6px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='transparent'" onclick="sharePaymentLink('Email'); document.getElementById('payment-share-popup').remove();">
               <div style="width: 24px; height: 24px; border-radius: 50%; background: #FDECEA; color: #C0392B; display: flex; align-items: center; justify-content: center; font-size: 12px;">✉️</div>
               <div style="font-size: 13px; font-weight: 600; color: #111827;">Email</div>
            </div>
        `;
        document.body.appendChild(popup);
        
        let handler = function(e) {
            if (!popup.contains(e.target) && e.target !== target && !target.contains(e.target)) {
                popup.remove();
                document.removeEventListener('click', handler);
            }
        };
        setTimeout(() => { document.addEventListener('click', handler); }, 50);
    };

    
    window.setSection = function(secName) {
        window.activeEditSection = secName;
        if (typeof renderRightPanel === 'function') renderRightPanel();
        else if (typeof updateRightPanel === 'function') updateRightPanel();
        else if (typeof renderLeadDetail === 'function') renderLeadDetail();
    };

    window.gCallOut = function(type) {
        if (type === 'call') {
            showToast('Dialing customer...');
        } else if (type === 'whatsapp') {
            showToast('Opening WhatsApp Web...');
        }
    };

    
    window.accordionState = {};
    window.toggleAccordion = function(id) {
        window.accordionState[id] = !window.accordionState[id];
        renderCenterPanel();
    };
    
    window.selectedLostReason = null;
    window.openLostModal = function() {
        document.getElementById('lostModal').style.display = 'flex';
        document.getElementById('lostModalLeadSummary').innerHTML = `<span style="font-weight:600; color:#111827; font-size:13px;">${currentLead.id}</span> <span style="color:#6B7280; font-size:13px;">· ${currentLead.name} · ${currentLead.product}</span>`;
        window.selectedLostReason = null;
        document.getElementById('lostRemarks').value = '';
        renderLostChips();
    };
    window.closeLostModal = function() {
        document.getElementById('lostModal').style.display = 'none';
    };
    window.selectLostReason = function(reason) {
        window.selectedLostReason = reason;
        renderLostChips();
    };
    window.renderLostChips = function() {
        let chips = document.getElementById('lostReasonChips').children;
        for(let chip of chips) {
            if (chip.innerText === window.selectedLostReason) {
                chip.style.background = '#FEE2E2';
                chip.style.color = '#B91C1C';
                chip.style.borderColor = '#B91C1C';
            } else {
                chip.style.background = 'white';
                chip.style.color = 'var(--text-muted)';
                chip.style.borderColor = 'var(--border)';
            }
        }
        document.getElementById('lostConfirmBtn').disabled = !window.selectedLostReason;
        document.getElementById('lostConfirmBtn').style.opacity = window.selectedLostReason ? '1' : '0.5';
    };
    window.confirmMarkAsLost = function() {
        let remarks = document.getElementById('lostRemarks').value;
        currentLead.status = 'Lost';
        currentLead.lostReason = window.selectedLostReason;
        currentLead.log.unshift({
            type: 'System Update',
            by: 'IBM Agent',
            text: 'Lead marked as Lost',
            desc: `Reason: ${window.selectedLostReason}${remarks ? ' - ' + remarks : ''}`,
            time: 'Just now',
            dot: '#C0392B'
        });
        closeLostModal();
        renderLeadDetail();
        renderLeadTable();
        showToast('Lead marked as Lost');
    };
    window.reopenLead = function() {
        currentLead.status = currentLead.bucket; // Revert to bucket status
        currentLead.log.unshift({
            type: 'System Update',
            by: 'IBM Manager',
            text: 'Lead reopened',
            desc: '',
            time: 'Just now',
            dot: '#10B981'
        });
        renderLeadDetail();
        renderLeadTable();
        showToast('Lead reopened successfully');
    };
    
    
    window.openBulkUploadModal = function() {
        document.getElementById('bulkUploadModal').style.display = 'flex';
        setTimeout(() => { document.getElementById('bulkUploadModal').style.opacity = '1'; }, 10);
    };
    window.closeBulkUploadModal = function() {
        document.getElementById('bulkUploadModal').style.display = 'none';
        document.getElementById('bulkUploadModal').style.opacity = '0';
    };

    // Init






    window.openPolicyBazaar = function() {
      currentLead.pbOpened = true;
      renderLeadDetail();
      try {
        window.open('https://firebasestorage.googleapis.com/v0/b/ambak-cdn.appspot.com/o/mock-pb-dashboard.png?alt=media', '_blank');
      } catch (e) {
        console.error("Popup blocked or error:", e);
      }
    };

    window.triggerQuoteExtraction = function() {
      window.isQuoteExtracting = true;
      renderLeadDetail();
      setTimeout(() => {
        window.isQuoteExtracting = false;
        window.quoteExtracted = true;
        window.selectedExtractedQuotes = new Set(['eq1', 'eq2', 'eq3']);
        renderLeadDetail();
      }, 1500);
    };

    window.toggleExtractedQuote = function(id, checked) {
      if(!window.selectedExtractedQuotes) window.selectedExtractedQuotes = new Set();
      if(checked) {
        window.selectedExtractedQuotes.add(id);
      } else {
        window.selectedExtractedQuotes.delete(id);
      }
      renderLeadDetail();
    };

    window.toggleAllExtractedQuotes = function(checked) {
      if(!window.selectedExtractedQuotes) window.selectedExtractedQuotes = new Set();
      if(checked) {
        window.selectedExtractedQuotes.add('eq1');
        window.selectedExtractedQuotes.add('eq2');
        window.selectedExtractedQuotes.add('eq3');
      } else {
        window.selectedExtractedQuotes.clear();
      }
      renderLeadDetail();
    };

    window.shareQuotes = function(method, count=1) {
      showToast('Quote shared successfully');
      
      currentLead.status = 'Quote Shared';
      currentLead.subStatus = 'Consent Pending';
      
      if(!currentLead.log) currentLead.log = [];
      
      let pMap = {
        'lp': 'Loan Protection',
        'property': 'Property Insurance',
        'cl': 'Credit Life',
        'tp': 'Term Plan'
      };
      
      let prodName = pMap[currentLead.finalProduct || currentLead.initialProduct] || 'Insurance';
      
      let descText = '';
      if (currentLead.finalProduct === 'lp' || !currentLead.finalProduct) {
         descText = `Quote shared via ${method}. Premium: ₹12,500.`;
      } else {
         descText = `${count} insurer quotes shared via ${method}.`;
      }
      
      currentLead.log.unshift({
        type: 'Agent Update',
        by: 'Rohit M',
        text: 'Quote shared with customer',
        desc: descText,
        time: 'Just now'
      });
      
      renderLeadDetail();
      setTimeout(() => {
         let sub = document.getElementById('detail-substatus');
         if (sub) {
             sub.value = 'Consent Pending';
             handleDetailSubStatusChange();
         }
      }, 50);
    };

    
    window.generateQuoteFromNew = function() {
        let reqCount = parseInt(document.getElementById('new-stage-completion')?.getAttribute('data-req') || '0');
        let filledCount = 0;
        let inputs = document.querySelectorAll('#detail-center input:not([disabled]), #detail-center select:not([disabled])');
        inputs.forEach(inp => {
            if(inp.type === 'radio' || inp.type === 'checkbox') return;
            if(inp.value.trim() !== '') filledCount++;
        });
        
        // If not all filled, just visually fail or ignore.
        // Assuming user filled it since it says "All required fields filled"
        
        let saveStatus = document.getElementById('new-stage-save-status');
        if(saveStatus) {
            saveStatus.style.display = 'block';
            saveStatus.innerText = 'Generating...';
        }
        
        setTimeout(() => {
            currentLead.bucket = 'Contacted'; // Moves to Contacted after Generate Quote
            if (!currentLead.log) currentLead.log = [];
            currentLead.log.unshift({
                type: 'System Update',
                by: 'Verification Agent',
                text: 'Quote generation initiated from NEW stage',
                desc: `Product: ${window.newStageActiveTab || 'Loan Protection'}`,
                time: 'Just now'
            });
            renderLeadDetail();
            renderLeadTable();
        }, 500);
    };

    window.generateQuoteFromContacted = function(reqCount) {
        let saveStatus = document.getElementById('contacted-stage-save-status');
        if(saveStatus) {
            saveStatus.style.display = 'block';
            saveStatus.innerText = 'Generating...';
        }
        
        setTimeout(() => {
            currentLead.quoteResultsVisible = true;
            if (!currentLead.log) currentLead.log = [];
            currentLead.log.unshift({
                type: 'System Update',
                by: 'Verification Agent',
                text: 'Quotes generated successfully',
                desc: `Product: ${window.newStageActiveTab || 'Loan Protection'}`,
                time: 'Just now'
            });
            renderLeadDetail();
            renderLeadTable();
        }, 500);
    };

    
    window.shareQuotesFromContacted = function(insurer, premium, method) {
        showSuccessToast('Quote shared successfully');
        window.selectedQuoteForPayment = {
             insurer: insurer,
             plan: 'Click2Protect', // mock
             premium: premium
        };
        currentLead.bucket = 'Quote';
        currentLead.status = 'Quote Shared';
        currentLead.subStatus = 'Consent Pending';
        if (!currentLead.log) currentLead.log = [];
        currentLead.log.unshift({ dot: '#10B981', text: `Agent Update &middot; User &middot; Quote shared with customer &middot; ${insurer} &middot; ${premium} &middot; via ${method}`, time: 'Just now' });
        renderLeadDetail();
        renderLeadTable();
        updateRightPanel();
    };

    window.sharePaymentLink = function(method) {
        showSuccessToast('Payment link shared with customer via ' + (method || 'WhatsApp'));
        window.paymentLinkShared = true;
        currentLead.status = 'Payment Link Shared';
        currentLead.subStatus = 'Awaiting Payment';
        currentLead.log.unshift({ dot: '#3B82F6', text: `Agent Update &middot; User &middot; Payment link sent to customer &middot; Just now`, time: 'Just now' });
        renderLeadDetail();
        renderLeadTable();
        updateRightPanel();
    };

    window.openPolicyBazaarWorkspace = function() {
        currentLead.pbOpened = true;
        renderLeadDetail();
        try {
            window.open('https://firebasestorage.googleapis.com/v0/b/ambak-cdn.appspot.com/o/mock-pb-dashboard.png?alt=media', '_blank');
        } catch (e) {
            console.error("Popup blocked or error:", e);
        }
    };
    
    // Bulk assign functions for the Lead Table
    window.enterBulkAssignMode = function() {
        window.bulkAssignMode = true;
        renderLeadTable();
    };
    
    window.exitBulkAssignMode = function() {
        window.bulkAssignMode = false;
        window.bulkSelectedLeads = [];
        renderLeadTable();
    };
    
    window.toggleAllBulkSelect = function(el) {
        let isChecked = el.checked;
        let cbs = document.querySelectorAll('.bulk-checkbox');
        cbs.forEach(cb => cb.checked = isChecked);
        if (isChecked) {
            window.bulkSelectedLeads = window.leads.map(l => l.id);
        } else {
            window.bulkSelectedLeads = [];
        }
    };
    
    window.openBulkAssignModal = function() {
        let selected = window.bulkSelectedLeads || [];
        if (selected.length === 0) {
            // If they just clicked checkboxes without using the global toggle
            let cbs = document.querySelectorAll('.bulk-checkbox:checked');
            selected = Array.from(cbs).map(cb => cb.getAttribute('data-id'));
            window.bulkSelectedLeads = selected;
        }
        if (selected.length === 0) {
            showToast('Select at least one lead');
            return;
        }
        let modal = document.getElementById('bulk-assign-modal');
        if(modal) {
            document.getElementById('bulk-assign-count').innerText = selected.length;
            modal.style.display = 'flex';
        }
    };
    
    window.confirmBulkAssign = function() {
        let rm = document.getElementById('bulk-rm-select').value;
        if (!rm) { showToast('Select an RM'); return; }
        let selected = window.bulkSelectedLeads || [];
        
        window.leads.forEach(l => {
            if (selected.includes(l.id)) {
                l.rmName = rm;
                l.rmAssignedAt = 'Just now';
            }
        });
        
        showSuccessToast(selected.length + ' leads assigned to ' + rm);
        document.getElementById('bulk-assign-modal').style.display = 'none';
        exitBulkAssignMode();
    };
    
    // Toggle Payment Share Popup
    window.togglePaymentSharePopup = function(event) {
        let existing = document.getElementById('payment-share-popup');
        if (existing) {
            existing.remove();
            return;
        }
        let target = event.currentTarget;
        let rect = target.getBoundingClientRect();
        let popup = document.createElement('div');
        popup.id = 'payment-share-popup';
        popup.style.position = 'absolute';
        popup.style.top = (rect.bottom + window.scrollY + 8) + 'px';
        popup.style.left = (rect.left + window.scrollX - (200 - rect.width)/2) + 'px';
        popup.style.width = '200px';
        popup.style.background = 'white';
        popup.style.border = '1px solid #E5E7EB';
        popup.style.borderRadius = '10px';
        popup.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
        popup.style.padding = '8px';
        popup.style.zIndex = '9999';
        popup.innerHTML = `
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; padding: 4px 8px; margin-bottom: 4px;">Share via</div>
            <div style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 6px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='transparent'" onclick="sharePaymentLink('WhatsApp'); document.getElementById('payment-share-popup').remove();">
               <div style="width: 24px; height: 24px; border-radius: 50%; background: #E6F4ED; color: #1A7A4A; display: flex; align-items: center; justify-content: center; font-size: 12px;">💬</div>
               <div style="font-size: 13px; font-weight: 600; color: #111827;">WhatsApp</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 6px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='transparent'" onclick="sharePaymentLink('Email'); document.getElementById('payment-share-popup').remove();">
               <div style="width: 24px; height: 24px; border-radius: 50%; background: #FDECEA; color: #C0392B; display: flex; align-items: center; justify-content: center; font-size: 12px;">✉️</div>
               <div style="font-size: 13px; font-weight: 600; color: #111827;">Email</div>
            </div>
        `;
        document.body.appendChild(popup);
        
        let handler = function(e) {
            if (!popup.contains(e.target) && e.target !== target && !target.contains(e.target)) {
                popup.remove();
                document.removeEventListener('click', handler);
            }
        };
        setTimeout(() => { document.addEventListener('click', handler); }, 50);
    };

    
    window.setSection = function(secName) {
        window.activeEditSection = secName;
        if (typeof renderRightPanel === 'function') renderRightPanel();
        else if (typeof updateRightPanel === 'function') updateRightPanel();
        else if (typeof renderLeadDetail === 'function') renderLeadDetail();
    };

    window.gCallOut = function(type) {
        if (type === 'call') {
            showToast('Dialing customer...');
        } else if (type === 'whatsapp') {
            showToast('Opening WhatsApp Web...');
        }
    };

    
    window.accordionState = {};
    window.toggleAccordion = function(id) {
        window.accordionState[id] = !window.accordionState[id];
        renderCenterPanel();
    };
    
    window.selectedLostReason = null;
    window.openLostModal = function() {
        document.getElementById('lostModal').style.display = 'flex';
        document.getElementById('lostModalLeadSummary').innerHTML = `<span style="font-weight:600; color:#111827; font-size:13px;">${currentLead.id}</span> <span style="color:#6B7280; font-size:13px;">· ${currentLead.name} · ${currentLead.product}</span>`;
        window.selectedLostReason = null;
        document.getElementById('lostRemarks').value = '';
        renderLostChips();
    };
    window.closeLostModal = function() {
        document.getElementById('lostModal').style.display = 'none';
    };
    window.selectLostReason = function(reason) {
        window.selectedLostReason = reason;
        renderLostChips();
    };
    window.renderLostChips = function() {
        let chips = document.getElementById('lostReasonChips').children;
        for(let chip of chips) {
            if (chip.innerText === window.selectedLostReason) {
                chip.style.background = '#FEE2E2';
                chip.style.color = '#B91C1C';
                chip.style.borderColor = '#B91C1C';
            } else {
                chip.style.background = 'white';
                chip.style.color = 'var(--text-muted)';
                chip.style.borderColor = 'var(--border)';
            }
        }
        document.getElementById('lostConfirmBtn').disabled = !window.selectedLostReason;
        document.getElementById('lostConfirmBtn').style.opacity = window.selectedLostReason ? '1' : '0.5';
    };
    window.confirmMarkAsLost = function() {
        let remarks = document.getElementById('lostRemarks').value;
        currentLead.status = 'Lost';
        currentLead.lostReason = window.selectedLostReason;
        currentLead.log.unshift({
            type: 'System Update',
            by: 'IBM Agent',
            text: 'Lead marked as Lost',
            desc: `Reason: ${window.selectedLostReason}${remarks ? ' - ' + remarks : ''}`,
            time: 'Just now',
            dot: '#C0392B'
        });
        closeLostModal();
        renderLeadDetail();
        renderLeadTable();
        showToast('Lead marked as Lost');
    };
    window.reopenLead = function() {
        currentLead.status = currentLead.bucket; // Revert to bucket status
        currentLead.log.unshift({
            type: 'System Update',
            by: 'IBM Manager',
            text: 'Lead reopened',
            desc: '',
            time: 'Just now',
            dot: '#10B981'
        });
        renderLeadDetail();
        renderLeadTable();
        showToast('Lead reopened successfully');
    };
    
    
    window.openBulkUploadModal = function() {
        document.getElementById('bulkUploadModal').style.display = 'flex';
        setTimeout(() => { document.getElementById('bulkUploadModal').style.opacity = '1'; }, 10);
    };
    window.closeBulkUploadModal = function() {
        document.getElementById('bulkUploadModal').style.display = 'none';
        document.getElementById('bulkUploadModal').style.opacity = '0';
    };

    // Init






    window.toggleSharePopup = function(event, insurer, premium) {
        event.stopPropagation();
        let existing = document.getElementById('share-popup');
        if (existing) {
           existing.remove();
           // if clicking the same button, just close it
           if (existing.dataset.insurer === insurer) return;
        }
        
        let target = event.currentTarget;
        let rect = target.getBoundingClientRect();
        
        let popup = document.createElement('div');
        popup.id = 'share-popup';
        popup.dataset.insurer = insurer;
        popup.style.position = 'absolute';
        popup.style.top = (rect.bottom + window.scrollY + 8) + 'px';
        popup.style.left = (rect.left + window.scrollX - (200 - rect.width)/2) + 'px'; // roughly centered
        popup.style.width = '200px';
        popup.style.background = 'white';
        popup.style.border = '1px solid #E5E7EB';
        popup.style.borderRadius = '10px';
        popup.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
        popup.style.padding = '8px';
        popup.style.zIndex = '9999';
        
        popup.innerHTML = `
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; padding: 4px 8px; margin-bottom: 4px;">Share via</div>
            <div style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 6px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='transparent'" onclick="shareQuotesFromContacted('${insurer}', '${premium}', 'WhatsApp'); document.getElementById('share-popup').remove();">
               <div style="width: 24px; height: 24px; border-radius: 50%; background: #25D366; color: white; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">WA</div>
               <div style="font-size: 13px; font-weight: 600; color: #111827;">WhatsApp</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 6px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='transparent'" onclick="shareQuotesFromContacted('${insurer}', '${premium}', 'Email'); document.getElementById('share-popup').remove();">
               <div style="width: 24px; height: 24px; border-radius: 50%; background: #EA4335; color: white; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">EM</div>
               <div style="font-size: 13px; font-weight: 600; color: #111827;">Email</div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // close on outside click
        setTimeout(() => {
            document.addEventListener('click', function closePopup(e) {
                if(!popup.contains(e.target)) {
                    popup.remove();
                    document.removeEventListener('click', closePopup);
                }
            });
        }, 0);
    };



    window.generateQuoteFromNew = function() {
        let reqCount = parseInt(document.getElementById('new-stage-completion')?.getAttribute('data-req') || '0');
        let filledCount = 0;
        let inputs = document.querySelectorAll('#detail-center input:not([disabled]), #detail-center select:not([disabled])');
        inputs.forEach(inp => {
            if(inp.type === 'radio' || inp.type === 'checkbox') return;
            if(inp.value.trim() !== '') filledCount++;
        });
        
        // If not all filled, just visually fail or ignore.
        // Assuming user filled it since it says "All required fields filled"
        
        let saveStatus = document.getElementById('new-stage-save-status');
        if(saveStatus) {
            saveStatus.style.display = 'block';
            saveStatus.innerText = 'Generating...';
        }
        
        setTimeout(() => {
            currentLead.bucket = 'Contacted'; // Moves to Contacted after Generate Quote
            if (!currentLead.log) currentLead.log = [];
            currentLead.log.unshift({
                type: 'System Update',
                by: 'Verification Agent',
                text: 'Quote generation initiated from NEW stage',
                desc: `Product: ${window.newStageActiveTab || 'Loan Protection'}`,
                time: 'Just now'
            });
            renderLeadDetail();
            renderLeadTable();
        }, 500);
    };

    window.generateQuoteFromContacted = function(reqCount) {
        let saveStatus = document.getElementById('contacted-stage-save-status');
        if(saveStatus) {
            saveStatus.style.display = 'block';
            saveStatus.innerText = 'Generating...';
        }
        
        setTimeout(() => {
            currentLead.quoteResultsVisible = true;
            if (!currentLead.log) currentLead.log = [];
            currentLead.log.unshift({
                type: 'System Update',
                by: 'Verification Agent',
                text: 'Quotes generated successfully',
                desc: `Product: ${window.newStageActiveTab || 'Loan Protection'}`,
                time: 'Just now'
            });
            renderLeadDetail();
            renderLeadTable();
        }, 500);
    };

    
    window.shareQuotesFromContacted = function(insurer, premium, method) {
        showSuccessToast('Quote shared successfully');
        window.selectedQuoteForPayment = {
             insurer: insurer,
             plan: 'Click2Protect', // mock
             premium: premium
        };
        currentLead.bucket = 'Quote';
        currentLead.status = 'Quote Shared';
        currentLead.subStatus = 'Consent Pending';
        if (!currentLead.log) currentLead.log = [];
        currentLead.log.unshift({ dot: '#10B981', text: `Agent Update &middot; User &middot; Quote shared with customer &middot; ${insurer} &middot; ${premium} &middot; via ${method}`, time: 'Just now' });
        renderLeadDetail();
        renderLeadTable();
        updateRightPanel();
    };

    window.sharePaymentLink = function(method) {
        showSuccessToast('Payment link shared with customer via ' + (method || 'WhatsApp'));
        window.paymentLinkShared = true;
        currentLead.status = 'Payment Link Shared';
        currentLead.subStatus = 'Awaiting Payment';
        currentLead.log.unshift({ dot: '#3B82F6', text: `Agent Update &middot; User &middot; Payment link sent to customer &middot; Just now`, time: 'Just now' });
        renderLeadDetail();
        renderLeadTable();
        updateRightPanel();
    };

    window.openPolicyBazaarWorkspace = function() {
        currentLead.pbOpened = true;
        renderLeadDetail();
        try {
            window.open('https://firebasestorage.googleapis.com/v0/b/ambak-cdn.appspot.com/o/mock-pb-dashboard.png?alt=media', '_blank');
        } catch (e) {
            console.error("Popup blocked or error:", e);
        }
    };
    
    // Bulk assign functions for the Lead Table
    window.enterBulkAssignMode = function() {
        window.bulkAssignMode = true;
        renderLeadTable();
    };
    
    window.exitBulkAssignMode = function() {
        window.bulkAssignMode = false;
        window.bulkSelectedLeads = [];
        renderLeadTable();
    };
    
    window.toggleAllBulkSelect = function(el) {
        let isChecked = el.checked;
        let cbs = document.querySelectorAll('.bulk-checkbox');
        cbs.forEach(cb => cb.checked = isChecked);
        if (isChecked) {
            window.bulkSelectedLeads = window.leads.map(l => l.id);
        } else {
            window.bulkSelectedLeads = [];
        }
    };
    
    window.openBulkAssignModal = function() {
        let selected = window.bulkSelectedLeads || [];
        if (selected.length === 0) {
            // If they just clicked checkboxes without using the global toggle
            let cbs = document.querySelectorAll('.bulk-checkbox:checked');
            selected = Array.from(cbs).map(cb => cb.getAttribute('data-id'));
            window.bulkSelectedLeads = selected;
        }
        if (selected.length === 0) {
            showToast('Select at least one lead');
            return;
        }
        let modal = document.getElementById('bulk-assign-modal');
        if(modal) {
            document.getElementById('bulk-assign-count').innerText = selected.length;
            modal.style.display = 'flex';
        }
    };
    
    window.confirmBulkAssign = function() {
        let rm = document.getElementById('bulk-rm-select').value;
        if (!rm) { showToast('Select an RM'); return; }
        let selected = window.bulkSelectedLeads || [];
        
        window.leads.forEach(l => {
            if (selected.includes(l.id)) {
                l.rmName = rm;
                l.rmAssignedAt = 'Just now';
            }
        });
        
        showSuccessToast(selected.length + ' leads assigned to ' + rm);
        document.getElementById('bulk-assign-modal').style.display = 'none';
        exitBulkAssignMode();
    };
    
    // Toggle Payment Share Popup
    window.togglePaymentSharePopup = function(event) {
        let existing = document.getElementById('payment-share-popup');
        if (existing) {
            existing.remove();
            return;
        }
        let target = event.currentTarget;
        let rect = target.getBoundingClientRect();
        let popup = document.createElement('div');
        popup.id = 'payment-share-popup';
        popup.style.position = 'absolute';
        popup.style.top = (rect.bottom + window.scrollY + 8) + 'px';
        popup.style.left = (rect.left + window.scrollX - (200 - rect.width)/2) + 'px';
        popup.style.width = '200px';
        popup.style.background = 'white';
        popup.style.border = '1px solid #E5E7EB';
        popup.style.borderRadius = '10px';
        popup.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
        popup.style.padding = '8px';
        popup.style.zIndex = '9999';
        popup.innerHTML = `
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; padding: 4px 8px; margin-bottom: 4px;">Share via</div>
            <div style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 6px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='transparent'" onclick="sharePaymentLink('WhatsApp'); document.getElementById('payment-share-popup').remove();">
               <div style="width: 24px; height: 24px; border-radius: 50%; background: #E6F4ED; color: #1A7A4A; display: flex; align-items: center; justify-content: center; font-size: 12px;">💬</div>
               <div style="font-size: 13px; font-weight: 600; color: #111827;">WhatsApp</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 6px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='transparent'" onclick="sharePaymentLink('Email'); document.getElementById('payment-share-popup').remove();">
               <div style="width: 24px; height: 24px; border-radius: 50%; background: #FDECEA; color: #C0392B; display: flex; align-items: center; justify-content: center; font-size: 12px;">✉️</div>
               <div style="font-size: 13px; font-weight: 600; color: #111827;">Email</div>
            </div>
        `;
        document.body.appendChild(popup);
        
        let handler = function(e) {
            if (!popup.contains(e.target) && e.target !== target && !target.contains(e.target)) {
                popup.remove();
                document.removeEventListener('click', handler);
            }
        };
        setTimeout(() => { document.addEventListener('click', handler); }, 50);
    };

    
    window.setSection = function(secName) {
        window.activeEditSection = secName;
        if (typeof renderRightPanel === 'function') renderRightPanel();
        else if (typeof updateRightPanel === 'function') updateRightPanel();
        else if (typeof renderLeadDetail === 'function') renderLeadDetail();
    };

    window.gCallOut = function(type) {
        if (type === 'call') {
            showToast('Dialing customer...');
        } else if (type === 'whatsapp') {
            showToast('Opening WhatsApp Web...');
        }
    };

    
    window.accordionState = {};
    window.toggleAccordion = function(id) {
        window.accordionState[id] = !window.accordionState[id];
        renderCenterPanel();
    };
    
    window.selectedLostReason = null;
    window.openLostModal = function() {
        document.getElementById('lostModal').style.display = 'flex';
        document.getElementById('lostModalLeadSummary').innerHTML = `<span style="font-weight:600; color:#111827; font-size:13px;">${currentLead.id}</span> <span style="color:#6B7280; font-size:13px;">· ${currentLead.name} · ${currentLead.product}</span>`;
        window.selectedLostReason = null;
        document.getElementById('lostRemarks').value = '';
        renderLostChips();
    };
    window.closeLostModal = function() {
        document.getElementById('lostModal').style.display = 'none';
    };
    window.selectLostReason = function(reason) {
        window.selectedLostReason = reason;
        renderLostChips();
    };
    window.renderLostChips = function() {
        let chips = document.getElementById('lostReasonChips').children;
        for(let chip of chips) {
            if (chip.innerText === window.selectedLostReason) {
                chip.style.background = '#FEE2E2';
                chip.style.color = '#B91C1C';
                chip.style.borderColor = '#B91C1C';
            } else {
                chip.style.background = 'white';
                chip.style.color = 'var(--text-muted)';
                chip.style.borderColor = 'var(--border)';
            }
        }
        document.getElementById('lostConfirmBtn').disabled = !window.selectedLostReason;
        document.getElementById('lostConfirmBtn').style.opacity = window.selectedLostReason ? '1' : '0.5';
    };
    window.confirmMarkAsLost = function() {
        let remarks = document.getElementById('lostRemarks').value;
        currentLead.status = 'Lost';
        currentLead.lostReason = window.selectedLostReason;
        currentLead.log.unshift({
            type: 'System Update',
            by: 'IBM Agent',
            text: 'Lead marked as Lost',
            desc: `Reason: ${window.selectedLostReason}${remarks ? ' - ' + remarks : ''}`,
            time: 'Just now',
            dot: '#C0392B'
        });
        closeLostModal();
        renderLeadDetail();
        renderLeadTable();
        showToast('Lead marked as Lost');
    };
    window.reopenLead = function() {
        currentLead.status = currentLead.bucket; // Revert to bucket status
        currentLead.log.unshift({
            type: 'System Update',
            by: 'IBM Manager',
            text: 'Lead reopened',
            desc: '',
            time: 'Just now',
            dot: '#10B981'
        });
        renderLeadDetail();
        renderLeadTable();
        showToast('Lead reopened successfully');
    };
    
    
    window.openBulkUploadModal = function() {
        document.getElementById('bulkUploadModal').style.display = 'flex';
        setTimeout(() => { document.getElementById('bulkUploadModal').style.opacity = '1'; }, 10);
    };
    window.closeBulkUploadModal = function() {
        document.getElementById('bulkUploadModal').style.display = 'none';
        document.getElementById('bulkUploadModal').style.opacity = '0';
    };

    // Init




    renderPipelineCards();
    renderLeadTable();
  