import re

with open("index.html", "r") as f:
    content = f.read()

# 1. We need to find renderCenterPanel and fix it.
def replace_renderCenterPanel(content):
    start_str = "function renderCenterPanel() {"
    start_idx = content.find(start_str)
    if start_idx == -1: return content
    
    # We want to replace the hardcoded stageHtml with a call to renderStageBar
    old_stageHtml_code = """      let stageHtml = stages.map((s, idx) => {
        let isActive = idx === currentIdx;
        let isCompleted = idx < currentIdx;
        let bg = 'white'; let text = '#9CA3AF'; let border = '1px solid #E5E7EB';
        if(isActive) { bg = '#473391'; text = 'white'; border = '1px solid #473391'; }
        else if (isCompleted) { bg = '#F0EEFB'; text = '#473391'; border = '1px solid #F0EEFB'; }
        let chevron = `<div style="background: ${bg}; color: ${text}; border: ${border}; border-radius: 4px; padding: 6px 14px; font-size: 12px; font-weight: 600;">${s}</div>`;
        let arrow = idx < stages.length - 1 ? `<div style="color: #D1D5DB; margin: 0 8px; font-weight: 700;">></div>` : '';
        return chevron + arrow;
      }).join('');"""
      
    if old_stageHtml_code in content:
        content = content.replace(old_stageHtml_code, "")
        
    old_header = """          <div style="background: white; border-bottom: 1px solid #E5E7EB; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
            <div style="display: flex; align-items: center;">
              ${stageHtml}
            </div>"""
            
    new_header = """          <div style="background: white; border-bottom: 1px solid #E5E7EB; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
            <div style="display: flex; align-items: center; width: 100%;">
              <div id="stage-bar-container" style="flex: 1;"></div>
            </div>"""
            
    if old_header in content:
        content = content.replace(old_header, new_header)

    # 2. Add renderStageBar() at the end of renderCenterPanel
    # Find the end of renderCenterPanel
    renderCenterPanel_end = """      document.getElementById('detail-center').innerHTML = html;

    }"""
    
    new_renderCenterPanel_end = """      document.getElementById('detail-center').innerHTML = html;
      if (activeTab === 'Insurance Details') {
          if (typeof renderStageBar === 'function') {
              renderStageBar();
          }
      }
    }"""
    
    if renderCenterPanel_end in content:
        content = content.replace(renderCenterPanel_end, new_renderCenterPanel_end)
        
    return content

new_content = replace_renderCenterPanel(content)
with open("index.html", "w") as f:
    f.write(new_content)
    
print("Done")
