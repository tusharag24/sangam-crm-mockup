import re

with open("index.html", "r") as f:
    content = f.read()

# Replace openLead to alert any errors
old_open_lead = """    function openLead(id) {
      currentLead = LEADS.find(l => l.id === id);
      G_SECTION = null;
      G_PRODUCT_TAB = currentLead.initialProduct || 'lp';
      renderLeadDetail();
      showScreen('detail');
    }"""

new_open_lead = """    function openLead(id) {
      try {
          currentLead = LEADS.find(l => l.id === id);
          G_SECTION = null;
          G_PRODUCT_TAB = currentLead.initialProduct || 'lp';
          renderLeadDetail();
          showScreen('detail');
      } catch (e) {
          alert("ERROR in openLead: " + e.message + "\\n" + e.stack);
          console.error(e);
      }
    }"""

if old_open_lead in content:
    content = content.replace(old_open_lead, new_open_lead)
else:
    print("WARNING: old_open_lead not found!")

# Let's also wrap selectLead just in case it's used elsewhere
old_select_lead = """    function selectLead(id) {
        currentLead = leads.find(l => l.id === id);
        renderLeadDetail();
        document.querySelectorAll('.lead-item').forEach(el => el.classList.remove('active'));
        let el = document.getElementById('lead-' + id);
        if (el) el.classList.add('active');
    }"""

new_select_lead = """    function selectLead(id) {
        try {
            currentLead = leads.find(l => l.id === id);
            renderLeadDetail();
            document.querySelectorAll('.lead-item').forEach(el => el.classList.remove('active'));
            let el = document.getElementById('lead-' + id);
            if (el) el.classList.add('active');
        } catch (e) {
            alert("ERROR in selectLead: " + e.message + "\\n" + e.stack);
            console.error(e);
        }
    }"""

if old_select_lead in content:
    content = content.replace(old_select_lead, new_select_lead)

with open("index.html", "w") as f:
    f.write(content)

print("Injected try-catch alerts.")
