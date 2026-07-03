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
