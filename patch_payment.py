import re

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
        
        # Handle strings to avoid counting braces inside strings
        if char in ["'", '"', "`"]:
            if i > 0 and html_content[i-1] == '\\':
                pass # escaped
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

start, end = extract_function(html, "renderPaymentStage")
if start != -1:
    old_func = html[start:end]
    new_func = """function renderPaymentStage() {
        let product = window.activeNewBucketTab || 'Loan Protection';
        let insurer = window.selectedPaymentQuote ? window.selectedPaymentQuote.insurer : 'CARE Health';
        let mKey = window.getMilestoneKey(product, insurer);
        let config = MILESTONE_CONFIG[mKey];
        let milestones = config.milestones;
        
        // Find active milestone
        let activeMilestoneId = currentLead.paymentMilestone || milestones[0].id;
        let activeIdx = milestones.findIndex(m => m.id === activeMilestoneId);
        if (activeIdx === -1) activeIdx = 0;
        
        let allCompleted = activeIdx >= milestones.length;
        if(currentLead.paymentMilestone === 'all_completed') {
             allCompleted = true;
             activeIdx = milestones.length;
        }
        
        let activeMilestone = allCompleted ? null : milestones[activeIdx];
        
        // Build Track HTML
        let trackHtml = '<div style="display: flex; justify-content: space-between; align-items: flex-start; position: relative; margin: 24px 0 10px 0;">';
        let lineHtml = '<div style="position: absolute; top: 16px; left: 20px; right: 20px; height: 2px; background: #E5E7EB; z-index: 1;"></div>';
        let nodesHtml = '';
        
        milestones.forEach((m, idx) => {
            let isDone = idx < activeIdx;
            let isActive = idx === activeIdx && !allCompleted;
            let isPending = idx > activeIdx;
            
            let color = isDone ? '#1A7A4A' : (isActive ? '#473391' : '#A09AB8');
            let bg = isDone ? '#1A7A4A' : (isActive ? '#473391' : '#F9FAFB');
            let fg = isDone ? 'white' : (isActive ? 'white' : '#A09AB8');
            let borderColor = isActive ? '#473391' : (isDone ? '#1A7A4A' : '#E5E7EB');
            let content = isDone ? '✓' : (idx + 1);
            let fontWeight = isActive ? '700' : (isDone ? '600' : '400');
            
            nodesHtml += `
                <div style="position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; width: 60px;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: ${bg}; border: 2px solid ${borderColor}; color: ${fg}; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin-bottom: 8px;">${content}</div>
                    <div style="font-size: 11px; font-weight: ${fontWeight}; color: ${color}; text-align: center; line-height: 1.2; width: 80px;">${m.label}</div>
                    ${isDone ? '<div style="font-size: 10px; color: #1A7A4A; margin-top: 4px;">Today</div>' : ''}
                </div>
            `;
        });
        
        let fillWidth = milestones.length > 1 ? (activeIdx / (milestones.length - 1)) * 100 : 100;
        if(fillWidth > 100) fillWidth = 100;
        lineHtml += `<div style="position: absolute; top: 16px; left: 20px; width: calc(${fillWidth}% - 40px); height: 2px; background: #1A7A4A; z-index: 1; transition: width 0.3s;"></div>`;
        
        trackHtml += lineHtml + nodesHtml + '</div>';
        
        let instHtml = '';
        if (allCompleted) {
            instHtml = `
                <div style="background: white; border: 1px solid #E8E4F3; border-radius: 10px; padding: 18px; margin-top: 16px;">
                    <div style="color: #A09AB8; font-size: 20px; margin-bottom: 8px;">⏳</div>
                    <div style="font-size: 13px; font-weight: 700; color: #2D2D4E; margin-bottom: 8px;">Awaiting Policy Copy Confirmation</div>
                    <div style="font-size: 12px; color: #6B6880; line-height: 1.5;">Policy copy confirmation happens automatically when the IBM Manager uploads the daily MIS in the MIS & Payouts section. Once confirmed, this lead will move to Policy Issued.</div>
                    <div style="font-size: 11px; color: #473391; background: #F0EEFB; border-radius: 6px; padding: 8px 12px; margin-top: 12px;">PB MIS is uploaded daily · CARE & TATA MIS is uploaded monthly</div>
                    <div style="margin-top: 12px;"><a href="#" style="font-size: 12px; color: #473391; text-decoration: underline;">View MIS & Payouts →</a></div>
                </div>
            `;
        } else {
            let descriptions = {
                'proposal_form': 'CARE Health requires the customer to fill a proposal/declaration form. Share the form link with the customer.',
                'tele_pd': 'TATA AIG will call the customer for a telephonic personal discussion. Inform the customer to expect a call.',
                'kyc': 'Customer needs to complete KYC on the insurer portal. Follow up to confirm completion.',
                'documents': 'Collect Aadhaar, PAN, and income proof from the customer and submit to the insurer.',
                'medical': 'Medical test has been scheduled. Remind the customer to attend.',
                'policy_decision': 'Insurer has reviewed the application. See decision below.'
            };
            
            let desc = descriptions[activeMilestone.id] || '';
            let actionHtml = '';
            
            if (activeMilestone.isDecision) {
                 if (!currentLead.paymentMilestoneState || currentLead.paymentMilestoneState === 'pending') {
                    actionHtml = `
                        <div style="display: flex; gap: 8px; margin-top: 16px; justify-content: space-between;">
                            <div style="flex: 1; background: #E0F5EC; border: 1.5px solid #1A6E45; color: #1A6E45; border-radius: 20px; padding: 8px 10px; font-size: 12px; font-weight: 700; cursor: pointer; text-align: center; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" onclick="selectPolicyDecision('Approved')">Approved</div>
                            <div style="flex: 1; background: #FFF4E0; border: 1.5px solid #A06000; color: #A06000; border-radius: 20px; padding: 8px 10px; font-size: 12px; font-weight: 700; cursor: pointer; text-align: center; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" onclick="selectPolicyDecision('Counter Offer')">Counter Offer</div>
                            <div style="flex: 1; background: #FDECEA; border: 1.5px solid #B03030; color: #B03030; border-radius: 20px; padding: 8px 10px; font-size: 12px; font-weight: 700; cursor: pointer; text-align: center; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" onclick="selectPolicyDecision('Rejected')">Rejected / Cancelled</div>
                        </div>
                    `;
                 } else if (currentLead.paymentMilestoneState === 'counter-offer') {
                    actionHtml = `
                        <div style="margin-top: 16px; background: white; padding: 12px; border-radius: 8px; border: 1px solid #E8E4F3;">
                            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #A09AB8; margin-bottom: 4px;">REVISED PREMIUM AMOUNT *</div>
                            <input type="number" id="counter-premium" placeholder="₹ New premium amount" style="width: 100%; height: 36px; border: 1.5px solid #E8E4F3; border-radius: 6px; padding: 0 10px; font-size: 12px; outline: none; margin-bottom: 12px; box-sizing: border-box;">
                            
                            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #A09AB8; margin-bottom: 4px;">CHANGES DETAILS</div>
                            <textarea placeholder="Describe what changed (coverage, terms, conditions...)" style="width: 100%; height: 56px; border: 1.5px solid #E8E4F3; border-radius: 6px; padding: 8px 10px; font-size: 12px; outline: none; resize: none; margin-bottom: 12px; box-sizing: border-box;"></textarea>
                            
                            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #A09AB8; margin-bottom: 4px;">NEW PAYMENT LINK (if applicable)</div>
                            <input type="text" placeholder="Paste new payment link if insurer provided one" style="width: 100%; height: 36px; border: 1.5px solid #E8E4F3; border-radius: 6px; padding: 0 10px; font-size: 12px; outline: none; margin-bottom: 16px; box-sizing: border-box;">
                            
                            <button style="width: 100%; height: 40px; background: #856404; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;" onclick="saveCounterOffer()">Save Counter Offer</button>
                        </div>
                    `;
                 } else if (currentLead.paymentMilestoneState === 'counter-offer-saved') {
                    actionHtml = `
                        <div style="margin-top: 16px; display: flex; gap: 10px;">
                            <button style="flex: 1; height: 40px; background: #E0F5EC; color: #1A6E45; border: 1.5px solid #1A6E45; border-radius: 20px; font-size: 12px; font-weight: 700; cursor: pointer;" onclick="customerResponseToCounterOffer(true)">Customer Accepted</button>
                            <button style="flex: 1; height: 40px; background: #FDECEA; color: #B03030; border: 1.5px solid #B03030; border-radius: 20px; font-size: 12px; font-weight: 700; cursor: pointer;" onclick="customerResponseToCounterOffer(false)">Customer Rejected</button>
                        </div>
                    `;
                 }
            } else if (activeMilestone.completable) {
                 actionHtml = `<button style="width: 100%; height: 40px; background: #473391; color: white; border-radius: 8px; font-size: 13px; font-weight: 700; margin-top: 12px; border: none; cursor: pointer;" onclick="advancePaymentMilestone()">${activeMilestone.actionButton}</button>`;
            }
            
            instHtml = `
                <div style="background: #F0EEFB; border: 1px solid #C5C0F5; border-radius: 8px; padding: 14px 16px; margin-top: 20px;">
                    <div style="font-size: 13px; font-weight: 700; color: #473391; margin-bottom: 4px;">${activeMilestone.label}</div>
                    <div style="font-size: 12px; color: #473391; line-height: 1.5;">${desc}</div>
                    ${actionHtml}
                </div>
            `;
        }
        
        let sectionHtml = `
            <div style="background: white; border: 1px solid #E8E4F3; border-radius: 12px; padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <div style="font-size: 14px; font-weight: 700; color: #111827;">Processing Milestones</div>
                        <div style="font-size: 11px; color: #A09AB8; margin-top: 2px;">${config.label}</div>
                    </div>
                    <div style="background: #FFF8E1; color: #856404; font-size: 11px; font-weight: 700; border-radius: 20px; padding: 4px 12px;">Payment Done</div>
                </div>
                ${trackHtml}
                ${instHtml}
            </div>
        `;
        
        return sectionHtml;
    }"""
    html = html.replace(old_func, new_func)

