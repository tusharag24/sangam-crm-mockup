import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

missing_functions = """
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

    // Init
"""

if "// Init" in html:
    html = html.replace('// Init', missing_functions)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Injected missing buttons functions successfully.")
else:
    print("// Init not found!")
