import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

new_right_panel = """
    function renderRightPanel() {
      const l = currentLead;
      const bucketConfig = STATE_MACHINE_CONFIG[l.bucket || 'New'];
      const statusKeys = Object.keys(bucketConfig.statuses);
      let statusOptionsHtml = statusKeys.map((k, i) => `<option value="${k}" ${i===0?'selected':''}>${k}</option>`).join('');
      
      let html = `
        <style>
          #detail-right select:focus, #detail-right input:focus, #detail-right textarea:focus {
            border-color: #473391 !important;
            background: white !important;
          }
        </style>
        <div style="padding: 20px;">
          
          <div style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; margin-bottom: 20px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
            <div style="background: #FAFAFA; border-bottom: 1px solid #E5E7EB; padding: 12px 16px; font-size: 13px; font-weight: 700; color: #111827; display: flex; align-items: center; justify-content: space-between;">
              <span>Update Status</span>
              <span style="font-size: 10px; font-weight: 500; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.05em;">Agent Action</span>
            </div>
            <div style="padding: 16px;">
              <div style="margin-bottom: 12px;">
                <div style="font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; margin-bottom: 6px;">Call Status *</div>
                <select id="detail-status" style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 13px; font-family: Poppins; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s; cursor: pointer;" onchange="handleDetailStatusChange()">
                  ${statusOptionsHtml}
                </select>
              </div>
              <div style="margin-bottom: 12px;">
                <div style="font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; margin-bottom: 6px;">Sub Status *</div>
                <select id="detail-substatus" style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 13px; font-family: Poppins; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s; cursor: pointer;" onchange="handleDetailSubStatusChange()">
                </select>
              </div>
              <div id="detail-fup-wrapper" style="margin-bottom: 12px; display: none; flex-direction: column;">
                <div style="font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; margin-bottom: 6px;">Follow Up Date & Time *</div>
                <input type="datetime-local" id="detail-fup" style="width: 100%; height: 38px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 13px; font-family: Poppins; background: #FAFAFA; padding: 0 10px; outline: none; transition: border-color 0.2s, background 0.2s;">
              </div>
              <div style="margin-bottom: 4px;">
                <div style="font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; margin-bottom: 6px;">Remarks</div>
                <textarea id="detail-remarks" placeholder="Add remarks..." style="width: 100%; height: 72px; border: 1.5px solid #E5E7EB; border-radius: 6px; font-size: 12px; font-family: Poppins; background: #FAFAFA; padding: 8px 10px; outline: none; resize: none; transition: border-color 0.2s, background 0.2s; box-sizing: border-box;"></textarea>
              </div>
              <button style="width: 100%; height: 42px; background: #473391; color: white; font-size: 13px; font-weight: 700; border-radius: 8px; margin-top: 16px; border: none; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'" onclick="saveDetailStatusUpdate()">Update Status</button>
            </div>
          </div>
        </div>
      `;
      document.getElementById('detail-right').innerHTML = html;
      
      handleDetailStatusChange();
    }
"""

# Regex to match the entire function `renderRightPanel()` up to `    window.completeTask = function` or `    window.handleDetailStatusChange`
pattern = re.compile(r'    function renderRightPanel\(\) \{.*?(?:document\.getElementById\(\'detail-right\'\)\.innerHTML = html;\s*handleDetailStatusChange\(\);\s*\})', re.DOTALL)

# Let's count matches
matches = pattern.findall(html)
print(f"Found {len(matches)} matches")

if len(matches) > 0:
    html = pattern.sub(new_right_panel, html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Right panel cleaned.")
