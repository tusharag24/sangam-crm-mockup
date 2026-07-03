import re
import datetime

html = open("index.html").read()

def extract_function(html_content, func_name):
    start_idx = html_content.find(f"function {func_name}(")
    if start_idx == -1: return -1, -1
    
    brace_count = 0
    in_string = False
    string_char = ''
    start_brace = html_content.find("{", start_idx)
    
    for i in range(start_brace, len(html_content)):
        char = html_content[i]
        
        if char in ["'", '"', "`"]:
            if i > 0 and html_content[i-1] == '\\':
                pass
            elif not in_string:
                in_string = True
                string_char = char
            elif in_string and string_char == char:
                in_string = False
                
        if not in_string:
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    return start_idx, i + 1
    return -1, -1

s, e = extract_function(html, "renderPolicyStage")
if s != -1:
    old_func = html[s:e]
    
    new_func = """function renderPolicyStage() {
        let product = window.activeNewBucketTab || 'Loan Protection';
        let insurer = window.selectedPaymentQuote ? window.selectedPaymentQuote.insurer : 'CARE Health';
        let mKey = window.getMilestoneKey(product, insurer);
        
        let planName = window.selectedPaymentQuote ? window.selectedPaymentQuote.plan : 'Care Shield';
        let premiumStr = window.selectedPaymentQuote ? `₹${window.selectedPaymentQuote.premium}` : '₹12,450';
        let premiumNum = parseInt(premiumStr.replace(/[^0-9]/g, '')) || 12450;
        let commission = premiumNum * 0.20;
        
        // Auto-calculated dates for demo
        let d = new Date();
        let startD = new Date(d.getTime() - 2 * 86400000); // 2 days ago
        let startDStr = startD.toLocaleDateString('en-GB');
        let endDStr = new Date(startD.getTime() + 365 * 86400000).toLocaleDateString('en-GB');
        
        let fDays = FREELOOK_DAYS[mKey] || 15;
        let fExpiryD = new Date(startD.getTime() + fDays * 86400000);
        let fExpiryDStr = fExpiryD.toLocaleDateString('en-GB');
        
        let daysElapsed = Math.floor((d.getTime() - startD.getTime()) / 86400000);
        let daysLeft = fDays - daysElapsed;
        if (daysLeft < 0) daysLeft = 0;
        
        let progressPct = (daysElapsed / fDays) * 100;
        if (progressPct > 100) progressPct = 100;
        
        let misBadgeHtml = `<span style="background: #EEF0FD; color: #473391; font-size: 9px; padding: 2px 6px; border-radius: 4px; margin-left: 8px; font-weight: 700;">MIS</span>`;
        
        let policySummaryHtml = `
            <div style="background: white; border: 1px solid #E8E4F3; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <div style="font-size: 14px; font-weight: 700; color: #111827;">Policy Summary</div>
                    <div style="background: #E0F5EC; color: #1A6E45; font-size: 11px; font-weight: 700; border-radius: 20px; padding: 4px 12px;">Policy Issued</div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #A09AB8; margin-bottom: 4px;">Policy Number ${misBadgeHtml}</div>
                        <div style="font-size: 13px; font-weight: 600; color: #111827;">POL-${Math.floor(Math.random()*100000000)}</div>
                    </div>
                    <div>
                        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #A09AB8; margin-bottom: 4px;">Premium Paid ${misBadgeHtml}</div>
                        <div style="font-size: 13px; font-weight: 600; color: #111827;">${premiumStr}</div>
                    </div>
                    <div>
                        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #A09AB8; margin-bottom: 4px;">Insurer Name ${misBadgeHtml}</div>
                        <div style="font-size: 13px; font-weight: 600; color: #111827;">${insurer}</div>
                    </div>
                    <div>
                        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #A09AB8; margin-bottom: 4px;">Plan Name ${misBadgeHtml}</div>
                        <div style="font-size: 13px; font-weight: 600; color: #111827;">${planName}</div>
                    </div>
                    <div>
                        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #A09AB8; margin-bottom: 4px;">Policy Start Date ${misBadgeHtml}</div>
                        <div style="font-size: 13px; font-weight: 600; color: #111827;">${startDStr}</div>
                    </div>
                    <div>
                        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #A09AB8; margin-bottom: 4px;">Policy End Date ${misBadgeHtml}</div>
                        <div style="font-size: 13px; font-weight: 600; color: #111827;">${endDStr}</div>
                    </div>
                    <div>
                        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #A09AB8; margin-bottom: 4px;">Freelook Expiry Date ${misBadgeHtml}</div>
                        <div style="font-size: 13px; font-weight: 600; color: #111827;">${fExpiryDStr}</div>
                    </div>
                    <div>
                        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #A09AB8; margin-bottom: 4px;">Commission Expected ${misBadgeHtml}</div>
                        <div style="font-size: 13px; font-weight: 700; color: #1A7A4A;">₹${commission.toLocaleString('en-IN')} (20%)</div>
                    </div>
                </div>
            </div>
        `;
        
        let freelookState = currentLead.freelookState || 'under_freelook';
        let trackerHtml = '';
        
        let isManager = (window.CURRENT_ROLE === 'MANAGER' || (document.getElementById('role-select') && document.getElementById('role-select').value === 'Manager'));
        
        if (freelookState === 'under_freelook') {
            trackerHtml = `
                <div style="background: white; border: 1px solid #E8E4F3; border-radius: 12px; padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <div style="font-size: 14px; font-weight: 700; color: #111827;">Freelook Period</div>
                        <div style="background: #FFF4E0; color: #A06000; font-size: 11px; font-weight: 700; border-radius: 20px; padding: 4px 12px;">Under Freelook</div>
                    </div>
                    <div style="font-size: 14px; font-weight: 700; color: #A06000; margin-bottom: 8px;">Freelook ends in ${daysLeft} days</div>
                    <div style="font-size: 12px; color: #6B6880; margin-bottom: 12px;">Policy Start Date: ${startDStr} · Freelook Period: ${fDays} days · Expires: ${fExpiryDStr}</div>
                    <div style="width: 100%; height: 4px; background: #F3F4F6; border-radius: 2px; margin-bottom: 12px; overflow: hidden;">
                        <div style="height: 100%; width: ${progressPct}%; background: #A06000; border-radius: 2px;"></div>
                    </div>
                    <div style="font-size: 12px; color: #A09AB8; margin-bottom: 20px;">Customer can cancel this policy and receive a full refund before ${fExpiryDStr}.</div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <button style="border: 1.5px solid #B03030; color: #B03030; background: white; border-radius: 8px; padding: 8px 16px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="openCancellationModal()">Request Cancellation</button>
                        
                        <!-- SIMULATION BUTTON (Not in design, for demo) -->
                        <div style="font-size: 10px; color: #A09AB8; cursor: pointer; text-decoration: underline;" onclick="simulateFreelookExpiry()">[Simulate Expiry]</div>
                    </div>
                </div>
            `;
        } else if (freelookState === 'under_verification') {
            trackerHtml = `
                <div style="background: white; border: 1px solid #E8E4F3; border-radius: 12px; padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <div style="font-size: 14px; font-weight: 700; color: #111827;">Freelook Period</div>
                        <div style="background: #EBF5FF; color: #2B5FC7; font-size: 11px; font-weight: 700; border-radius: 20px; padding: 4px 12px;">Under Verification</div>
                    </div>
                    <div style="font-size: 13px; font-weight: 600; color: #2B5FC7; margin-bottom: 12px;">Freelook period has ended. Awaiting MIS confirmation from insurer.</div>
                    <div style="background: #F0EEFB; color: #473391; font-size: 11px; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
                        IBM Manager will confirm freelook completion after receiving the monthly MIS.
                    </div>
                    
                    ${isManager ? `
                        <button style="background: #1A6E45; color: white; border: none; border-radius: 8px; padding: 12px 16px; font-size: 13px; font-weight: 700; cursor: pointer; width: 100%;" onclick="confirmFreelook()">Confirm Freelook Completed</button>
                    ` : `
                        <div style="font-size: 12px; color: #A09AB8; font-style: italic;">Awaiting manager action.</div>
                    `}
                </div>
            `;
        } else if (freelookState === 'completed') {
            trackerHtml = `
                <div style="background: white; border: 1px solid #E8E4F3; border-radius: 12px; padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <div style="font-size: 14px; font-weight: 700; color: #111827;">Freelook Period</div>
                        <div style="background: #E0F5EC; color: #1A6E45; font-size: 11px; font-weight: 700; border-radius: 20px; padding: 4px 12px;">Freelook Completed</div>
                    </div>
                    <div style="font-size: 13px; font-weight: 600; color: #1A6E45; margin-bottom: 8px;">✓ Freelook period completed. Policy is confirmed.</div>
                    <div style="font-size: 12px; color: #6B6880;">Confirmed by: IBM Manager · On: ${new Date().toLocaleDateString('en-GB')} · Via MIS: PB_MIS_JULY.xlsx</div>
                </div>
            `;
        }
        
        return policySummaryHtml + trackerHtml;
    }"""
    html = html.replace(old_func, new_func)

