import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Fix handlePolicyDecision
old_policy = """    window.handlePolicyDecision = function(decision) {
        if (decision === 'Approved') {
            currentLead.log.unshift({dot:'#10B981', text:`Policy decision: Approved`, time:'Just now', user: window.IBM_ROLE === 'Manager' ? 'IBM Manager' : 'IBM Agent'});
            currentLead.status = 'Underwriting'; currentLead.subStatus = 'Approved';
            renderLeadDetail();
        } else if (decision === 'Counter Offer') {
            currentLead.showCounterOfferForm = true;
            renderLeadDetail();
        } else if (decision === 'Rejected') {
            document.getElementById('lost-reason').value = 'Insurer Rejected';
            toggleModal('mark-lost-modal', true);
        }
    };"""

new_policy = """    window.handlePolicyDecision = function(decision) {
        window.paymentDoneFormData = window.paymentDoneFormData || {};
        window.paymentDoneFormData.decision = decision;
        
        if (decision === 'Approved') {
            currentLead.log.unshift({dot:'#10B981', text:`Policy decision: Approved`, time:'Just now', user: window.IBM_ROLE === 'Manager' ? 'IBM Manager' : 'IBM Agent'});
            currentLead.status = 'Underwriting'; currentLead.subStatus = 'Approved';
            renderLeadDetail();
        } else if (decision === 'Counter Offer') {
            currentLead.showCounterOfferForm = true;
            renderLeadDetail();
        } else if (decision === 'Rejected') {
            document.getElementById('lost-reason').value = 'Insurer Rejected';
            toggleModal('mark-lost-modal', true);
        }
    };"""

html = html.replace(old_policy, new_policy)

# Fix saveCounterOffer
old_save = """    window.saveCounterOffer = function() {
        let amt = document.getElementById('co-amount').value;
        currentLead.log.unshift({dot:'#F59E0B', text:`Counter offer received · Revised premium: ₹${amt}`, time:'Just now', user: window.IBM_ROLE === 'Manager' ? 'IBM Manager' : 'IBM Agent'});
        currentLead.showCounterOfferForm = false;
        currentLead.status = 'Underwriting'; currentLead.subStatus = 'Counter Offer';
        renderLeadDetail();
    };"""

new_save = """    window.saveCounterOffer = function() {
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
    };"""

html = html.replace(old_save, new_save)

# Fix handleCustomerDecision
old_cust = """    window.handleCustomerDecision = function(accepted) {
        if (accepted) {
            currentLead.log.unshift({dot:'#10B981', text:`Customer accepted counter offer`, time:'Just now', user: window.IBM_ROLE === 'Manager' ? 'IBM Manager' : 'IBM Agent'});
            currentLead.status = 'Underwriting'; currentLead.subStatus = 'Approved'; // Advances to Policy Copy Upload
            renderLeadDetail();
        } else {
            document.getElementById('lost-reason').value = 'Counter Offer Rejected';
            toggleModal('mark-lost-modal', true);
        }
    };"""

new_cust = """    window.handleCustomerDecision = function(accepted) {
        if (accepted) {
            currentLead.log.unshift({dot:'#10B981', text:`Customer accepted counter offer`, time:'Just now', user: window.IBM_ROLE === 'Manager' ? 'IBM Manager' : 'IBM Agent'});
            currentLead.status = 'Policy Copy Upload'; currentLead.subStatus = ''; // Advances to Policy Copy Upload
            currentLead.counterOfferStatus = false;
            renderLeadDetail();
        } else {
            document.getElementById('lost-reason').value = 'Counter Offer Rejected';
            toggleModal('mark-lost-modal', true);
        }
    };"""

html = html.replace(old_cust, new_cust)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
