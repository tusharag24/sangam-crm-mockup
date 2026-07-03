    window.handleDetailStatusChange = function() {
      if(!currentLead) return;
      const status = document.getElementById('detail-status').value;
      const subSelect = document.getElementById('detail-substatus');
      
      const bucketConfig = STATE_MACHINE_CONFIG[currentLead.bucket || 'New'];
      const statusConfig = bucketConfig.statuses[status];
      
      let options = statusConfig ? statusConfig.subStatuses : [];
      
      subSelect.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join('');
      
      // Auto-select if there is only one option and disable it
      if (options.length === 1) {
         subSelect.value = options[0];
         subSelect.disabled = true;
         subSelect.style.background = '#F3F4F6';
         subSelect.style.color = '#6B7280';
      } else {
         subSelect.disabled = false;
         subSelect.style.background = '#FAFAFA';
         subSelect.style.color = '#111827';
      }
      
      window.handleDetailSubStatusChange();
    };