# 2. Add Policy Cancelled logic
cancelled_func = """
    function renderPolicyCancelledStage() {
        return `
            <div style="background: white; border: 1px solid #FDECEA; border-radius: 12px; padding: 24px; text-align: center; margin-top: 24px;">
                <div style="font-size: 32px; color: #C0392B; margin-bottom: 12px;">✕</div>
                <div style="font-size: 16px; font-weight: 700; color: #C0392B; margin-bottom: 8px;">Policy Cancelled</div>
                <div style="font-size: 13px; color: #6B6880;">This policy was cancelled on customer request during the freelook period.</div>
                <div style="margin-top: 16px; padding: 12px; background: #FDECEA; border-radius: 8px; font-size: 12px; color: #B03030; display: inline-block;">
                    Reason: ${currentLead.cancellationReason || 'Not specified'}
                </div>
            </div>
        `;
    }
    
    window.openCancellationModal = function() {
        document.getElementById('cancellationModal').style.display = 'flex';
    };
    
    window.closeCancellationModal = function() {
        document.getElementById('cancellationModal').style.display = 'none';
    };
    
    window.confirmCancellation = function() {
        let reason = document.getElementById('cancel-reason').value;
        currentLead.cancellationReason = reason;
        currentLead.bucket = 'Policy Cancelled';
        currentLead.status = 'Policy Cancelled';
        currentLead.subStatus = 'Closed';
        
        let agentName = (window.CURRENT_ROLE === 'MANAGER' || (document.getElementById('role-select') && document.getElementById('role-select').value === 'Manager')) ? 'IBM Manager' : 'IBM Agent';
        currentLead.log.unshift({ dot: '#C0392B', text: `Agent Update · Policy cancellation requested · Reason: ${reason} · Lead moved to Policy Cancelled · Just now`, time: 'Just now' });
        
        closeCancellationModal();
        renderLeadDetail();
        renderLeadTable();
        renderRightPanel();
        renderStageBar();
    };
    
    window.simulateFreelookExpiry = function() {
        currentLead.freelookState = 'under_verification';
        renderLeadDetail();
    };
    
    window.confirmFreelook = function() {
        currentLead.freelookState = 'completed';
        currentLead.log.unshift({ dot: '#1A7A4A', text: `IBM Manager · Freelook period confirmed completed via MIS · Just now`, time: 'Just now' });
        renderLeadDetail();
    };
"""
if "window.confirmCancellation =" not in html:
    html = html.replace('function renderPolicyStage() {', cancelled_func + '\n    function renderPolicyStage() {')

