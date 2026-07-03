import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add CSS
css = """
    /* Accordion styles */
    .accordion-section {
        background: white; border: 1px solid #E5E7EB; border-radius: 10px; overflow: hidden; margin-bottom: 12px;
    }
    .accordion-header {
        padding: 14px 18px; background: #F9FAFB; cursor: pointer; display: flex; align-items: center; justify-content: space-between;
    }
    .accordion-header-left {
        display: flex; align-items: center;
    }
    .accordion-header-icon {
        width: 8px; height: 8px; border-radius: 50%; margin-right: 8px;
    }
    .accordion-header-title {
        font-size: 13px; font-weight: 700; color: #111827;
    }
    .accordion-header-summary {
        font-size: 11px; color: #6B7280; margin-left: 8px;
    }
    .accordion-header-chevron {
        color: #9CA3AF; transition: transform 0.2s;
    }
    .accordion-header-chevron.expanded {
        transform: rotate(180deg);
    }
    .accordion-content {
        padding: 24px; border-top: 1px solid #E5E7EB; display: none;
    }
    .accordion-content.expanded {
        display: block;
    }
    .form-readonly {
        pointer-events: none; background-color: #F9FAFB !important; opacity: 0.8;
    }

    /* Mark as lost modal */
    .lost-modal-overlay {
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.4);
        z-index: 1000; display: none; align-items: center; justify-content: center;
    }
    .lost-modal {
        width: 480px; background: white; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.16); padding: 24px;
    }
"""
if "/* Accordion styles */" not in html:
    html = html.replace("</style>", css + "\n  </style>")

# 2. Add Modal HTML
modal_html = """
    <!-- Mark as Lost Modal -->
    <div class="lost-modal-overlay" id="lostModal">
      <div class="lost-modal">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <div style="font-size:16px; font-weight:700; color:#C0392B;">Mark as Lost</div>
          <div style="font-size:16px; color:#9CA3AF; cursor:pointer;" onclick="closeLostModal()">✕</div>
        </div>
        <div style="font-size:12px; color:#9CA3AF;">This lead will be removed from your queue and can only be reopened by an IBM Manager.</div>
        <div style="border-top: 1px solid #F3F4F6; margin: 14px 0;"></div>
        
        <div style="background:#F9FAFB; border-radius:6px; padding:10px 14px; margin-bottom:16px;" id="lostModalLeadSummary">
          <!-- Populated dynamically -->
        </div>

        <div style="font-size:11px; font-weight:700; color:#6B7280; text-transform:uppercase; margin-bottom:8px;">Reason for closing *</div>
        <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px;" id="lostReasonChips">
           <div class="chip" onclick="selectLostReason('Not Interested')">Not Interested</div>
           <div class="chip" onclick="selectLostReason('Bought elsewhere')">Bought elsewhere</div>
           <div class="chip" onclick="selectLostReason('Invalid Number')">Invalid Number</div>
           <div class="chip" onclick="selectLostReason('Duplicate')">Duplicate</div>
           <div class="chip" onclick="selectLostReason('Premium too high')">Premium too high</div>
           <div class="chip" onclick="selectLostReason('Medical rejection')">Medical rejection</div>
           <div class="chip" onclick="selectLostReason('Other')">Other</div>
        </div>
        
        <div style="font-size:11px; font-weight:700; color:#6B7280; text-transform:uppercase; margin-bottom:8px;">Additional Remarks (Optional)</div>
        <textarea id="lostRemarks" style="width:100%; height:80px; border:1.5px solid #E5E7EB; border-radius:8px; padding:10px; font-family:Poppins; font-size:13px; resize:none; margin-bottom:20px; outline:none;" placeholder="Enter any extra details here..."></textarea>
        
        <div style="display:flex; gap:12px;">
           <button style="flex:1; height:44px; background:white; color:#6B7280; border:1px solid #E5E7EB; border-radius:8px; font-weight:600; cursor:pointer;" onclick="closeLostModal()">Cancel</button>
           <button id="lostConfirmBtn" style="flex:1; height:44px; background:#C0392B; color:white; border:none; border-radius:8px; font-weight:700; cursor:pointer; opacity:0.5;" disabled onclick="confirmMarkAsLost()">Confirm & Mark as Lost</button>
        </div>
      </div>
    </div>
"""
if 'id="lostModal"' not in html:
    html = html.replace("</body>", modal_html + "\n</body>")

# 3. Add global logic
js_logic = """
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
    
    // Init
"""
if "window.accordionState" not in html:
    html = html.replace("// Init", js_logic)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Rebuilt UI patches.")
