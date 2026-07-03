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
