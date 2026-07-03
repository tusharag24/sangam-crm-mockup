    function renderRightPanel() {
      const l = currentLead;
      const bucketConfig = STATE_MACHINE_CONFIG[l.bucket || 'New'];
      const statusKeys = Object.keys(bucketConfig.statuses);
      let statusOptionsHtml = statusKeys.map((k, i) => `<option value="${k}" ${i===0?'selected':''}>${k}</option>`).join('');
      
      let activeTab = l.activeTab || 'History';
      
      let html = `
        <style>
          #detail-right select:focus, #detail-right input:focus, #detail-right textarea:focus {
            border-color: #473391 !important;
            background: white !important;
          }
        </style>
        <div style="flex-shrink: 0; padding: 16px 24px; border-bottom: 2px solid #E5E7EB; background: white;">
          <div style="font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 16px;">Update Status</div>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div>
              <label style="font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 5px; display: block;">STATUS</label>
              <select id="detail-status" style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; font-family: Poppins; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;" onchange="handleDetailStatusChange()">
                ${statusOptionsHtml}
              </select>
            </div>
            <div>
              <label style="font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 5px; display: block;">SUB STATUS</label>
              <select id="detail-substatus" style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; font-family: Poppins; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;" onchange="handleDetailSubStatusChange()">
              </select>
            </div>
            <div id="detail-fup-wrapper" style="display: flex; gap: 8px;">
              <div style="flex: 1;">
                <label style="font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 5px; display: block;">FOLLOW-UP DATE <span style="color: #C0392B;">*</span></label>
                <input type="date" id="detail-fup-date" placeholder="dd/mm/yyyy" style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; font-family: Poppins; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
              </div>
              <div style="flex: 1;">
                <label style="font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 5px; display: block;">PENDING WITH <span style="color: #C0392B;">*</span></label>
                <select id="detail-pending-with" style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; font-family: Poppins; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
                  <option value="Customer" selected>Customer</option>
                  <option value="IBM Agent">IBM Agent</option>
                  <option value="PolicyBazaar">PolicyBazaar</option>
                  <option value="Insurer">Insurer</option>
                  <option value="Ambak Operations">Ambak Operations</option>
                  <option value="Finance Team">Finance Team</option>
                </select>
              </div>
            </div>
            <div>
              <label style="font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 5px; display: block;">REMARKS</label>
              <textarea id="detail-remarks" placeholder="Add remarks..." style="width: 100%; height: 72px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; font-family: Poppins; background: #FAFAFA; padding: 8px 10px; outline: none; resize: none; transition: border-color 0.2s, background 0.2s; box-sizing: border-box;"></textarea>
            </div>
            <button style="width: 100%; height: 42px; background: #473391; color: white; font-size: 13px; font-weight: 700; border-radius: 8px; margin-top: 16px; border: none; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'" onclick="saveDetailStatusUpdate()">Update Status</button>
          </div>
        </div>
        <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; background: white;">
          <div style="flex-shrink: 0; display: flex; background: white; border-bottom: 1px solid #E5E7EB; position: sticky; top: 0; z-index: 10;">
            <div style="flex: 1; text-align: center; padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; color: ${activeTab === 'History' ? '#473391' : '#9CA3AF'}; border-bottom: ${activeTab === 'History' ? '2px solid #473391' : '2px solid transparent'};" onclick="currentLead.activeTab='History'; renderLeadDetail();">Activity History</div>
            <div style="flex: 1; text-align: center; padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; color: ${activeTab === 'FollowUp' ? '#473391' : '#9CA3AF'}; border-bottom: ${activeTab === 'FollowUp' ? '2px solid #473391' : '2px solid transparent'};" onclick="currentLead.activeTab='FollowUp'; renderLeadDetail();">Follow Up</div>
            <div style="flex: 1; text-align: center; padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; color: ${activeTab === 'Documents' ? '#473391' : '#9CA3AF'}; border-bottom: ${activeTab === 'Documents' ? '2px solid #473391' : '2px solid transparent'};" onclick="currentLead.activeTab='Documents'; renderLeadDetail();">Documents</div>
          </div>
          <div style="flex: 1; overflow-y: auto; padding: 12px 20px; background: #FAFAFA;">
            ${getRightPanelTabContent(activeTab)}
          </div>
        </div>
      `;
      document.getElementById('detail-right').innerHTML = html;
      
      handleDetailStatusChange();
    }
    
    window.completeTask