# And add action handlers for policy decision
action_handlers = """
    window.advancePaymentMilestone = function() {
        let product = window.activeNewBucketTab || 'Loan Protection';
        let insurer = window.selectedPaymentQuote ? window.selectedPaymentQuote.insurer : 'CARE Health';
        let mKey = window.getMilestoneKey(product, insurer);
        let config = MILESTONE_CONFIG[mKey];
        
        let currentIndex = config.milestones.findIndex(m => m.id === currentLead.paymentMilestone);
        if (currentIndex === -1) currentIndex = 0;
        
        let currentM = config.milestones[currentIndex];
        currentLead.log.unshift({ dot: '#473391', text: `Agent Update · ${currentM.label} marked as complete · Just now`, time: 'Just now' });
        
        if (currentIndex < config.milestones.length - 1) {
            currentLead.paymentMilestone = config.milestones[currentIndex + 1].id;
        } else {
            currentLead.paymentMilestone = 'all_completed';
        }
        renderLeadDetail();
    };
    
    window.selectPolicyDecision = function(decision) {
        if (decision === 'Approved') {
            currentLead.log.unshift({ dot: '#473391', text: `Agent Update · Policy decision: Approved · Just now`, time: 'Just now' });
            currentLead.paymentMilestoneState = null;
            window.advancePaymentMilestone();
        } else if (decision === 'Counter Offer') {
            currentLead.paymentMilestoneState = 'counter-offer';
            renderLeadDetail();
        } else if (decision === 'Rejected') {
            window.openLostModal('Underwriting Related', 'Insurer Rejected');
        }
    };
    
    window.saveCounterOffer = function() {
        let amt = document.getElementById('counter-premium').value || '';
        currentLead.log.unshift({ dot: '#473391', text: `Agent Update · Counter offer received · Revised premium: ₹${amt} · Just now`, time: 'Just now' });
        currentLead.paymentMilestoneState = 'counter-offer-saved';
        renderLeadDetail();
    };
    
    window.customerResponseToCounterOffer = function(accepted) {
        if (accepted) {
            currentLead.log.unshift({ dot: '#473391', text: `Agent Update · Customer accepted counter offer · Just now`, time: 'Just now' });
            currentLead.paymentMilestoneState = null;
            window.advancePaymentMilestone();
        } else {
            window.openLostModal('Underwriting Related', 'Counter Offer Rejected');
        }
    };
"""
# insert before function renderPaymentStage
if "window.selectPolicyDecision =" not in html:
    html = html.replace('function renderPaymentStage() {', action_handlers + '\n    function renderPaymentStage() {')

with open("index.html", "w") as f:
    f.write(html)