# 3. Handle 'Policy Cancelled' in renderCenterPanel
if "else if (l.bucket === 'Policy Issued') activeContent = renderPolicyStage();" in html:
    html = html.replace("else if (l.bucket === 'Policy Issued') activeContent = renderPolicyStage();", "else if (l.bucket === 'Policy Issued') activeContent = renderPolicyStage();\n          else if (l.bucket === 'Policy Cancelled') activeContent = renderPolicyCancelledStage();")

# 4. Inject cancellation modal HTML
cancellation_modal_html = """
    <!-- Cancellation Modal -->
    <div id="cancellationModal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.4); z-index: 4000; display: none; align-items: center; justify-content: center;" onclick="if(event.target === this) closeCancellationModal()">
      <div style="width: 480px; background: white; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.16); padding: 24px;">
        <h2 style="font-size: 16px; font-weight: 700; margin: 0; color: #B03030;">Request Policy Cancellation</h2>
        <div style="font-size: 13px; color: #6B7280; margin-top: 4px; margin-bottom: 20px;">This will move the lead to Policy Cancelled stage.</div>
        
        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #A09AB8; margin-bottom: 6px;">REASON *</div>
        <select id="cancel-reason" style="width: 100%; height: 40px; border: 1.5px solid #E8E4F3; border-radius: 6px; padding: 0 12px; font-size: 13px; outline: none; margin-bottom: 16px;">
            <option>Customer Request</option>
            <option>Coverage Not Suitable</option>
            <option>Financial Reasons</option>
            <option>Found Better Plan</option>
            <option>Other</option>
        </select>
        
        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #A09AB8; margin-bottom: 6px;">NOTES (OPTIONAL)</div>
        <textarea style="width: 100%; height: 60px; border: 1.5px solid #E8E4F3; border-radius: 6px; padding: 8px 12px; font-size: 13px; outline: none; resize: none; margin-bottom: 24px; box-sizing: border-box;"></textarea>
        
        <div style="display:flex; justify-content: flex-end; gap:12px;">
           <button style="height:40px; padding: 0 20px; background:white; color:#6B7280; border:1px solid #E5E7EB; border-radius:8px; font-weight:600; cursor:pointer;" onclick="closeCancellationModal()">Cancel</button>
           <button style="height:40px; padding: 0 20px; background:#B03030; color:white; border:none; border-radius:8px; font-weight:700; cursor:pointer;" onclick="confirmCancellation()">Confirm Cancellation Request</button>
        </div>
      </div>
    </div>
"""
if "id=\"cancellationModal\"" not in html:
    html = html.replace('<!-- Bulk Upload Modal -->', cancellation_modal_html + '\n    <!-- Bulk Upload Modal -->')

with open("index.html", "w") as f:
    f.write(html)
