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
      const statusKeys = Object.keys(bucketConfig.statuses);
      let statusOptionsHtml = statusKeys.map((k, i) => `<option value="${k}" ${i===0?'selected':''}>${k}</option>`).join('');
      
      let activeTab = l.activeTab || 'History';
      
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
              <select id="detail-status" style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; font-family: Poppins; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;" onchange="handleDetailStatusChange()">
                ${statusOptionsHtml}
              </select>
            </div>
            <div>
              <label style="font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 5px; display: block;">SUB STATUS</label>
              <select id="detail-substatus" style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; font-family: Poppins; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;" onchange="handleDetailSubStatusChange()">
              </select>
            </div>
            <div id="detail-fup-wrapper" style="display: flex; gap: 8px;">
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
        <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; background: white;">
          <div style="flex-shrink: 0; display: flex; background: white; border-bottom: 1px solid #E5E7EB; position: sticky; top: 0; z-index: 10;">
            <div style="flex: 1; text-align: center; padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; color: ${activeTab === 'History' ? '#473391' : '#9CA3AF'}; border-bottom: ${activeTab === 'History' ? '2px solid #473391' : '2px solid transparent'};" onclick="currentLead.activeTab='History'; renderLeadDetail();">Activity History</div>
            <div style="flex: 1; text-align: center; padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; color: ${activeTab === 'FollowUp' ? '#473391' : '#9CA3AF'}; border-bottom: ${activeTab === 'FollowUp' ? '2px solid #473391' : '2px solid transparent'};" onclick="currentLead.activeTab='FollowUp'; renderLeadDetail();">Follow Up</div>
            <div style="flex: 1; text-align: center; padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; color: ${activeTab === 'Documents' ? '#473391' : '#9CA3AF'}; border-bottom: ${activeTab === 'Documents' ? '2px solid #473391' : '2px solid transparent'};" onclick="currentLead.activeTab='Documents'; renderLeadDetail();">Documents</div>
          </div>
          <div style="flex: 1; overflow-y: auto; padding: 12px 20px; background: #FAFAFA;">
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
      showToast('Lead moved to Quote bucket');
      
      window.selectedProduct = null; // reset
      renderLeadDetail(); // Will re-render the whole screen since stage changed
    };

    // Init
    renderPipelineCards();
    renderLeadTable();
  </script>
</body>
</html>
