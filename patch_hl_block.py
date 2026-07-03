import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# ── Change 1: Update LOAN block in header (line ~2282-2286) ──
old_loan_block = """            <div style="padding: 10px 20px; border-right: 1px solid #F3F4F6; flex: 1;">
              <div style="color: #9CA3AF; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px;">LOAN</div>
              <div style="font-size: 13px; font-weight: 600; color: #111827;">${l.hlLead ? '₹' + formatLakhs(l.hlLead.si) + ' · ' + l.hlLead.bank : '—'}</div>
              <div style="font-size: 11px; color: #6B7280;">HL Stage: <span style="font-weight: 700;">${l.hlLead ? getStageLabel(l.hlLead.hlStage) : '—'}</span></div>
            </div>"""

new_loan_block = """            <div style="padding: 10px 20px; border-right: 1px solid #F3F4F6; flex: 1;">
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
            </div>"""

html = html.replace(old_loan_block, new_loan_block)

# ── Change 2a: Remove HL banner from renderNewStage (center panel) ──
# The block is: `let hasHL = ...` through `let recProd = ...`  (lines ~2831-2858)
old_new_stage_banner = """       let hasHL = currentLead.hlLead || currentLead.si;
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
       
       let recProd = currentLead.initialProduct || 'Loan Protection';"""

new_new_stage_banner = """       let hlBanner = '';

       let recProd = currentLead.initialProduct || 'Loan Protection';"""

html = html.replace(old_new_stage_banner, new_new_stage_banner)

# ── Change 2b: Remove HL banner from renderContactedStage (center panel) ──
old_contacted_banner = """       let hasHL = currentLead.hlLead || currentLead.si;
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
       
       let recProd = currentLead.initialProduct || 'Loan Protection';"""

# Same replacement (they are identical content)
html = html.replace(old_contacted_banner, new_new_stage_banner)

# Clean up any remaining uses of ${hlBanner} that are still in templates — keep them,
# they'll just render empty string now.

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Done")
