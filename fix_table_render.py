import re

html = open("index.html").read()

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
"""

html = re.sub(r'    function renderLeadTable\(\) \{.*?\n    // === NAVIGATION ===', new_render_func + '\n    // === NAVIGATION ===', html, flags=re.DOTALL)

with open("index.html", "w") as f:
    f.write(html)
