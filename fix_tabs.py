import re

html = open("index.html").read()

def repl_tabs(match):
    return """
            <div style="display: flex; align-items: center; padding-left: 10px;">
              <div onclick="currentLead.activeTab='Insurance Details'; renderLeadDetail()" style="padding: 10px 20px; font-size: 13px; font-weight: 600; color: ${(!currentLead.activeTab || currentLead.activeTab === 'Insurance Details') ? '#473391' : '#9CA3AF'}; border-bottom: 2px solid ${(!currentLead.activeTab || currentLead.activeTab === 'Insurance Details') ? '#473391' : 'transparent'}; cursor: pointer;">Insurance Details</div>
              <div onclick="currentLead.activeTab='History'; renderLeadDetail()" style="padding: 10px 20px; font-size: 13px; font-weight: 600; color: ${(currentLead.activeTab === 'History') ? '#473391' : '#9CA3AF'}; border-bottom: 2px solid ${(currentLead.activeTab === 'History') ? '#473391' : 'transparent'}; cursor: pointer;">Activity History</div>
              <div onclick="currentLead.activeTab='FollowUp'; renderLeadDetail()" style="padding: 10px 20px; font-size: 13px; font-weight: 600; color: ${(currentLead.activeTab === 'FollowUp') ? '#473391' : '#9CA3AF'}; border-bottom: 2px solid ${(currentLead.activeTab === 'FollowUp') ? '#473391' : 'transparent'}; cursor: pointer;">Follow Ups</div>
              <div onclick="currentLead.activeTab='Documents'; renderLeadDetail()" style="padding: 10px 20px; font-size: 13px; font-weight: 600; color: ${(currentLead.activeTab === 'Documents') ? '#473391' : '#9CA3AF'}; border-bottom: 2px solid ${(currentLead.activeTab === 'Documents') ? '#473391' : 'transparent'}; cursor: pointer;">Documents</div>
            </div>
    """

html = re.sub(r'<div style="display: flex; align-items: center; padding-left: 10px;">.*?</div>\n            </div>', repl_tabs, html, flags=re.DOTALL)

with open("index.html", "w") as f:
    f.write(html)
