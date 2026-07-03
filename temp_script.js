
    // === GLOBAL STATE ===
    let currentLead = null;
    window.bulkAssignMode = false;
    window.selectedBulkLeads = new Set();
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
    const BUCKETS = ['New', 'Contacted', 'Quote', 'Payment Done', 'Policy', 'Lost'];

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
        'Quote Shared': { subStatuses: ['Consent Pending', 'Exploring Options', 'Visit Requested'], mandatoryFollowUp: true, pendingWith: 'Customer', nextBucket: 'Payment Done' },
        'Payment Link Shared': { subStatuses: ['Awaiting Payment', 'Link Not Working', 'Resend Requested'], mandatoryFollowUp: true, pendingWith: 'Customer', nextBucket: 'Payment Done' },
        'Payment Done': { subStatuses: ['Verification Pending', 'Verification Failed', 'Verified'], mandatoryFollowUp: false, pendingWith: 'Ambak Operations', nextBucket: 'Policy' }
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
            nextBucket: 'Policy',
            conditionNextBucket: (subStatus) => subStatus === 'Issued' ? 'Policy' : 'Payment Done',
            mandatoryUpload: (subStatus) => subStatus === 'Issued' ? 'Policy Copy' : null
          }
        }
      },
      'Policy': {
        statuses: {
          'Policy Issued': {
            subStatuses: ['Shared With Customer', 'Acknowledged'],
            mandatoryFollowUp: false,
            pendingWith: 'None',
            nextBucket: 'Policy'
          },
          'MIS': {
            subStatuses: ['Pending', 'Received'],
            mandatoryFollowUp: false,
            pendingWith: 'Ambak Operations',
            nextBucket: 'Policy'
          },
          'Commission': {
            subStatuses: ['Pending', 'Received'],
            mandatoryFollowUp: false,
            pendingWith: 'Finance Team',
            nextBucket: 'Policy'
          },
          'Freelook Period': {
            subStatuses: ['Active', 'Completed', 'Policy Cancelled'],
            mandatoryFollowUp: false,
            pendingWith: 'None',
            nextBucket: 'Policy'
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

    
    window.showSuccessToast = function(msg) {
        let toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.top = '24px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = '#E6F4ED';
        toast.style.color = '#1A7A4A';
        toast.style.padding = '8px 14px';
        toast.style.borderRadius = '6px';
        toast.style.fontWeight = '600';
        toast.style.fontSize = '12px';
        toast.style.zIndex = '9999';
        toast.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
        toast.innerText = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };

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
        let statusText = l.status || '-';
        let subStatusText = l.subStatus ? `(${l.subStatus})` : '';
        
        let insurer = l.finalInsurer || (l.selectedPlan ? l.selectedPlan.insurer : '');
        let insurerText = insurer ? insurer : 'Unassigned';
        
        let leadAge = 'Just now';
        let createdDateStr = '15 Jun 2026'; // Mock static date per prompt
        if (l.createdAt) {
           let diffMs = Date.now() - new Date(l.createdAt).getTime();
           let diffDays = Math.floor(diffMs / 86400000);
           if (diffDays === 0) leadAge = 'Just now';
           else if (diffDays === 1) leadAge = '1 day ago';
           else leadAge = `${diffDays} days ago`;
           
           let d = new Date(l.createdAt);
           const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
           createdDateStr = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
        }
        
        // Next follow up color
        let nextFup = l.followUpDate || 'No Follow-up';
        let fupColor = nextFup.toLowerCase().includes('overdue') ? '#DC2626' : 'inherit';
        
        const bucketBgMap = { 'New': '#EFF6FF', 'Contacted': '#FFFBEB', 'Quote': '#EEEDFE', 'Payment Done': '#F0FDFA', 'Policy': '#F0FDF4', 'Lost': '#FEF2F2' };
        const bucketColorMap = { 'New': '#1E40AF', 'Contacted': '#B45309', 'Quote': '#4C1D95', 'Payment Done': '#0F766E', 'Policy': '#15803D', 'Lost': '#991B1B' };
        let bBg = bucketBgMap[l.bucket] || '#F3F4F6';
        let bColor = bucketColorMap[l.bucket] || 'var(--text-heading)';
        
        let loanHtml = '';
        if(l.hlLead || l.si) {
            let amt = l.si ? formatLakhs(l.si) : '—';
            let bank = (l.hlLead && l.hlLead.bank) ? l.hlLead.bank : (l.loanBank || 'Unknown');
            let stage = (l.hlLead && l.hlLead.hlStage) ? getStageLabel(l.hlLead.hlStage) : '—';
            loanHtml = `
              <div style="font-weight:600; font-size:13px; color:var(--text-heading);">${amt} &middot; ${bank}</div>
              <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${stage}</div>
            `;
        } else {
            loanHtml = `<div style="color: #9CA3AF; font-size:13px;">—</div>`;
        }
        
        let partnerName = 'E2E Sales'; // Mock
        let rmName = 'Ambak BM'; // Mock
        
        
        let isSelected = window.selectedBulkLeads && window.selectedBulkLeads.has(l.id);
        let rowBg = (window.bulkAssignMode && isSelected) ? '#F0EEFB' : '';
        let rowBorder = (window.bulkAssignMode && isSelected) ? 'box-shadow: inset 3px 0 0 0 #473391;' : '';
        let onClickAction = window.bulkAssignMode ? `toggleBulkSelect('${l.id}')` : `openLead('${l.id}')`;
        let currentAgent = l.agent || 'Rohit M';
        let assigneeOptions = ['Rohit M', 'Priya S', 'Ambak BM'].map(n => `<option ${currentAgent === n ? 'selected' : ''}>${n}</option>`).join('');

        html += `
          <tr onclick="${onClickAction}" style="cursor:pointer; background:${rowBg}; ${rowBorder}" class="table-row-hover">
            ${window.bulkAssignMode ? `
            <td style="width: 40px; padding-right: 0;">
              <input type="checkbox" style="width: 16px; height: 16px; accent-color: #473391; pointer-events: none;" ${isSelected ? 'checked' : ''}>
            </td>
            ` : ''}
            <td>
              <div style="font-weight:700; color:#473391; cursor:pointer;">${l.id}</div>
            </td>
            <td>
              <div class="lead-name" style="font-weight:700; color:var(--text-heading);">${l.name}</div>
              <div class="lead-phone" style="font-size:12px; color:var(--text-muted); margin-top:2px;">${l.phone}</div>
            </td>
            <td>
              <div style="font-weight:700; color:var(--text-heading);">${getProductLabel(l.finalProduct || l.initialProduct)}</div>
              <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">${insurerText}</div>
            </td>
            <td>
              ${loanHtml}
            </td>
            <td>
              <span class="badge" style="background:${bBg}; color:${bColor};">${l.bucket}</span>
              <div style="font-weight:700; font-size:13px; margin-top:4px; color:var(--text-heading);">${statusText} ${subStatusText ? `<span style="font-size:11px; color:#6B7280; font-weight:normal;">${subStatusText}</span>` : ''}</div>
            </td>
            <td>
              <div style="font-weight:600; font-size:13px; color:var(--text-heading); text-transform:capitalize;">${l.source || 'Manual'}</div>
              <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Website</div>
            </td>
            <td>
              <div style="font-weight:500; font-size:13px; color:var(--text-heading);">${partnerName}</div>
            </td>
            <td>
              <div style="font-weight:500; font-size:13px; color:var(--text-heading);">${rmName}</div>
            </td>
            <td>
               <div style="font-weight:600; font-size:13px; color:${fupColor};">${nextFup}</div>
            </td>
            <td>
               <div style="font-weight:500; font-size:13px; color:var(--text-heading);">${createdDateStr}</div>
               <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${leadAge}</div>
            </td>
            <td>
               <select class="search-input" style="min-width:100px; font-size:12px; font-weight:600; padding:4px 8px; height:auto; margin:0; border-radius:6px; cursor:pointer;" onclick="event.stopPropagation()">
                 ${assigneeOptions}
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
              <div style="font-size: 13px; font-weight: 600; color: #111827;">${l.hlLead ? '₹' + formatLakhs(l.hlLead.si) + ' · ' + l.hlLead.bank : '—'}</div>
              <div style="font-size: 11px; color: #6B7280;">HL Stage: <span style="font-weight: 700;">${l.hlLead ? getStageLabel(l.hlLead.hlStage) : '—'}</span></div>
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
          <div style="background: #FAFAFA; border-top: 1px solid #F3F4F6; padding: 7px 20px; display: flex; align-items: center;">
            <div style="background: ${statBg}; color: ${statColor}; border-radius: 20px; padding: 3px 10px; font-size: 11px; font-weight: 700; height: 24px; display: flex; align-items: center;">${stat}</div>
            <span style="color: #D1D5DB; margin: 0 8px;">·</span>
            <div style="font-size: 11px; color: #4B5563;">${l.subStatus || '—'}</div>
            <span style="color: #D1D5DB; margin: 0 8px;">·</span>
            <div style="font-size: 11px; color: #9CA3AF;">Updated: ${l.log[0]?.time || l.createdDate || '—'}</div>
            <span style="color: #D1D5DB; margin: 0 8px;">·</span>
            <div style="font-size: 11px; color: ${fupColor}; font-weight: ${fupWeight};">📅 ${fupText}</div>

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
      if ((newStatus === 'Policy Issuance' && newSubStatus === 'Issued') || newStatus === 'Active' || newStatus === 'Freelook' || newStatus === 'Payout') l.bucket = 'Policy';
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

    function renderCenterPanel() {
      const l = currentLead;
      let activeTab = l.activeTab || 'History';
      
      let stages = ['New', 'Contacted', 'Quote', 'Payment Done', 'Policy'];
      let currentStageIndex = stages.indexOf(l.bucket);
      if(currentStageIndex === -1) currentStageIndex = 0;
      
      let stageHtml = stages.map((s, idx) => {
        let isActive = idx === currentStageIndex;
        let isCompleted = idx < currentStageIndex;
        let bg = 'white';
        let text = '#9CA3AF';
        let border = '1px solid #E5E7EB';
        
        if(isActive) {
           bg = '#473391'; text = 'white'; border = '1px solid #473391';
        } else if (isCompleted) {
           bg = '#F0EEFB'; text = '#473391'; border = '1px solid #F0EEFB';
        }
        
        let chevron = `<div style="background: ${bg}; color: ${text}; border: ${border}; border-radius: 4px; padding: 6px 14px; font-size: 12px; font-weight: 600;">${s}</div>`;
        let arrow = idx < stages.length - 1 ? `<div style="color: #D1D5DB; margin: 0 8px; font-weight: 700;">></div>` : '';
        return chevron + arrow;
      }).join('');

      let contentHtml = '';
      if (l.bucket === 'New') {
        contentHtml = renderNewStage();
      } else if (l.bucket === 'Contacted') {
        contentHtml = renderProductSelection();
      } else if (l.bucket === 'Quote') {
        contentHtml = renderQuoteStage();
      } else if (l.bucket === 'Payment Done') {
        contentHtml = renderPaymentStage();
      } else if (l.bucket === 'Policy') {
        contentHtml = renderPolicyStage();
      }

      let html = `
        <div style="background: white; border-bottom: 1px solid #E5E7EB; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
          <div style="display: flex; align-items: center;">
            ${stageHtml}
          </div>
          <button style="border: 1.5px solid #C0392B; color: #C0392B; background: white; border-radius: 6px; padding: 7px 16px; font-size: 12px; font-weight: 600; cursor: pointer;">Mark as Lost</button>
        </div>
        <div style="flex: 1; overflow-y: auto; padding: 20px;">
          ${contentHtml}
        </div>
      `;
      document.getElementById('detail-center').innerHTML = html;
    }

    function renderOutreachStage() {
      return `
        <div class="card" style="padding:32px; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.05); border:none; margin: 24px auto; max-width:500px;">
          <div class="label" style="color:var(--primary); margin-bottom:16px;">📞 First Contact Action</div>
          <div style="width:80px; height:80px; border-radius:50%; background:var(--primary-light); color:var(--primary); display:flex; align-items:center; justify-content:center; font-size:32px; margin:0 auto 16px;">${currentLead.name.charAt(0)}</div>
          <div style="font-size:24px; font-weight:700; margin-bottom:4px;">${currentLead.name}</div>
          <div style="font-size:32px; font-weight:800; color:var(--text-heading); margin-bottom:12px;">
            ${currentLead.phone}
            <button class="btn btn-ghost btn-small" style="margin-left:8px; vertical-align:middle;" onclick="showToast('Number copied')">Copy</button>
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



function renderNewStage() {

       let hasHL = currentLead.hlLead || currentLead.si;
       let hlBanner = '';
       if (hasHL) {
          let amt = currentLead.si ? formatLakhs(currentLead.si) : '₹60L';
          let bank = currentLead.hlLead ? currentLead.hlLead.bank : 'ICICI Bank';
          let cName = currentLead.name || 'Rajesh Kumar';
          hlBanner = `
             <div style="background: #F0EEFB; border-radius: 8px; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; border: 1px solid #C5C0F5; margin-bottom: 16px;">
                <div style="display: flex; align-items: flex-start; gap: 8px;">
                   <span style="font-size: 14px;">🔗</span>
                   <div>
                      <div style="font-size: 12px; font-weight: 600; color: #473391;">Linked Home Loan Lead</div>
                      <div style="font-size: 11px; color: #6B5CC4; margin-top: 2px;">HL-94028 · ${cName} · ${amt} · ${bank} · Sanctioned</div>
                   </div>
                </div>
                <div style="font-size: 12px; font-weight: 600; color: #473391; text-decoration: underline; cursor: pointer;">View HL Lead &rarr;</div>
             </div>
          `;
       } else {
          hlBanner = `
             <div style="background: #FFF8E1; border-radius: 8px; padding: 10px 16px; border: 1px solid #F5CBA7; display: flex; align-items: flex-start; gap: 8px; margin-bottom: 16px;">
                <span style="font-size: 14px;">⚠️</span>
                <div style="font-size: 12px; color: #856404; margin-top: 2px;">No Home Loan lead linked. Details will need to be filled manually.</div>
             </div>
          `;
       }
       
       let recProd = currentLead.initialProduct || 'Loan Protection';
       let activeTab = window.newStageActiveTab || recProd;
       
       const tabs = ['Loan Protection', 'Property Insurance', 'Credit Life', 'Term Plan'];
       let tabHtml = `<div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px;">`;
       tabs.forEach(t => {
          let isActive = (activeTab === t);
          let bg = isActive ? '#473391' : '#F3F4F6';
          let color = isActive ? '#ffffff' : '#6B7280';
          let recBadge = isActive ? `<div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #473391; text-align: center; margin-top: 4px;">SELECTED</div>` : '';
          tabHtml += `
             <div style="display: flex; flex-direction: column; align-items: center;">
                <div style="background: ${bg}; color: ${color}; border-radius: 20px; padding: 7px 16px; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap;" onclick="switchNewStageTab('${t}')">
                   ${t}
                </div>
                ${recBadge}
             </div>
          `;
       });
       tabHtml += `</div>`;
       
       let amtLockedVal = currentLead.si ? currentLead.si : '';
       let lockedInputHtml = hasHL ? `
          <div style="position: relative;">
             <input type="text" class="new-form-input new-form-locked" value="${amtLockedVal}" readonly>
             <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 12px;">🔒</span>
          </div>
       ` : `
          <input type="number" class="new-form-input new-stage-track" placeholder="₹ Enter Amount" oninput="triggerNewStageSave()" value="${window.newStageFormData['amt'] || ''}">
       `;
       let lockedLabelHtml = hasHL ? `<span class="hl-badge">HL</span>` : '';
       
       const renderPillToggle = (group, val) => {
           let isSel = (window.newStageFormData[group] === val);
           let bg = isSel ? '#473391' : 'white';
           let color = isSel ? 'white' : '#6B7280';
           let border = isSel ? '1.5px solid #473391' : '1.5px solid #E5E7EB';
           return `<div style="background: ${bg}; color: ${color}; border: ${border}; border-radius: 20px; padding: 7px 20px; font-size: 12px; font-weight: 600; cursor: pointer; text-align: center;" onclick="toggleCustomRadio('${group}', '${val}')">${val}</div>`;
       };
       
       let contentHtml = '';
       let reqCount = 0;
       let summaryData = ''; // For PB pre-qual
       
       if (activeTab === 'Loan Protection') {
          reqCount = hasHL ? 2 : 3;
          contentHtml = `
             <div style="font-size: 13px; font-weight: 700; color: #111827;">Loan Protection Details</div>
             <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 16px;">Required for CARE Health & TATA AIG quote generation</div>
             <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                <div>
                   <label class="new-form-label">DATE OF BIRTH *</label>
                   <input type="date" class="new-form-input new-stage-track" oninput="triggerNewStageSave()" value="${window.newStageFormData['dob'] || ''}">
                </div>
                <div>
                   <label class="new-form-label">LOAN AMOUNT ${lockedLabelHtml}</label>
                   ${lockedInputHtml}
                </div>
             </div>
             <div style="margin-bottom: 14px;">
                <label class="new-form-label">PLAN TYPE *</label>
                <div style="display: flex; gap: 8px;">
                   ${renderPillToggle('planType', 'PA Only')}
                   ${renderPillToggle('planType', 'PA + CI')}
                </div>
                <input type="text" class="new-stage-track" value="${window.newStageFormData['planType'] || ''}" style="display:none;">
             </div>
             <div>
                <label class="new-form-label" style="margin-bottom: 8px;">ADD-ONS (OPTIONAL)</label>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                   <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 500; color: #111827; cursor: pointer;">
                      <div class="custom-checkbox ${window.newStageFormData['emi'] ? 'active' : ''}" onclick="event.preventDefault(); toggleCustomCheckbox('emi')">${window.newStageFormData['emi'] ? '✓' : ''}</div>
                      EMI Protection
                   </label>
                   <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 500; color: #111827; cursor: pointer;">
                      <div class="custom-checkbox ${window.newStageFormData['loe'] ? 'active' : ''}" onclick="event.preventDefault(); toggleCustomCheckbox('loe')">${window.newStageFormData['loe'] ? '✓' : ''}</div>
                      Loss of Employment
                   </label>
                   <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 500; color: #111827; cursor: pointer;">
                      <div class="custom-checkbox ${window.newStageFormData['sdh'] ? 'active' : ''}" onclick="event.preventDefault(); toggleCustomCheckbox('sdh')">${window.newStageFormData['sdh'] ? '✓' : ''}</div>
                      Seasonal Disease Hospitalisation
                   </label>
                </div>
             </div>
          `;
       } else if (activeTab === 'Property Insurance') {
          reqCount = 4;
          let pType = window.newStageFormData['propType'] || '';
          summaryData = `City: ${window.newStageFormData['city'] || '-'} · Type: ${pType || '-'} · Market Value: ₹${window.newStageFormData['mval'] || '-'} · Household Items: ₹${window.newStageFormData['hval'] || '-'}`;
          contentHtml = `
             <div style="font-size: 13px; font-weight: 700; color: #111827;">Property Insurance Details</div>
             <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 16px;">Required for PolicyBazaar quote generation</div>
             <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                <div>
                   <label class="new-form-label">CITY *</label>
                   <input type="text" class="new-form-input new-stage-track" placeholder="Enter City" oninput="window.newStageFormData['city']=this.value; triggerNewStageSave()" value="${window.newStageFormData['city'] || ''}">
                </div>
                <div>
                   <label class="new-form-label">PROPERTY TYPE *</label>
                   <select class="new-form-input new-stage-track" onchange="window.newStageFormData['propType']=this.value; triggerNewStageSave()">
                      <option value="">Select</option>
                      <option ${pType==='Flat'?'selected':''}>Flat</option>
                      <option ${pType==='Independent House'?'selected':''}>Independent House</option>
                   </select>
                </div>
             </div>
             <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div>
                   <label class="new-form-label">MARKET VALUE *</label>
                   <input type="number" class="new-form-input new-stage-track" placeholder="₹ Market value" oninput="window.newStageFormData['mval']=this.value; triggerNewStageSave()" value="${window.newStageFormData['mval'] || ''}">
                </div>
                <div>
                   <label class="new-form-label">HOUSEHOLD ITEMS VALUE *</label>
                   <input type="number" class="new-form-input new-stage-track" placeholder="₹ Household items value" oninput="window.newStageFormData['hval']=this.value; triggerNewStageSave()" value="${window.newStageFormData['hval'] || ''}">
                </div>
             </div>
          `;
       } else if (activeTab === 'Credit Life' || activeTab === 'Term Plan') {
          reqCount = 6;
          let title = activeTab === 'Credit Life' ? 'Credit Life Details' : 'Term Plan Details';
          let smokeYes = window.newStageFormData['smoker'] === 'Yes';
          let smokeNo = window.newStageFormData['smoker'] === 'No';
          summaryData = `DOB: ${window.newStageFormData['dob'] || '-'} · Gender: ${window.newStageFormData['gender'] || '-'} · Income: ${window.newStageFormData['income'] || '-'} · Employment: ${window.newStageFormData['emp'] || '-'} · Tobacco: ${window.newStageFormData['smoker'] || '-'}`;
          
          contentHtml = `
             <div style="font-size: 13px; font-weight: 700; color: #111827;">${title}</div>
             <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 16px;">Required for PolicyBazaar quote generation</div>
             <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                <div>
                   <label class="new-form-label">DATE OF BIRTH *</label>
                   <input type="date" class="new-form-input new-stage-track" oninput="window.newStageFormData['dob']=this.value; triggerNewStageSave()" value="${window.newStageFormData['dob'] || ''}">
                </div>
                <div>
                   <label class="new-form-label">GENDER *</label>
                   <div style="display: flex; gap: 8px;">
                      ${renderPillToggle('gender', 'Male')}
                      ${renderPillToggle('gender', 'Female')}
                   </div>
                   <input type="text" class="new-stage-track" value="${window.newStageFormData['gender'] || ''}" style="display:none;">
                </div>
             </div>
             <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                <div>
                   <label class="new-form-label">EDUCATIONAL QUALIFICATION *</label>
                   <select class="new-form-input new-stage-track" onchange="window.newStageFormData['edu']=this.value; triggerNewStageSave()">
                      <option value="">Select</option>
                      <option ${window.newStageFormData['edu']==='Below 10th'?'selected':''}>Below 10th</option>
                      <option ${window.newStageFormData['edu']==='10th'?'selected':''}>10th</option>
                      <option ${window.newStageFormData['edu']==='12th'?'selected':''}>12th</option>
                      <option ${window.newStageFormData['edu']==='Graduate'?'selected':''}>Graduate</option>
                      <option ${window.newStageFormData['edu']==='Post Graduate'?'selected':''}>Post Graduate</option>
                   </select>
                </div>
                <div>
                   <label class="new-form-label">ANNUAL INCOME *</label>
                   <select class="new-form-input new-stage-track" onchange="window.newStageFormData['income']=this.value; triggerNewStageSave()">
                      <option value="">Select</option>
                      <option ${window.newStageFormData['income']==='Below 5L'?'selected':''}>Below 5L</option>
                      <option ${window.newStageFormData['income']==='5L–10L'?'selected':''}>5L–10L</option>
                      <option ${window.newStageFormData['income']==='10L–25L'?'selected':''}>10L–25L</option>
                      <option ${window.newStageFormData['income']==='25L–50L'?'selected':''}>25L–50L</option>
                      <option ${window.newStageFormData['income']==='50L+'?'selected':''}>50L+</option>
                   </select>
                </div>
             </div>
             <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div>
                   <label class="new-form-label">EMPLOYMENT TYPE *</label>
                   <select class="new-form-input new-stage-track" onchange="window.newStageFormData['emp']=this.value; triggerNewStageSave()">
                      <option value="">Select</option>
                      <option ${window.newStageFormData['emp']==='Salaried'?'selected':''}>Salaried</option>
                      <option ${window.newStageFormData['emp']==='Self Professional'?'selected':''}>Self Professional</option>
                   </select>
                </div>
                <div>
                   <label class="new-form-label">SMOKES OR CHEW TOBACCO? *</label>
                   <div style="display: flex; gap: 8px;">
                      <div style="background: ${smokeYes ? '#FDECEA' : 'white'}; color: ${smokeYes ? '#C0392B' : '#6B7280'}; border: ${smokeYes ? '1.5px solid #C0392B' : '1.5px solid #E5E7EB'}; border-radius: 20px; padding: 7px 20px; font-size: 12px; font-weight: 600; cursor: pointer; text-align: center;" onclick="toggleCustomRadio('smoker', 'Yes')">Yes</div>
                      <div style="background: ${smokeNo ? '#E6F4ED' : 'white'}; color: ${smokeNo ? '#1A7A4A' : '#6B7280'}; border: ${smokeNo ? '1.5px solid #1A7A4A' : '1.5px solid #E5E7EB'}; border-radius: 20px; padding: 7px 20px; font-size: 12px; font-weight: 600; cursor: pointer; text-align: center;" onclick="toggleCustomRadio('smoker', 'No')">No</div>
                   </div>
                   <input type="text" class="new-stage-track" value="${window.newStageFormData['smoker'] || ''}" style="display:none;">
                </div>
             </div>
          `;
       }
       
       let genBtn = '';
       let quoteResultsHtml = '';
       
       if ('New' === 'New') {
           genBtn = `
             <button onclick="generateQuoteFromNew()" style="width: 100%; height: 44px; background: #473391; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; margin-top: 20px; cursor: pointer;">Generate Quote &rarr;</button>
           `;
       } else if ('New' === 'Contacted') {
           genBtn = `
             <button onclick="generateQuoteFromContacted(${reqCount})" style="width: 100%; height: 44px; background: #473391; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; margin-top: 20px; cursor: pointer;">Generate Quote &rarr;</button>
           `;
           
           if (currentLead.quoteResultsVisible) {
               if (activeTab === 'Loan Protection') {
                   quoteResultsHtml = `
                      <div style="margin-top: 24px;">
                        <div style="font-size: 13px; font-weight: 700; color: #111827;">Generated Quotes</div>
                        <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 12px;">CARE Health & TATA AIG · Based on details filled above</div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                          <!-- Card 1 -->
                          <div style="border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 16px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                              <div style="width: 40px; height: 40px; background: #F3F4F6; border-radius: 6px;"></div>
                              <div style="font-size: 13px; font-weight: 700;">CARE Health Insurance</div>
                            </div>
                            <div style="font-size: 11px; color: #9CA3AF; margin-top: 4px;">Loan Protection &middot; PA + CI</div>
                            <div style="font-size: 22px; font-weight: 700; color: #473391; margin-top: 10px;">₹12,500</div>
                            <div style="font-size: 10px; color: #9CA3AF;">incl. GST</div>
                            <div style="font-size: 11px; color: #4B5563; margin-top: 6px;">Coverage: ₹${formatLakhs(currentLead.si || 4500000)} &middot; 5 years</div>
                            <div style="height: 1px; background: #F3F4F6; margin: 12px 0;"></div>
                            <div style="display: flex; gap: 8px;">
                              <button style="flex: 1; background: #25D366; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; padding: 7px 0; cursor: pointer;" onclick="shareQuotesFromContacted('CARE Health Insurance', '₹12,500', 'WhatsApp')">WhatsApp</button>
                              <button style="flex: 1; background: #EA4335; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; padding: 7px 0; cursor: pointer;" onclick="shareQuotesFromContacted('CARE Health Insurance', '₹12,500', 'Email')">Email</button>
                            </div>
                          </div>
                          <!-- Card 2 -->
                          <div style="border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 16px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                              <div style="width: 40px; height: 40px; background: #F3F4F6; border-radius: 6px;"></div>
                              <div style="font-size: 13px; font-weight: 700;">TATA AIG</div>
                            </div>
                            <div style="font-size: 11px; color: #9CA3AF; margin-top: 4px;">Loan Guard &middot; PA + CI</div>
                            <div style="font-size: 22px; font-weight: 700; color: #473391; margin-top: 10px;">₹13,200</div>
                            <div style="font-size: 10px; color: #9CA3AF;">incl. GST</div>
                            <div style="font-size: 11px; color: #4B5563; margin-top: 6px;">Coverage: ₹${formatLakhs(currentLead.si || 4500000)} &middot; 5 years</div>
                            <div style="height: 1px; background: #F3F4F6; margin: 12px 0;"></div>
                            <div style="display: flex; gap: 8px;">
                              <button style="flex: 1; background: #25D366; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; padding: 7px 0; cursor: pointer;" onclick="shareQuotesFromContacted('TATA AIG', '₹13,200', 'WhatsApp')">WhatsApp</button>
                              <button style="flex: 1; background: #EA4335; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; padding: 7px 0; cursor: pointer;" onclick="shareQuotesFromContacted('TATA AIG', '₹13,200', 'Email')">Email</button>
                            </div>
                          </div>
                        </div>
                        <button style="width: 100%; border: 1.5px solid #473391; background: white; color: #473391; border-radius: 8px; font-size: 13px; font-weight: 600; padding: 10px; margin-top: 12px; cursor: pointer;" onclick="shareQuotesFromContacted('Multiple Quotes', 'Varies', 'WhatsApp')">Share All Quotes</button>
                      </div>
                   `;
               } else {
                   quoteResultsHtml = `
                      <div style="margin-top: 24px;">
                        <div style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px;">
                          <div style="font-size: 13px; font-weight: 700; color: #111827;">Ready to generate quotes on PolicyBazaar</div>
                          <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 14px;">The details below will be pre-filled on PolicyBazaar</div>
                          
                          <div style="background: #F9FAFB; border-radius: 6px; padding: 10px 14px; font-size: 12px; color: #4B5563;">
                            ${summaryData}
                          </div>
                          
                          <button onclick="openPolicyBazaarWorkspace()" style="width: 100%; height: 44px; background: #473391; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; margin-top: 16px; cursor: pointer;">Open PolicyBazaar Workspace &rarr;</button>
                        </div>
                        
                        ${currentLead.pbStep2 ? `
                          <div style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin-top: 16px;">
                            <div style="background: #FFFBEB; border: 1px solid #FEF3C7; color: #92400E; font-size: 12px; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
                              PolicyBazaar opened in a new tab. Take a screenshot of the quotes list and upload below.
                            </div>
                            <div style="border: 2px dashed #C5C0F5; border-radius: 8px; padding: 32px; text-align: center; background: #FAFAFA; cursor: pointer; margin-bottom: 16px;">
                              <div style="font-size: 24px; margin-bottom: 8px;">📷</div>
                              <div style="font-size: 13px; font-weight: 600; color: #473391;">Click to upload screenshot</div>
                            </div>
                            <button onclick="currentLead.pbExtracted = true; renderLeadDetail();" style="width: 100%; border: 1.5px solid #473391; background: white; color: #473391; border-radius: 8px; font-size: 13px; font-weight: 600; padding: 10px; cursor: pointer;">Extract Quotes with AI</button>
                            
                            ${currentLead.pbExtracted ? `
                              <div style="margin-top: 20px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                                  <div style="font-size: 13px; font-weight: 700;">Extracted Quotes</div>
                                  <label style="font-size: 12px; color: #6B7280; display: flex; align-items: center; gap: 4px;"><input type="checkbox"> Select All</label>
                                </div>
                                <div style="border: 1px solid #E5E7EB; border-radius: 10px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                                  <input type="checkbox" style="width: 18px; height: 18px;">
                                  <div style="flex: 1;">
                                    <div style="font-size: 13px; font-weight: 700;">HDFC Life</div>
                                    <div style="font-size: 11px; color: #9CA3AF;">Click2Protect</div>
                                  </div>
                                  <div style="text-align: right;">
                                    <div style="font-size: 16px; font-weight: 700; color: #473391;">₹1,200/mo</div>
                                  </div>
                                  <div style="display: flex; gap: 8px;">
                                    <button style="background: #25D366; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; padding: 6px 12px; cursor: pointer;" onclick="shareQuotesFromContacted('HDFC Life', '₹1,200/mo', 'WhatsApp')">WhatsApp</button>
                                  </div>
                                </div>
                              </div>
                            ` : ''}
                          </div>
                        ` : ''}
                      </div>
                   `;
               }
           }
       }
       
       return `
          ${hlBanner}
          ${tabHtml}
          <div style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin-top: 12px; position: relative;">
             <div id="new-stage-save-status" style="position: absolute; top: 20px; right: 20px; font-size: 10px; color: #9CA3AF; display: none;">Saving...</div>
             ${contentHtml}
             <div style="text-align: right; margin-top: 24px;">
                <span id="new-stage-completion" data-req="${reqCount}" style="font-size: 11px; color: #9CA3AF;">0 of ${reqCount} fields filled</span>
             </div>
             ${genBtn}
          </div>
          ${quoteResultsHtml}
          <img src onerror="if(window.updateNewStageCompletion) window.updateNewStageCompletion()" style="display:none;">
       `;

}

function renderContactedStage() {

       let hasHL = currentLead.hlLead || currentLead.si;
       let hlBanner = '';
       if (hasHL) {
          let amt = currentLead.si ? formatLakhs(currentLead.si) : '₹60L';
          let bank = currentLead.hlLead ? currentLead.hlLead.bank : 'ICICI Bank';
          let cName = currentLead.name || 'Rajesh Kumar';
          hlBanner = `
             <div style="background: #F0EEFB; border-radius: 8px; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; border: 1px solid #C5C0F5; margin-bottom: 16px;">
                <div style="display: flex; align-items: flex-start; gap: 8px;">
                   <span style="font-size: 14px;">🔗</span>
                   <div>
                      <div style="font-size: 12px; font-weight: 600; color: #473391;">Linked Home Loan Lead</div>
                      <div style="font-size: 11px; color: #6B5CC4; margin-top: 2px;">HL-94028 · ${cName} · ${amt} · ${bank} · Sanctioned</div>
                   </div>
                </div>
                <div style="font-size: 12px; font-weight: 600; color: #473391; text-decoration: underline; cursor: pointer;">View HL Lead &rarr;</div>
             </div>
          `;
       } else {
          hlBanner = `
             <div style="background: #FFF8E1; border-radius: 8px; padding: 10px 16px; border: 1px solid #F5CBA7; display: flex; align-items: flex-start; gap: 8px; margin-bottom: 16px;">
                <span style="font-size: 14px;">⚠️</span>
                <div style="font-size: 12px; color: #856404; margin-top: 2px;">No Home Loan lead linked. Details will need to be filled manually.</div>
             </div>
          `;
       }
       
       let recProd = currentLead.initialProduct || 'Loan Protection';
       let activeTab = window.newStageActiveTab || recProd;
       
       const tabs = ['Loan Protection', 'Property Insurance', 'Credit Life', 'Term Plan'];
       let tabHtml = `<div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px;">`;
       tabs.forEach(t => {
          let isActive = (activeTab === t);
          let bg = isActive ? '#473391' : '#F3F4F6';
          let color = isActive ? '#ffffff' : '#6B7280';
          let recBadge = isActive ? `<div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #473391; text-align: center; margin-top: 4px;">SELECTED</div>` : '';
          tabHtml += `
             <div style="display: flex; flex-direction: column; align-items: center;">
                <div style="background: ${bg}; color: ${color}; border-radius: 20px; padding: 7px 16px; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap;" onclick="switchNewStageTab('${t}')">
                   ${t}
                </div>
                ${recBadge}
             </div>
          `;
       });
       tabHtml += `</div>`;
       
       let amtLockedVal = currentLead.si ? currentLead.si : '';
       let lockedInputHtml = hasHL ? `
          <div style="position: relative;">
             <input type="text" class="new-form-input new-form-locked" value="${amtLockedVal}" readonly>
             <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 12px;">🔒</span>
          </div>
       ` : `
          <input type="number" class="new-form-input new-stage-track" placeholder="₹ Enter Amount" oninput="triggerNewStageSave()" value="${window.newStageFormData['amt'] || ''}">
       `;
       let lockedLabelHtml = hasHL ? `<span class="hl-badge">HL</span>` : '';
       
       const renderPillToggle = (group, val) => {
           let isSel = (window.newStageFormData[group] === val);
           let bg = isSel ? '#473391' : 'white';
           let color = isSel ? 'white' : '#6B7280';
           let border = isSel ? '1.5px solid #473391' : '1.5px solid #E5E7EB';
           return `<div style="background: ${bg}; color: ${color}; border: ${border}; border-radius: 20px; padding: 7px 20px; font-size: 12px; font-weight: 600; cursor: pointer; text-align: center;" onclick="toggleCustomRadio('${group}', '${val}')">${val}</div>`;
       };
       
       let contentHtml = '';
       let reqCount = 0;
       let summaryData = ''; // For PB pre-qual
       
       if (activeTab === 'Loan Protection') {
          reqCount = hasHL ? 2 : 3;
          contentHtml = `
             <div style="font-size: 13px; font-weight: 700; color: #111827;">Loan Protection Details</div>
             <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 16px;">Required for CARE Health & TATA AIG quote generation</div>
             <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                <div>
                   <label class="new-form-label">DATE OF BIRTH *</label>
                   <input type="date" class="new-form-input new-stage-track" oninput="triggerNewStageSave()" value="${window.newStageFormData['dob'] || ''}">
                </div>
                <div>
                   <label class="new-form-label">LOAN AMOUNT ${lockedLabelHtml}</label>
                   ${lockedInputHtml}
                </div>
             </div>
             <div style="margin-bottom: 14px;">
                <label class="new-form-label">PLAN TYPE *</label>
                <div style="display: flex; gap: 8px;">
                   ${renderPillToggle('planType', 'PA Only')}
                   ${renderPillToggle('planType', 'PA + CI')}
                </div>
                <input type="text" class="new-stage-track" value="${window.newStageFormData['planType'] || ''}" style="display:none;">
             </div>
             <div>
                <label class="new-form-label" style="margin-bottom: 8px;">ADD-ONS (OPTIONAL)</label>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                   <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 500; color: #111827; cursor: pointer;">
                      <div class="custom-checkbox ${window.newStageFormData['emi'] ? 'active' : ''}" onclick="event.preventDefault(); toggleCustomCheckbox('emi')">${window.newStageFormData['emi'] ? '✓' : ''}</div>
                      EMI Protection
                   </label>
                   <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 500; color: #111827; cursor: pointer;">
                      <div class="custom-checkbox ${window.newStageFormData['loe'] ? 'active' : ''}" onclick="event.preventDefault(); toggleCustomCheckbox('loe')">${window.newStageFormData['loe'] ? '✓' : ''}</div>
                      Loss of Employment
                   </label>
                   <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 500; color: #111827; cursor: pointer;">
                      <div class="custom-checkbox ${window.newStageFormData['sdh'] ? 'active' : ''}" onclick="event.preventDefault(); toggleCustomCheckbox('sdh')">${window.newStageFormData['sdh'] ? '✓' : ''}</div>
                      Seasonal Disease Hospitalisation
                   </label>
                </div>
             </div>
          `;
       } else if (activeTab === 'Property Insurance') {
          reqCount = 4;
          let pType = window.newStageFormData['propType'] || '';
          summaryData = `City: ${window.newStageFormData['city'] || '-'} · Type: ${pType || '-'} · Market Value: ₹${window.newStageFormData['mval'] || '-'} · Household Items: ₹${window.newStageFormData['hval'] || '-'}`;
          contentHtml = `
             <div style="font-size: 13px; font-weight: 700; color: #111827;">Property Insurance Details</div>
             <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 16px;">Required for PolicyBazaar quote generation</div>
             <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                <div>
                   <label class="new-form-label">CITY *</label>
                   <input type="text" class="new-form-input new-stage-track" placeholder="Enter City" oninput="window.newStageFormData['city']=this.value; triggerNewStageSave()" value="${window.newStageFormData['city'] || ''}">
                </div>
                <div>
                   <label class="new-form-label">PROPERTY TYPE *</label>
                   <select class="new-form-input new-stage-track" onchange="window.newStageFormData['propType']=this.value; triggerNewStageSave()">
                      <option value="">Select</option>
                      <option ${pType==='Flat'?'selected':''}>Flat</option>
                      <option ${pType==='Independent House'?'selected':''}>Independent House</option>
                   </select>
                </div>
             </div>
             <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div>
                   <label class="new-form-label">MARKET VALUE *</label>
                   <input type="number" class="new-form-input new-stage-track" placeholder="₹ Market value" oninput="window.newStageFormData['mval']=this.value; triggerNewStageSave()" value="${window.newStageFormData['mval'] || ''}">
                </div>
                <div>
                   <label class="new-form-label">HOUSEHOLD ITEMS VALUE *</label>
                   <input type="number" class="new-form-input new-stage-track" placeholder="₹ Household items value" oninput="window.newStageFormData['hval']=this.value; triggerNewStageSave()" value="${window.newStageFormData['hval'] || ''}">
                </div>
             </div>
          `;
       } else if (activeTab === 'Credit Life' || activeTab === 'Term Plan') {
          reqCount = 6;
          let title = activeTab === 'Credit Life' ? 'Credit Life Details' : 'Term Plan Details';
          let smokeYes = window.newStageFormData['smoker'] === 'Yes';
          let smokeNo = window.newStageFormData['smoker'] === 'No';
          summaryData = `DOB: ${window.newStageFormData['dob'] || '-'} · Gender: ${window.newStageFormData['gender'] || '-'} · Income: ${window.newStageFormData['income'] || '-'} · Employment: ${window.newStageFormData['emp'] || '-'} · Tobacco: ${window.newStageFormData['smoker'] || '-'}`;
          
          contentHtml = `
             <div style="font-size: 13px; font-weight: 700; color: #111827;">${title}</div>
             <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 16px;">Required for PolicyBazaar quote generation</div>
             <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                <div>
                   <label class="new-form-label">DATE OF BIRTH *</label>
                   <input type="date" class="new-form-input new-stage-track" oninput="window.newStageFormData['dob']=this.value; triggerNewStageSave()" value="${window.newStageFormData['dob'] || ''}">
                </div>
                <div>
                   <label class="new-form-label">GENDER *</label>
                   <div style="display: flex; gap: 8px;">
                      ${renderPillToggle('gender', 'Male')}
                      ${renderPillToggle('gender', 'Female')}
                   </div>
                   <input type="text" class="new-stage-track" value="${window.newStageFormData['gender'] || ''}" style="display:none;">
                </div>
             </div>
             <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                <div>
                   <label class="new-form-label">EDUCATIONAL QUALIFICATION *</label>
                   <select class="new-form-input new-stage-track" onchange="window.newStageFormData['edu']=this.value; triggerNewStageSave()">
                      <option value="">Select</option>
                      <option ${window.newStageFormData['edu']==='Below 10th'?'selected':''}>Below 10th</option>
                      <option ${window.newStageFormData['edu']==='10th'?'selected':''}>10th</option>
                      <option ${window.newStageFormData['edu']==='12th'?'selected':''}>12th</option>
                      <option ${window.newStageFormData['edu']==='Graduate'?'selected':''}>Graduate</option>
                      <option ${window.newStageFormData['edu']==='Post Graduate'?'selected':''}>Post Graduate</option>
                   </select>
                </div>
                <div>
                   <label class="new-form-label">ANNUAL INCOME *</label>
                   <select class="new-form-input new-stage-track" onchange="window.newStageFormData['income']=this.value; triggerNewStageSave()">
                      <option value="">Select</option>
                      <option ${window.newStageFormData['income']==='Below 5L'?'selected':''}>Below 5L</option>
                      <option ${window.newStageFormData['income']==='5L–10L'?'selected':''}>5L–10L</option>
                      <option ${window.newStageFormData['income']==='10L–25L'?'selected':''}>10L–25L</option>
                      <option ${window.newStageFormData['income']==='25L–50L'?'selected':''}>25L–50L</option>
                      <option ${window.newStageFormData['income']==='50L+'?'selected':''}>50L+</option>
                   </select>
                </div>
             </div>
             <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div>
                   <label class="new-form-label">EMPLOYMENT TYPE *</label>
                   <select class="new-form-input new-stage-track" onchange="window.newStageFormData['emp']=this.value; triggerNewStageSave()">
                      <option value="">Select</option>
                      <option ${window.newStageFormData['emp']==='Salaried'?'selected':''}>Salaried</option>
                      <option ${window.newStageFormData['emp']==='Self Professional'?'selected':''}>Self Professional</option>
                   </select>
                </div>
                <div>
                   <label class="new-form-label">SMOKES OR CHEW TOBACCO? *</label>
                   <div style="display: flex; gap: 8px;">
                      <div style="background: ${smokeYes ? '#FDECEA' : 'white'}; color: ${smokeYes ? '#C0392B' : '#6B7280'}; border: ${smokeYes ? '1.5px solid #C0392B' : '1.5px solid #E5E7EB'}; border-radius: 20px; padding: 7px 20px; font-size: 12px; font-weight: 600; cursor: pointer; text-align: center;" onclick="toggleCustomRadio('smoker', 'Yes')">Yes</div>
                      <div style="background: ${smokeNo ? '#E6F4ED' : 'white'}; color: ${smokeNo ? '#1A7A4A' : '#6B7280'}; border: ${smokeNo ? '1.5px solid #1A7A4A' : '1.5px solid #E5E7EB'}; border-radius: 20px; padding: 7px 20px; font-size: 12px; font-weight: 600; cursor: pointer; text-align: center;" onclick="toggleCustomRadio('smoker', 'No')">No</div>
                   </div>
                   <input type="text" class="new-stage-track" value="${window.newStageFormData['smoker'] || ''}" style="display:none;">
                </div>
             </div>
          `;
       }
       
       let genBtn = '';
       let quoteResultsHtml = '';
       
       if ('Contacted' === 'New') {
           genBtn = `
             <button onclick="generateQuoteFromNew()" style="width: 100%; height: 44px; background: #473391; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; margin-top: 20px; cursor: pointer;">Generate Quote &rarr;</button>
           `;
       } else if ('Contacted' === 'Contacted') {
           genBtn = `
             <button onclick="generateQuoteFromContacted(${reqCount})" style="width: 100%; height: 44px; background: #473391; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; margin-top: 20px; cursor: pointer;">Generate Quote &rarr;</button>
           `;
           
           if (currentLead.quoteResultsVisible) {
               if (activeTab === 'Loan Protection') {
                   quoteResultsHtml = `
                      <div style="margin-top: 24px;">
                        <div style="font-size: 13px; font-weight: 700; color: #111827;">Generated Quotes</div>
                        <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 12px;">CARE Health & TATA AIG · Based on details filled above</div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                          <!-- Card 1 -->
                          <div style="border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 16px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                              <div style="width: 40px; height: 40px; background: #F3F4F6; border-radius: 6px;"></div>
                              <div style="font-size: 13px; font-weight: 700;">CARE Health Insurance</div>
                            </div>
                            <div style="font-size: 11px; color: #9CA3AF; margin-top: 4px;">Loan Protection &middot; PA + CI</div>
                            <div style="font-size: 22px; font-weight: 700; color: #473391; margin-top: 10px;">₹12,500</div>
                            <div style="font-size: 10px; color: #9CA3AF;">incl. GST</div>
                            <div style="font-size: 11px; color: #4B5563; margin-top: 6px;">Coverage: ₹${formatLakhs(currentLead.si || 4500000)} &middot; 5 years</div>
                            <div style="height: 1px; background: #F3F4F6; margin: 12px 0;"></div>
                            <div style="display: flex; gap: 8px;">
                              <button style="flex: 1; background: #25D366; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; padding: 7px 0; cursor: pointer;" onclick="shareQuotesFromContacted('CARE Health Insurance', '₹12,500', 'WhatsApp')">WhatsApp</button>
                              <button style="flex: 1; background: #EA4335; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; padding: 7px 0; cursor: pointer;" onclick="shareQuotesFromContacted('CARE Health Insurance', '₹12,500', 'Email')">Email</button>
                            </div>
                          </div>
                          <!-- Card 2 -->
                          <div style="border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 16px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                              <div style="width: 40px; height: 40px; background: #F3F4F6; border-radius: 6px;"></div>
                              <div style="font-size: 13px; font-weight: 700;">TATA AIG</div>
                            </div>
                            <div style="font-size: 11px; color: #9CA3AF; margin-top: 4px;">Loan Guard &middot; PA + CI</div>
                            <div style="font-size: 22px; font-weight: 700; color: #473391; margin-top: 10px;">₹13,200</div>
                            <div style="font-size: 10px; color: #9CA3AF;">incl. GST</div>
                            <div style="font-size: 11px; color: #4B5563; margin-top: 6px;">Coverage: ₹${formatLakhs(currentLead.si || 4500000)} &middot; 5 years</div>
                            <div style="height: 1px; background: #F3F4F6; margin: 12px 0;"></div>
                            <div style="display: flex; gap: 8px;">
                              <button style="flex: 1; background: #25D366; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; padding: 7px 0; cursor: pointer;" onclick="shareQuotesFromContacted('TATA AIG', '₹13,200', 'WhatsApp')">WhatsApp</button>
                              <button style="flex: 1; background: #EA4335; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; padding: 7px 0; cursor: pointer;" onclick="shareQuotesFromContacted('TATA AIG', '₹13,200', 'Email')">Email</button>
                            </div>
                          </div>
                        </div>
                        <button style="width: 100%; border: 1.5px solid #473391; background: white; color: #473391; border-radius: 8px; font-size: 13px; font-weight: 600; padding: 10px; margin-top: 12px; cursor: pointer;" onclick="shareQuotesFromContacted('Multiple Quotes', 'Varies', 'WhatsApp')">Share All Quotes</button>
                      </div>
                   `;
               } else {
                   quoteResultsHtml = `
                      <div style="margin-top: 24px;">
                        <div style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px;">
                          <div style="font-size: 13px; font-weight: 700; color: #111827;">Ready to generate quotes on PolicyBazaar</div>
                          <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 14px;">The details below will be pre-filled on PolicyBazaar</div>
                          
                          <div style="background: #F9FAFB; border-radius: 6px; padding: 10px 14px; font-size: 12px; color: #4B5563;">
                            ${summaryData}
                          </div>
                          
                          <button onclick="openPolicyBazaarWorkspace()" style="width: 100%; height: 44px; background: #473391; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; margin-top: 16px; cursor: pointer;">Open PolicyBazaar Workspace &rarr;</button>
                        </div>
                        
                        ${currentLead.pbStep2 ? `
                          <div style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin-top: 16px;">
                            <div style="background: #FFFBEB; border: 1px solid #FEF3C7; color: #92400E; font-size: 12px; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
                              PolicyBazaar opened in a new tab. Take a screenshot of the quotes list and upload below.
                            </div>
                            <div style="border: 2px dashed #C5C0F5; border-radius: 8px; padding: 32px; text-align: center; background: #FAFAFA; cursor: pointer; margin-bottom: 16px;">
                              <div style="font-size: 24px; margin-bottom: 8px;">📷</div>
                              <div style="font-size: 13px; font-weight: 600; color: #473391;">Click to upload screenshot</div>
                            </div>
                            <button onclick="currentLead.pbExtracted = true; renderLeadDetail();" style="width: 100%; border: 1.5px solid #473391; background: white; color: #473391; border-radius: 8px; font-size: 13px; font-weight: 600; padding: 10px; cursor: pointer;">Extract Quotes with AI</button>
                            
                            ${currentLead.pbExtracted ? `
                              <div style="margin-top: 20px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                                  <div style="font-size: 13px; font-weight: 700;">Extracted Quotes</div>
                                  <label style="font-size: 12px; color: #6B7280; display: flex; align-items: center; gap: 4px;"><input type="checkbox"> Select All</label>
                                </div>
                                <div style="border: 1px solid #E5E7EB; border-radius: 10px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                                  <input type="checkbox" style="width: 18px; height: 18px;">
                                  <div style="flex: 1;">
                                    <div style="font-size: 13px; font-weight: 700;">HDFC Life</div>
                                    <div style="font-size: 11px; color: #9CA3AF;">Click2Protect</div>
                                  </div>
                                  <div style="text-align: right;">
                                    <div style="font-size: 16px; font-weight: 700; color: #473391;">₹1,200/mo</div>
                                  </div>
                                  <div style="display: flex; gap: 8px;">
                                    <button style="background: #25D366; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; padding: 6px 12px; cursor: pointer;" onclick="shareQuotesFromContacted('HDFC Life', '₹1,200/mo', 'WhatsApp')">WhatsApp</button>
                                  </div>
                                </div>
                              </div>
                            ` : ''}
                          </div>
                        ` : ''}
                      </div>
                   `;
               }
           }
       }
       
       return `
          ${hlBanner}
          ${tabHtml}
          <div style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin-top: 12px; position: relative;">
             <div id="new-stage-save-status" style="position: absolute; top: 20px; right: 20px; font-size: 10px; color: #9CA3AF; display: none;">Saving...</div>
             ${contentHtml}
             <div style="text-align: right; margin-top: 24px;">
                <span id="new-stage-completion" data-req="${reqCount}" style="font-size: 11px; color: #9CA3AF;">0 of ${reqCount} fields filled</span>
             </div>
             ${genBtn}
          </div>
          ${quoteResultsHtml}
          <img src onerror="if(window.updateNewStageCompletion) window.updateNewStageCompletion()" style="display:none;">
       `;

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


    
    function renderQuoteStage() {
       let planName = currentLead.lockedPlanName || 'Insurer Name';
       let premium = currentLead.lockedPremium || '₹Premium';
       
       let isShared = currentLead.paymentLinkShared;
       let linkVal = currentLead.paymentLinkValue || '';
       let helperText = 'Get this link from the payment screen';
       
       // Verification state
       let vStat = currentLead.paymentVerificationStatus || 'Verification Pending';
       let vAmt = currentLead.paymentAmount || '';
       let vUtr = currentLead.paymentUtr || '';
       let vDate = currentLead.paymentDate || '';
       let canVerify = window.IBM_ROLE === 'Manager';
       let fieldsFilled = vAmt && vUtr && vDate;
       let btnLabel = canVerify ? 'Confirm Payment Status' : 'Submit for Verification';
       let btnDisabled = !fieldsFilled ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : '';
       
       return `
         <!-- SECTION 1: Selected Plan Summary -->
         <div style="background: white; border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="font-size: 13px; font-weight: 700; color: #111827;">Customer's Selected Plan</div>
                <div style="background: #E6F4ED; color: #1A7A4A; font-size: 10px; font-weight: 700; text-transform: uppercase; border-radius: 4px; padding: 4px 8px;">Quote Shared</div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px; font-size: 13px;">
              <img src="https://ui-avatars.com/api/?name=${(planName).substring(0,1)}&background=F3F4F6&color=473391" style="width: 32px; height: 32px; border-radius: 4px; object-fit: contain;">
              <div style="font-weight: 700; color: #111827;">${planName}</div>
              <div style="width: 1px; height: 12px; background: #E5E7EB;"></div>
              <div style="color: #9CA3AF;">Standard Plan</div>
              <div style="width: 1px; height: 12px; background: #E5E7EB;"></div>
              <div style="font-weight: 700; color: #473391;">${premium}</div>
            </div>
            <div style="margin-top: 12px;">
                <span style="font-size: 11px; color: #473391; cursor: pointer; text-decoration: underline;" onclick="changePlanModal()">Change Plan</span>
            </div>
         </div>
         
         <!-- SECTION 2: Payment Link -->
         <div style="background: white; border: 1px solid #E5E7EB; border-radius: 10px; overflow: hidden; margin-bottom: 24px;">
            <div style="padding: 14px 16px; border-bottom: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: center;">
              <div style="font-size: 14px; font-weight: 700; color: #111827;">Payment Link</div>
              <div style="background: #F0EEFB; color: #473391; font-size: 11px; font-weight: 700; border-radius: 4px; padding: 2px 8px;">${planName}</div>
            </div>
            <div style="padding: 16px;">
              <div style="margin-bottom: 14px;">
                <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 6px; display: block;">PASTE PAYMENT LINK *</label>
                <div style="position: relative;">
                  <input type="text" value="${linkVal}" placeholder="Paste payment link" oninput="currentLead.paymentLinkValue = this.value; renderLeadDetail();" ${isShared ? 'readonly' : ''} style="width: 100%; height: 40px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; font-family: Poppins; padding: 0 12px; outline: none; box-sizing: border-box; ${isShared ? 'color: #1A7A4A; background: #F9FAFB;' : ''}">
                  ${isShared ? '<div style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 12px; color: #1A7A4A;">&check;</div>' : ''}
                </div>
                ${isShared ? `<div style="font-size: 11px; color: #473391; margin-top: 4px; cursor: pointer; text-decoration: underline;" onclick="currentLead.paymentLinkShared = false; renderLeadDetail();">Resend</div>` : `<div style="font-size: 10px; color: #9CA3AF; margin-top: 4px;">${helperText}</div>`}
              </div>
              
              <div>
                <label style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 8px; display: block;">SHARE WITH CUSTOMER</label>
                <div style="display: flex; gap: 10px;">
                  <button style="flex: 1; background: #25D366; color: white; border-radius: 8px; border: none; font-size: 13px; font-weight: 700; height: 42px; cursor: ${linkVal ? 'pointer' : 'not-allowed'}; opacity: ${linkVal ? '1' : '0.4'};" ${!linkVal ? 'disabled' : ''} onclick="sharePaymentLink('WhatsApp')">Send via WhatsApp</button>
                  <button style="flex: 1; background: #EA4335; color: white; border-radius: 8px; border: none; font-size: 13px; font-weight: 700; height: 42px; cursor: ${linkVal ? 'pointer' : 'not-allowed'}; opacity: ${linkVal ? '1' : '0.4'};" ${!linkVal ? 'disabled' : ''} onclick="sharePaymentLink('Email')">Send via Email</button>
                </div>
              </div>
            </div>
         </div>
         
         <!-- SECTION 3: Payment Verification -->
         <div style="background: white; border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div style="font-size: 13px; font-weight: 700; color: #111827;">Payment Verification</div>
                <div style="font-size: 11px; color: #9CA3AF;">To be confirmed by IBM Manager</div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                <div>
                   <label class="new-form-label">PAYMENT AMOUNT *</label>
                   <input type="number" class="new-form-input" placeholder="₹ Amount" value="${vAmt}" oninput="currentLead.paymentAmount = this.value; renderLeadDetail();">
                </div>
                <div>
                   <label class="new-form-label">UTR NUMBER *</label>
                   <input type="text" class="new-form-input" placeholder="Transaction reference" value="${vUtr}" oninput="currentLead.paymentUtr = this.value; renderLeadDetail();">
                </div>
            </div>
            
            <div style="margin-bottom: 14px;">
                <label class="new-form-label">PAYMENT DATE *</label>
                <input type="date" class="new-form-input" value="${vDate}" oninput="currentLead.paymentDate = this.value; renderLeadDetail();">
            </div>
            
            <div style="margin-bottom: 20px;">
                <label class="new-form-label">UPLOAD PROOF *</label>
                <input type="file" class="new-form-input" style="padding: 7px 10px;">
            </div>
            
            <div style="margin-bottom: 16px;">
                <label class="new-form-label">VERIFICATION STATUS</label>
                <div style="display: flex; gap: 8px;">
                    <div style="border-radius: 20px; padding: 7px 16px; font-size: 12px; font-weight: 600; cursor: pointer; border: ${vStat === 'Verification Pending' ? '1.5px solid #F5CBA7' : '1.5px solid #E5E7EB'}; background: ${vStat === 'Verification Pending' ? '#FFF8E1' : 'white'}; color: ${vStat === 'Verification Pending' ? '#856404' : '#6B7280'};" onclick="currentLead.paymentVerificationStatus = 'Verification Pending'; renderLeadDetail();">Verification Pending</div>
                    
                    <div style="border-radius: 20px; padding: 7px 16px; font-size: 12px; font-weight: 600; cursor: pointer; border: ${vStat === 'Payment Failed' ? '1.5px solid #F5A4A4' : '1.5px solid #E5E7EB'}; background: ${vStat === 'Payment Failed' ? '#FDECEA' : 'white'}; color: ${vStat === 'Payment Failed' ? '#C0392B' : '#6B7280'};" onclick="currentLead.paymentVerificationStatus = 'Payment Failed'; renderLeadDetail();">Payment Failed</div>
                    
                    <div style="border-radius: 20px; padding: 7px 16px; font-size: 12px; font-weight: 600; border: ${vStat === 'Verified' ? '1.5px solid #A8D5B5' : '1.5px solid #E5E7EB'}; background: ${vStat === 'Verified' ? '#E6F4ED' : 'white'}; color: ${vStat === 'Verified' ? '#1A7A4A' : '#6B7280'}; ${!canVerify ? 'opacity: 0.5; cursor: not-allowed;' : 'cursor: pointer;'}" title="${!canVerify ? 'Only IBM Manager can mark as Verified' : ''}" onclick="if(${canVerify}) { currentLead.paymentVerificationStatus = 'Verified'; renderLeadDetail(); }">Verified</div>
                </div>
            </div>
            
            <button onclick="confirmPaymentStatus()" style="width: 100%; height: 44px; background: #473391; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700;" ${btnDisabled}>${btnLabel}</button>
         </div>
       `;
    }


function renderPaymentStage() {
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

    function renderPaymentDoneStage() {
      let product = currentLead.finalProduct || currentLead.initialProduct || 'lp';
      let insurer = currentLead.selectedPlan ? currentLead.selectedPlan.insurer : '';
      let isTata = insurer === 'TATA AIG';
      
      // Product-specific milestones with helper text
      let milestones = [];
      if (product === 'property') {
         milestones = [
           { label: 'Payment Verified', helper: 'Payment proof has been uploaded and verified by operations.' },
           { label: 'KYC Pending', helper: 'Upload Aadhaar + PAN copies for KYC verification.' },
           { label: 'KYC Completed', helper: 'KYC successfully verified.' },
           { label: 'Policy Issued', helper: 'Insurer issues the policy after KYC approval.' }
         ];
      } else if (product === 'lp' && isTata) {
         milestones = [
           { label: 'Payment Verified', helper: 'Payment proof uploaded and verified.' },
           { label: 'Tele-PD Pending', helper: 'TATA AIG will schedule a tele-personal discussion with the customer.' },
           { label: 'Tele-PD Completed', helper: 'Tele-PD completed. Awaiting underwriting decision.' },
           { label: 'Policy Issued', helper: 'TATA AIG issues the policy after PD clearance.' }
         ];
      } else if (product === 'lp') {
         milestones = [
           { label: 'Payment Verified', helper: 'Payment proof uploaded and verified.' },
           { label: 'Proposal Form Pending', helper: 'Customer needs to fill the proposal form.' },
           { label: 'Proposal Form Completed', helper: 'Proposal form submitted.' },
           { label: 'Policy Issued', helper: 'CARE issues the policy after form submission.' }
         ];
      } else {
         // Credit Life & Term Plan
         milestones = [
           { label: 'Payment Verified', helper: 'Payment proof uploaded and verified.' },
           { label: 'Documents Pending', helper: 'Upload identity and address proof documents.' },
           { label: 'Documents Received', helper: 'All required documents collected.' },
           { label: 'Medical Scheduled', helper: 'Customer undergoes medical tests as required by insurer.' },
           { label: 'Medical Completed', helper: 'Medical reports received.' },
           { label: 'Underwriting Review', helper: 'Insurer reviews all documents and medical reports.' },
           { label: 'Approval', helper: 'Insurer issues approval, counter-offer, or rejection.' },
           { label: 'Policy Issued', helper: 'Policy issued after approval. Document will be shared.' }
         ];
      }

      // Proper status-to-milestone mapping matrix
      let activeIdx = 0;
      let status = currentLead.status;
      let subStatus = currentLead.subStatus;

      if (product === 'property') {
        if (status === 'KYC' && subStatus === 'Pending') activeIdx = 1;
        else if (status === 'KYC' && subStatus === 'Completed') activeIdx = 2;
        else if (status === 'Policy Copy' && subStatus === 'Pending') activeIdx = 2;
        else if (status === 'Policy Copy' && subStatus === 'Issued') activeIdx = 3;
      } else if (product === 'lp' && isTata) {
        if (status === 'Tele-PD' && subStatus === 'Pending') activeIdx = 1;
        else if (status === 'Tele-PD' && subStatus === 'Completed') activeIdx = 2;
        else if (status === 'Policy Copy' && subStatus === 'Pending') activeIdx = 2;
        else if (status === 'Policy Copy' && subStatus === 'Issued') activeIdx = 3;
      } else if (product === 'lp') {
        if (status === 'Proposal Form' && subStatus === 'Pending') activeIdx = 1;
        else if (status === 'Proposal Form' && subStatus === 'Completed') activeIdx = 2;
        else if (status === 'Policy Copy' && subStatus === 'Pending') activeIdx = 2;
        else if (status === 'Policy Copy' && subStatus === 'Issued') activeIdx = 3;
      } else {
        // CL/Term
        if (status === 'Documents' && subStatus === 'Pending') activeIdx = 1;
        else if (status === 'Documents' && subStatus === 'Partial') activeIdx = 1;
        else if (status === 'Documents' && subStatus === 'Received') activeIdx = 2;
        else if (status === 'Medical' && subStatus === 'Scheduled') activeIdx = 3;
        else if (status === 'Medical' && subStatus === 'Completed') activeIdx = 4;
        else if (status === 'Underwriting' && (subStatus === 'Pending' || subStatus === 'Counter Offer')) activeIdx = 5;
        else if (status === 'Underwriting' && (subStatus === 'Approved' || subStatus === 'Rejected')) activeIdx = 6;
        else if (status === 'Policy Copy' && subStatus === 'Pending') activeIdx = 6;
        else if (status === 'Policy Copy' && subStatus === 'Issued') activeIdx = 7;
      }

      // Payment Verified is always done (first milestone) when in Processing
      if (activeIdx === 0) activeIdx = 1;

      // Simulated completion dates for done milestones
      let baseDateMs = Date.now() - (activeIdx * 2 * 86400000); // 2 days apart
      
      let milestoneHtml = milestones.map((m, i) => {
         let isDone = i < activeIdx;
         let isActive = i === activeIdx;
         let isPending = !isDone && !isActive;
         let bg = isDone ? '#F0FDF4' : isActive ? '#EFF6FF' : 'transparent';
         let borderColor = isDone ? '#BBF7D0' : isActive ? '#BFDBFE' : '#E5E7EB';
         let dotBg = isDone ? '#10B981' : isActive ? 'var(--primary)' : 'white';
         let dotBorder = isDone ? '#10B981' : isActive ? 'var(--primary)' : '#D1D5DB';
         let icon = isDone ? '✓' : isActive ? (i+1) : (i+1);
         let dotColor = isDone || isActive ? 'white' : '#9CA3AF';
         
         // Simulated date for done milestones
         let doneDate = '';
         if (isDone) {
            let d = new Date(baseDateMs + (i * 2 * 86400000));
            doneDate = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
         }
         
         return `
           <div style="display:flex; flex-direction:column; align-items:center; position:relative; flex:1; min-width:100px; text-align:center;">
             <div style="width:32px; height:32px; border-radius:50%; border:2px solid ${dotBorder}; background:${dotBg}; color:${dotColor}; display:flex; align-items:center; justify-content:center; font-size:${isDone?'14':'13'}px; font-weight:700; z-index:2; margin-bottom:12px;">${icon}</div>
             ${i < milestones.length - 1 ? `<div style="position:absolute; top:16px; left:50%; width:100%; height:2px; background:${isDone ? '#10B981' : '#E5E7EB'}; z-index:1;"></div>` : ''}
             <div style="font-weight:600; font-size:12px; color:${isDone ? '#059669' : isActive ? 'var(--primary)' : '#9CA3AF'}; line-height:1.2; margin-bottom:4px; max-width:90%;">${m.label}</div>
             ${isDone ? `<div style="font-size:10px; color:#059669;">${doneDate}</div>` : ''}
             ${isActive ? `<div style="position:absolute; top:100%; left:50%; transform:translateX(-50%); width:140px; background:white; border:1px solid #BFDBFE; border-radius:6px; padding:8px; font-size:10px; color:var(--text-muted); line-height:1.3; margin-top:8px; z-index:10; box-shadow:0 4px 6px rgba(0,0,0,0.05);">${m.helper}</div>` : ''}
           </div>
         `;
      }).join('');

      // Product header
      let productLabel = getProductLabel(product);
      let insurerLabel = insurer || (product === 'property' ? 'Bajaj General' : product === 'lp' ? 'CARE Health' : 'PB Partner');

      return `
        <div class="card" style="padding:24px; box-shadow:0 4px 15px rgba(0,0,0,0.05); border:none; margin: 24px auto; max-width:100%;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px; padding-bottom:16px; border-bottom:1px solid var(--border);">
            <div>
              <h2 style="margin:0; font-size:20px;">Milestone Tracker</h2>
              <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">${productLabel} • ${insurerLabel}</div>
            </div>
            <div class="badge" style="background:#FEF3C7; color:#92400E; border:1px solid #FDE68A;">Payment Done</div>
          </div>
          <div style="display:flex; justify-content:space-between; overflow-x:auto; padding-bottom:80px; scrollbar-width:thin;">
             ${milestoneHtml}
          </div>
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

    function getRightPanelTabContent(tab) {
      if (tab === 'History') {
        let logsHtml = (currentLead.log || []).map(log => `
          <div style="background: white; border: 1px solid #E5E7EB; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #9CA3AF;">${log.type || 'SYSTEM UPDATE'}</div>
              <div style="font-size: 11px; font-weight: 600; color: #473391;">By ${log.by || 'Verification Agent'}</div>
            </div>
            <div style="font-size: 12px; font-weight: 600; color: #111827; margin-top: 4px;">${log.text}</div>
            <div style="font-size: 11px; color: #4B5563; margin-top: 2px; line-height: 1.5;">${log.desc || 'Automatic update from the system.'}</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
              <div style="font-size: 10px; color: #9CA3AF;">At ${log.time || 'Today'}</div>
              <div style="font-size: 10px; color: #9CA3AF;">From Sangam</div>
            </div>
          </div>
        `).join('');

        let sampleLog1 = `
          <div style="background: white; border: 1px solid #E5E7EB; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #9CA3AF;">SYSTEM UPDATE</div>
              <div style="font-size: 11px; font-weight: 600; color: #473391;">By Verification Agent</div>
            </div>
            <div style="font-size: 12px; font-weight: 600; color: #111827; margin-top: 4px;">Lead assigned from Sangam</div>
            <div style="font-size: 11px; color: #4B5563; margin-top: 2px; line-height: 1.5;">Automatic update from the system.</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
              <div style="font-size: 10px; color: #9CA3AF;">At Just now</div>
              <div style="font-size: 10px; color: #9CA3AF;">From Sangam</div>
            </div>
          </div>
        `;
        let sampleLog2 = `
          <div style="background: white; border: 1px solid #E5E7EB; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #9CA3AF;">SYSTEM UPDATE</div>
              <div style="font-size: 11px; font-weight: 600; color: #473391;">By Verification Agent</div>
            </div>
            <div style="font-size: 12px; font-weight: 600; color: #111827; margin-top: 4px;">Call attempt: Not connected</div>
            <div style="font-size: 11px; color: #4B5563; margin-top: 2px; line-height: 1.5;">Automatic call attempt triggered. Customer did not pick up.</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
              <div style="font-size: 10px; color: #9CA3AF;">At Yesterday</div>
              <div style="font-size: 10px; color: #9CA3AF;">From Sangam</div>
            </div>
          </div>
        `;
        return logsHtml + sampleLog1 + sampleLog2;
      }
      if (tab === 'FollowUp') {
        return `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; margin-top: 40px;">
            <div style="width: 60px; height: 60px; background: #F3F4F6; border-radius: 8px; margin-bottom: 16px;"></div>
            <div style="font-size: 12px; font-weight: 600; color: #6B7280; margin-bottom: 8px;">No follow-up scheduled</div>
            <div style="font-size: 11px; color: #9CA3AF; max-width: 200px;">Set a follow-up from Update Status above.</div>
          </div>
        `;
      }
      if (tab === 'Documents') {
        return `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; margin-top: 40px;">
            <div style="width: 60px; height: 60px; background: #F3F4F6; border-radius: 8px; margin-bottom: 16px;"></div>
            <div style="font-size: 12px; font-weight: 600; color: #6B7280; margin-bottom: 8px;">No documents uploaded yet</div>
            <div style="font-size: 11px; color: #9CA3AF; max-width: 200px;">Documents will appear here once uploaded.</div>
          </div>
        `;
      }
      return '';
}

    function renderRightPanel() {
      const l = currentLead;
      const bucketConfig = STATE_MACHINE_CONFIG[l.bucket || 'New'];
      const statusKeys = Object.keys(bucketConfig.statuses);
      let statusOptionsHtml = statusKeys.map((k, i) => `<option value="${k}" ${k===l.status?'selected':i===0?'selected':''}>${k}</option>`).join('');
      
      let activeTab = l.activeTab || 'History';
      let isPaymentDone = (l.status || statusKeys[0]) === 'Payment Done';
      
      let html = `
        <style>
          #detail-right select:focus, #detail-right input:focus, #detail-right textarea:focus {
            border-color: #473391 !important;
            background: white !important;
          }
        </style>
        <div style="flex-shrink: 0; padding: 16px 24px; border-bottom: 2px solid #E5E7EB; background: white;">
          <div style="font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 16px;">Update Status</div>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div>
              <label style="font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 5px; display: block;">STATUS</label>
              <select id="detail-status" style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; font-family: Poppins; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;" onchange="handleDetailStatusChange();">
                ${statusOptionsHtml}
              </select>
            </div>
            <div>
              <label style="font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 5px; display: block;">SUB STATUS</label>
              <select id="detail-substatus" style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; font-family: Poppins; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;" onchange="handleDetailSubStatusChange()">
              </select>
            </div>
            <div id="detail-fup-wrapper" style="display: ${isPaymentDone ? 'none' : 'flex'}; gap: 8px;">
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
            
            <div id="detail-payment-wrapper" style="display: ${isPaymentDone ? 'block' : 'none'}; border-top: 1px solid #F3F4F6; padding-top: 14px; margin-top: 2px;">
              <div style="font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; margin-bottom: 12px;">PAYMENT VERIFICATION</div>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <div>
                  <label style="font-size: 10px; font-weight: 700; color: #9CA3AF; margin-bottom: 4px; display: block;">PAYMENT AMOUNT *</label>
                  <input type="number" id="detail-pay-amount" placeholder="₹ Amount" oninput="validatePaymentFields()" style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; font-family: Poppins; background: #FAFAFA; padding: 0 10px; outline: none;">
                </div>
                <div>
                  <label style="font-size: 10px; font-weight: 700; color: #9CA3AF; margin-bottom: 4px; display: block;">UTR NUMBER *</label>
                  <input type="text" id="detail-pay-utr" placeholder="Transaction reference" oninput="validatePaymentFields()" style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; font-family: Poppins; background: #FAFAFA; padding: 0 10px; outline: none;">
                </div>
                <div>
                  <label style="font-size: 10px; font-weight: 700; color: #9CA3AF; margin-bottom: 4px; display: block;">PAYMENT DATE *</label>
                  <input type="date" id="detail-pay-date" onchange="validatePaymentFields()" style="width: 100%; height: 36px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; font-family: Poppins; background: #FAFAFA; padding: 0 10px; outline: none;">
                </div>
                <div>
                  <label style="font-size: 10px; font-weight: 700; color: #9CA3AF; margin-bottom: 4px; display: block;">UPLOAD PROOF *</label>
                  <input type="file" id="detail-pay-proof" accept=".png,.jpg,.jpeg,.pdf" onchange="validatePaymentFields(); this.nextElementSibling.innerText=this.files[0].name" style="display: none;">
                  <div style="font-size: 11px; color: #473391; margin-top: 2px;"></div>
                  <button style="border: 1px dashed #C5C0F5; background: #FAFAFA; border-radius: 6px; font-size: 11px; font-weight: 600; padding: 8px; width: 100%; cursor: pointer;" onclick="document.getElementById('detail-pay-proof').click()">Choose File</button>
                </div>
              </div>
            </div>

            <div>
              <label style="font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 5px; display: block;">REMARKS</label>
              <textarea id="detail-remarks" placeholder="Add remarks..." style="width: 100%; height: 72px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; font-family: Poppins; background: #FAFAFA; padding: 8px 10px; outline: none; resize: none; transition: border-color 0.2s, background 0.2s; box-sizing: border-box;"></textarea>
            </div>
            <button id="detail-save-btn" style="width: 100%; height: 42px; background: #473391; color: white; font-size: 13px; font-weight: 700; border-radius: 8px; margin-top: 16px; border: none; cursor: pointer; transition: opacity 0.2s;" ${isPaymentDone ? 'disabled' : ''} onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'" onclick="saveDetailStatusUpdate()">Update Status</button>
            <div id="detail-pay-msg" style="display: ${isPaymentDone ? 'block' : 'none'}; font-size: 10px; color: #9CA3AF; text-align: center; margin-top: 4px;">All 4 verification fields are required before saving.</div>
          </div>
        </div>
        <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; background: white;">
          <div style="flex-shrink: 0; display: flex; background: white; border-bottom: 1px solid #E5E7EB; position: sticky; top: 0; z-index: 10;">
            <div style="flex: 1; text-align: center; padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; color: ${activeTab === 'History' ? '#473391' : '#9CA3AF'}; border-bottom: ${activeTab === 'History' ? '2px solid #473391' : '2px solid transparent'};" onclick="currentLead.activeTab='History'; renderLeadDetail();">Activity History</div>
            <div style="flex: 1; text-align: center; padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; color: ${activeTab === 'FollowUp' ? '#473391' : '#9CA3AF'}; border-bottom: ${activeTab === 'FollowUp' ? '2px solid #473391' : '2px solid transparent'};" onclick="currentLead.activeTab='FollowUp'; renderLeadDetail();">Follow Up</div>
            <div style="flex: 1; text-align: center; padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; color: ${activeTab === 'Documents' ? '#473391' : '#9CA3AF'}; border-bottom: ${activeTab === 'Documents' ? '2px solid #473391' : '2px solid transparent'};" onclick="currentLead.activeTab='Documents'; renderLeadDetail();">Documents</div>
          </div>
          <div style="flex: 1; overflow-y: auto; padding: 12px 20px; background: white;">
            ${getRightPanelTabContent(activeTab)}
          </div>
        </div>
      `;
      document.getElementById('detail-right').innerHTML = html;
      
      handleDetailStatusChange();
}
    
    window.completeTask = function(taskId) {
      const task = window.G_TASKS.find(t => t.id === taskId);
      if (task) {
        task.status = 'completed';
        showToast('Task marked complete');
        renderLeadDetail();
      }
    };

    
    window.validatePaymentFields = function() {
        let amt = document.getElementById('detail-pay-amount')?.value;
        let utr = document.getElementById('detail-pay-utr')?.value;
        let dte = document.getElementById('detail-pay-date')?.value;
        let prf = document.getElementById('detail-pay-proof')?.files.length > 0;
        let btn = document.getElementById('detail-save-btn');
        if (btn) {
            if (amt && utr && dte && prf) {
                btn.disabled = false;
                btn.style.opacity = '1';
            } else {
                btn.disabled = true;
                btn.style.opacity = '0.5';
            }
        }
    };

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
      
      if (statusConfig && statusConfig.mandatoryFollowUp) {
        fupWrapper.style.display = 'flex';
      } else {
        fupWrapper.style.display = 'none';
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

    function renderProductSelection() {
      const products = [
        { code: 'LP', name: 'Loan Protection', desc: 'Covers the outstanding home loan amount in case of death or disability. Ensures the family keeps their home.', benefit: 'Loan liability fully covered — family never inherits debt', insurers: 'CARE Health, TATA AIG' },
        { code: 'PR', name: 'Property Insurance', desc: 'Protects the physical property against fire, natural disasters, and structural damage. Annual renewable policy.', benefit: 'Property value protected against unforeseen damage', insurers: 'Bajaj General, HDFC Ergo, SBI General' },
        { code: 'CL', name: 'Credit Life', desc: "Covers the borrower's life for the loan tenure. If the borrower passes away, the insurer repays the outstanding loan.", benefit: 'Decreasing cover that matches loan outstanding — cost-effective', insurers: 'PB Partners (via PolicyBazaar)' },
        { code: 'TP', name: 'Term Plan', desc: "Pure life cover at low cost. Pays a lump sum to the nominee on the policyholder's death during the policy term.", benefit: 'High cover at lowest premium — ideal for income replacement', insurers: 'PB Partners (via PolicyBazaar)' }
      ];

      const pState = window.selectedProduct || null;

      let cardsHtml = products.map(p => {
        const isSelected = pState === p.code;
        const border = isSelected ? '2px solid #473391' : '2px solid #E5E7EB';
        const bg = isSelected ? '#F0EEFB' : 'white';
        const tagBg = isSelected ? '#473391' : '#F0EEFB';
        const tagColor = isSelected ? 'white' : '#473391';
        const nameColor = isSelected ? '#473391' : '#111827';
        
        let radioHtml = '';
        if (isSelected) {
          radioHtml = `<div style="width: 18px; height: 18px; border-radius: 50%; border: 2px solid #473391; background: #473391; display: flex; align-items: center; justify-content: center;"><div style="width: 6px; height: 6px; border-radius: 50%; background: white;"></div></div>`;
        } else {
          radioHtml = `<div style="width: 18px; height: 18px; border-radius: 50%; border: 2px solid #E5E7EB; background: transparent;"></div>`;
        }

        return `
          <div style="background: ${bg}; border: ${border}; border-radius: 12px; padding: 18px; cursor: pointer; transition: all 0.15s;" onclick="selectProduct('${p.code}')">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div style="width: 32px; height: 32px; background: ${tagBg}; color: ${tagColor}; border-radius: 6px; font-size: 11px; font-weight: 700; text-align: center; line-height: 32px;">${p.code}</div>
              ${radioHtml}
            </div>
            <div style="font-size: 14px; font-weight: 700; color: ${nameColor}; margin-top: 10px;">${p.name}</div>
            <div style="font-size: 11px; color: #6B7280; line-height: 1.5; margin-top: 4px;">${p.desc}</div>
            <div style="font-size: 11px; color: #1A7A4A; font-weight: 600; margin-top: 8px;">✓ ${p.benefit}</div>
            <div style="font-size: 11px; margin-top: 6px;"><span style="color: #9CA3AF;">Insurers:</span> <span style="color: #4B5563; font-weight: 600;">${p.insurers}</span></div>
          </div>
        `;
      }).join('');

      const btnBg = pState ? '#473391' : '#C5C0F5';
      const btnCursor = pState ? 'pointer' : 'not-allowed';
      const btnOpacity = pState ? '1' : '0.6';
      
      return `
        <div style="padding: 30px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 18px; font-weight: 700; color: #111827;">Select Insurance Product</div>
            <div style="font-size: 13px; color: #6B7280; margin-top: 4px;">Understand the customer's needs and select the right product.</div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            ${cardsHtml}
          </div>
          <button style="width: 100%; height: 48px; margin-top: 20px; background: ${btnBg}; color: white; border-radius: 10px; font-size: 14px; font-weight: 700; font-family: Poppins; border: none; cursor: ${btnCursor}; opacity: ${btnOpacity}; transition: opacity 0.2s;" ${pState ? 'onclick="generateQuote()"' : ''}>Generate Quote →</button>
        </div>
      `;
    }

    window.selectProduct = function(code) {
      window.selectedProduct = code;
      renderLeadDetail();
    };

    window.generateQuote = function() {
      if (!window.selectedProduct) return;
      
      currentLead.bucket = 'Quote';
      let codeMap = { 'LP': 'lp', 'PR': 'property', 'CL': 'cl', 'TP': 'tp' };
      currentLead.finalProduct = codeMap[window.selectedProduct.toUpperCase()] || window.selectedProduct.toLowerCase();
      
      let pMap = {
        'LP': 'Loan Protection',
        'PR': 'Property Insurance',
        'CL': 'Credit Life',
        'TP': 'Term Plan'
      };
      
      if (!currentLead.log) currentLead.log = [];
      currentLead.log.unshift({
        type: 'Agent Update',
        by: 'Rohit M',
        text: 'Quote generation initiated',
        desc: `Product selected: ${pMap[window.selectedProduct.toUpperCase()] || window.selectedProduct}. Lead moved to Quote bucket.`,
        time: 'Just now'
      });
      
      showToast('Lead moved to Quote bucket');
      
      window.selectedProduct = null;
      renderLeadDetail();
    };

    
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

    
window.enterBulkAssignMode = function() {
    window.bulkAssignMode = true;
    window.selectedBulkLeads = new Set();
    document.getElementById('bulk-action-banner').style.display = 'flex';
    document.getElementById('th-bulk-checkbox').style.display = 'table-cell';
    renderLeadTable();
    updateBulkBanner();
};

window.exitBulkAssignMode = function() {
    window.bulkAssignMode = false;
    window.selectedBulkLeads = new Set();
    document.getElementById('bulk-action-banner').style.display = 'none';
    document.getElementById('th-bulk-checkbox').style.display = 'none';
    renderLeadTable();
};

window.toggleBulkSelect = function(id) {
    if(window.selectedBulkLeads.has(id)) {
        window.selectedBulkLeads.delete(id);
    } else {
        window.selectedBulkLeads.add(id);
    }
    renderLeadTable();
    updateBulkBanner();
};

window.toggleAllBulkSelect = function(checkboxElement) {
    // Only select visible rows (post-filter)
    let visibleIds = Array.from(document.querySelectorAll('#lead-table-body tr')).map(tr => {
       let oc = tr.getAttribute('onclick');
       if(!oc) return null;
       let match = oc.match(/'(INS-[^']+)'/);
       return match ? match[1] : null;
    }).filter(x => x);
    
    let allSelected = visibleIds.every(id => window.selectedBulkLeads.has(id));
    
    if(allSelected) {
       visibleIds.forEach(id => window.selectedBulkLeads.delete(id));
    } else {
       visibleIds.forEach(id => window.selectedBulkLeads.add(id));
    }
    renderLeadTable();
    updateBulkBanner();
};

window.updateBulkBanner = function() {
    if (!window.bulkAssignMode) return;
    
    let count = window.selectedBulkLeads.size;
    let bannerCount = document.getElementById('bulk-action-count');
    let btn = document.getElementById('bulk-assign-btn');
    
    let visibleCount = document.querySelectorAll('#lead-table-body tr').length;
    bannerCount.innerHTML = `Showing ${visibleCount} leads &middot; ${count} selected`;
    
    if(count > 0) {
       btn.style.display = 'block';
       btn.innerHTML = `Assign ${count} Leads &rarr;`;
    } else {
       btn.style.display = 'none';
    }
    
    let cb = document.getElementById('bulk-select-all');
    if(cb) {
       cb.checked = (count > 0 && count >= visibleCount);
       cb.indeterminate = (count > 0 && count < visibleCount);
    }
};

window.openBulkAssignModal = function() {
    let count = window.selectedBulkLeads.size;
    document.getElementById('bulk-modal-title').textContent = `You are reassigning ${count} leads`;
    
    let pillsHtml = '';
    let arr = Array.from(window.selectedBulkLeads);
    let toShow = arr.slice(0, 3);
    
    toShow.forEach(id => {
       pillsHtml += `<span style="background: #F0EEFB; color: #473391; font-size: 11px; font-weight: 700; border-radius: 4px; padding: 2px 8px;">${id}</span>`;
    });
    
    if(arr.length > 3) {
       pillsHtml += `<span style="font-size: 11px; color: #9CA3AF; margin-left: 4px;">+${arr.length - 3} more</span>`;
    }
    
    document.getElementById('bulk-modal-pills').innerHTML = pillsHtml;
    document.getElementById('bulk-assignee-select').value = "";
    document.getElementById('btn-confirm-bulk').disabled = true;
    document.getElementById('btn-confirm-bulk').style.opacity = '0.4';
    
    document.getElementById('bulk-assign-modal').style.display = 'flex';
};

window.confirmBulkAssign = function() {
    document.getElementById('bulk-assign-modal').style.display = 'none';
    let newAgent = document.getElementById('bulk-assignee-select').value;
    
    document.getElementById('table-loading-overlay').style.display = 'flex';
    
    setTimeout(() => {
        let count = window.selectedBulkLeads.size;
        window.selectedBulkLeads.forEach(id => {
            let lead = LEADS.find(l => l.id === id);
            if(lead) {
                lead.agent = newAgent;
                if(!lead.log) lead.log = [];
                lead.log.unshift({
                    type: 'System Update',
                    by: 'Manager',
                    text: `Lead reassigned from previous agent to ${newAgent} by Manager`,
                    time: 'Just now'
                });
            }
        });
        
        document.getElementById('table-loading-overlay').style.display = 'none';
        exitBulkAssignMode();
        showToast(`${count} leads successfully assigned to ${newAgent}`);
    }, 1000);
};

// Add to Init


    window.newStageActiveTab = null;
    window.newStageFormData = {};
    window.newStageSaveTimer = null;
    window.newStageSavedTimer = null;
    
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
    
    window.updateNewStageCompletion = function() {
       let fields = document.querySelectorAll('.new-stage-track');
       let filled = 0;
       fields.forEach(f => {
          if (f.type === 'radio' || f.type === 'checkbox') {
              if (f.checked) filled++; // Or track by custom class if we build div-based
          } else if(f.value && f.value.trim() !== '') filled++;
       });
       let req = fields.length;
       let c = document.getElementById('new-stage-completion');
       if(c) {
          if(filled >= req && req > 0) {
             c.textContent = '✓ All required fields filled';
             c.style.color = '#1A7A4A';
             c.style.fontWeight = '600';
          } else {
             c.textContent = `${filled} of ${req} fields filled`;
             c.style.color = '#9CA3AF';
             c.style.fontWeight = 'normal';
          }
       }
    };
    
    window.toggleCustomRadio = function(name, val) {
       window.newStageFormData[name] = val;
       triggerNewStageSave();
       renderLeadDetail(); // To reflect active UI
    };
    window.toggleCustomCheckbox = function(name) {
       window.newStageFormData[name] = !window.newStageFormData[name];
       triggerNewStageSave();
       renderLeadDetail();
    };


    // Flow Helpers
    window.generateQuoteFromNew = function() {
       let tab = window.newStageActiveTab || currentLead.initialProduct || 'Loan Protection';
       currentLead.bucket = 'Contacted';
       currentLead.log.unshift({dot:'#10B981', text:`Quote generation initiated from NEW stage · Product: ${tab}`, time:'Just now', user: 'IBM Agent'});
       currentLead.quoteResultsVisible = false; // Reset quote results state
       renderLeadDetail();
    };
    
    window.generateQuoteFromContacted = function(reqCount) {
       let fields = document.querySelectorAll('.new-stage-track');
       let filled = 0;
       fields.forEach(f => {
          if (f.type === 'radio' || f.type === 'checkbox') {
              if (f.checked) filled++;
          } else if(f.value && f.value.trim() !== '') {
              filled++;
              f.style.borderColor = '#E5E7EB'; // Reset error
          } else {
              f.style.borderColor = '#C0392B'; // Show error
          }
       });
       if(filled >= reqCount) {
           let tab = window.newStageActiveTab || currentLead.initialProduct || 'Loan Protection';
           currentLead.log.unshift({dot:'#3B82F6', text:`Quotes generated · Product: ${tab}`, time:'Just now', user: 'IBM Agent'});
           currentLead.quoteResultsVisible = true;
           currentLead.pbStep2 = false; // Reset PB step 2
           renderLeadDetail();
       } else {
           showToast('Please fill all required fields');
       }
    };
    
    window.shareQuotesFromContacted = function(insurer, premium, method) {
       showToast('Quote shared successfully', 'success');
       currentLead.bucket = 'Quote';
       currentLead.status = 'Quote Shared';
       currentLead.subStatus = 'Consent Pending';
       currentLead.lockedPlanName = insurer;
       currentLead.lockedPremium = premium;
       currentLead.log.unshift({dot:'#10B981', text:`Quote shared with customer · ${insurer} · ${premium} · via ${method}`, time:'Just now', user: 'IBM Agent'});
       renderLeadDetail();
    };

    window.openPolicyBazaarWorkspace = function() {
       currentLead.pbStep2 = true;
       window.open('https://partner.policybazaar.com', '_blank');
       renderLeadDetail();
    };

    window.confirmPaymentStatus = function() {
       if (currentLead.paymentVerificationStatus === 'Verified') {
           currentLead.bucket = 'Payment Done';
           currentLead.status = 'Payment Done';
           currentLead.subStatus = 'Verified';
           currentLead.log.unshift({dot:'#10B981', text:`Payment verified by IBM Manager · UTR: ${currentLead.paymentUtr} · ₹${currentLead.paymentAmount} · ${currentLead.paymentDate}`, time:'Just now', user: 'IBM Manager'});
       } else {
           currentLead.log.unshift({dot:'#F59E0B', text:`Payment status updated to ${currentLead.paymentVerificationStatus}`, time:'Just now', user: 'IBM Agent'});
       }
       renderLeadDetail();
    };


    window.changePlanModal = function() {
        let m = prompt('Enter new plan name (e.g. CARE Health / TATA AIG)');
        if(m) {
            currentLead.lockedPlanName = m;
            currentLead.lockedPremium = '₹12,500'; // mock
            currentLead.log.unshift({dot:'#3B82F6', text:\`Changed selected plan to ${m}\`, time:'Just now', user: 'IBM Agent'});
            renderLeadDetail();
        }
    };

// Init


    renderPipelineCards();
    renderLeadTable();
  