import re

html = open("index.html").read()

# 1. Update Header Button for List View (My Insurance Leads)
# The current button is: <button class="btn btn-primary" onclick="openCreateModal()">+ Create Insurance Lead</button>
# Let's replace only the first occurrence which is in the list view header.

new_buttons = """          <button style="border: 1.5px solid #473391; color: #473391; background: white; border-radius: 8px; font-size: 13px; font-weight: 600; padding: 8px 16px; cursor: pointer; display: flex; align-items: center; gap: 6px;" onclick="openBulkUploadModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            Bulk Upload
          </button>
          <button class="btn btn-primary" onclick="openCreateModal()">+ Create Insurance Lead</button>"""

# Using re.sub with count=1 to only replace the first occurrence
html = html.replace('<button class="btn btn-primary" onclick="openCreateModal()">+ Create Insurance Lead</button>', new_buttons, 1)

# 2. Update Table Header (thead)
old_thead = """          <thead>
            <tr>
              <th>Insurance ID</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Loan</th>
              <th>Stage</th>
              <th>Source</th>
              <th>Status</th>
              <th>Status Update</th>
              <th>Next Follow-up</th>
              <th>Assignee</th>
            </tr>
          </thead>"""

new_thead = """          <thead>
            <tr>
              <th style="width: 100px;">INSURANCE ID</th>
              <th style="width: 160px;">CUSTOMER</th>
              <th style="width: 140px;">PRODUCT</th>
              <th style="width: 130px;">LOAN</th>
              <th style="width: 180px;">STAGE & STATUS</th>
              <th style="width: 120px;">SOURCE / SUB SOURCE</th>
              <th style="width: 120px;">PARTNER</th>
              <th style="width: 100px;">RM</th>
              <th style="width: 140px;">NEXT FOLLOW-UP</th>
              <th style="width: 110px;">CREATED AT</th>
              <th style="width: 110px;">ASSIGN TO</th>
            </tr>
          </thead>"""

html = html.replace(old_thead, new_thead)

# 3. Update renderLeadTable
old_render_start = "    function renderLeadTable() {"
old_render_end = "    window.renderQueue = function() {"

new_render_func = """    function renderLeadTable() {
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
           if (diffDays === 0) leadAge = 'Just now'; // Default mockup
           else if (diffDays === 1) leadAge = '1 day ago';
           else leadAge = `${diffDays} days ago`;
        }
        
        let createdDate = l.createdDate || '15 Jun 2026'; // Mockup formatting
        
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
               <div style="font-weight:600">${loanAmount} · ${bankText}</div>
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
      if (tbody) tbody.innerHTML = html;
    }

"""

# Regex replacement
html = re.sub(r'    function renderLeadTable\(\) \{.*?\n    window\.renderQueue = function\(\) \{', new_render_func + '\n    window.renderQueue = function() {', html, flags=re.DOTALL)

# 4. Add Bulk Upload Modal
modal_html = """
    <!-- Bulk Upload Modal -->
    <div class="modal-overlay" id="bulkUploadModal" onclick="if(event.target === this) closeBulkUploadModal()">
      <div class="modal-content" style="width: 500px;">
        <h2 style="font-size: 16px; font-weight: 700; margin: 0; color: #111827;">Bulk Lead Upload</h2>
        <div style="font-size: 13px; color: #6B7280; margin-top: 4px; margin-bottom: 24px;">Upload a CSV file to create multiple insurance leads at once.</div>
        
        <div style="border: 2px dashed #C5C0F5; border-radius: 8px; padding: 32px; text-align: center; background: #FAFAFA; margin-bottom: 12px; cursor: pointer;">
            <div style="color: #473391; margin-bottom: 12px;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            </div>
            <div style="font-size: 13px; color: #6B7280; font-weight: 500;">Click to upload or drag and drop</div>
            <div style="font-size: 11px; color: #9CA3AF; margin-top: 4px;">CSV files only · Max 500 rows</div>
        </div>
        
        <div style="margin-bottom: 24px;">
            <a href="#" style="font-size: 12px; color: #473391; text-decoration: underline; font-weight: 500;">Download Template</a>
        </div>
        
        <div style="display:flex; justify-content: flex-end; gap:12px;">
           <button style="height:36px; padding: 0 16px; background:white; color:#6B7280; border:1px solid #E5E7EB; border-radius:8px; font-weight:600; cursor:pointer;" onclick="closeBulkUploadModal()">Cancel</button>
           <button style="height:36px; padding: 0 16px; background:#473391; color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer;" onclick="closeBulkUploadModal(); showToast('Uploading leads...');">Upload Leads</button>
        </div>
      </div>
    </div>
"""

# Insert modal before closing body
html = html.replace('</body>', modal_html + '\n</body>')

# 5. Add open/close modal functions
js_funcs = """
    window.openBulkUploadModal = function() {
        document.getElementById('bulkUploadModal').style.display = 'flex';
        setTimeout(() => { document.getElementById('bulkUploadModal').style.opacity = '1'; }, 10);
    };
    window.closeBulkUploadModal = function() {
        document.getElementById('bulkUploadModal').style.display = 'none';
        document.getElementById('bulkUploadModal').style.opacity = '0';
    };
"""

html = html.replace('// === INIT ===', js_funcs + '\n    // === INIT ===')

with open("index.html", "w") as f:
    f.write(html)
