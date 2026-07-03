import re

html = open("index.html").read()

# 1. Remove the standalone search lead input from the top right
# We want to remove the block between `        <div style="display:flex; gap:12px; align-items:center;">` and `<button style="border: 1.5px solid #473391;`
old_header_start = """        <div style="display:flex; gap:12px; align-items:center;">
          <!-- Sangam Search Bar Style -->
          <div style="display:flex; border:1px solid var(--border); border-radius:6px; overflow:hidden; background:var(--white);">
            <select style="border:none; background:#F9F9FB; padding:8px 12px; border-right:1px solid var(--border); outline:none; font-size:12px; color:var(--text-muted);">
              <option>Lead Id</option>
              <option>Name</option>
              <option>Mobile</option>
            </select>
            <div style="display:flex; align-items:center; padding-left:8px;">
              <span style="font-size:12px; color:var(--text-muted);">🔍</span>
              <input type="text" placeholder="Search" style="border:none; padding:8px; outline:none; font-size:12px;" oninput="renderLeadTable()">
            </div>
          </div>
                    <button style="border: 1.5px solid #473391;"""

new_header_start = """        <div style="display:flex; gap:12px; align-items:center;">
          <button style="border: 1.5px solid #473391;"""

html = html.replace(old_header_start, new_header_start)

# 2. Extract the filter bar, delete it from its old location, and put it below "Leads Queue"
# Wait, it's easier to just do a regex replace on the whole section from "<!-- Filters -->" to "<!-- Table -->"

old_section_regex = r'      <!-- Filters -->\n      <div class="sangam-filter-container".*?<div style="font-size:11px; font-weight:600; color:var\(--text-heading\);">Showing <span id="entry-count">0</span> entries on Page 1/1</div>\n      </div>'

new_section = """      <div style="display:flex; justify-content:space-between; margin-bottom:16px; align-items:center;">
        <div style="font-size:16px; font-weight:700;">Leads Queue</div>
        <div style="font-size:11px; font-weight:600; color:var(--text-heading);">Showing <span id="entry-count">0</span> entries on Page 1/1</div>
      </div>

      <!-- Filters -->
      <div class="sangam-filter-container" style="background:#FAFAFA; padding:16px; border-radius:8px; margin-bottom:16px;">
        <div class="sangam-filter-bar" style="display:flex; flex-wrap:wrap; gap:16px; align-items:flex-end;">
          <div class="sangam-filter-group">
            <label class="sangam-filter-label" style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px; display:block;">Stage</label>
            <select class="sangam-filter-select" style="padding:8px 12px; border:1px solid #E5E7EB; border-radius:6px; background:white; font-size:13px; min-width:120px; outline:none;">
              <option>All</option>
              <option>New</option>
              <option>Contacted</option>
              <option>Quote</option>
              <option>Payment Done</option>
              <option>Policy Issued</option>
              <option>Lost</option>
            </select>
          </div>
          <div class="sangam-filter-group">
            <label class="sangam-filter-label" style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px; display:block;">Product</label>
            <select class="sangam-filter-select" style="padding:8px 12px; border:1px solid #E5E7EB; border-radius:6px; background:white; font-size:13px; min-width:140px; outline:none;">
              <option>All</option>
              <option>Loan Protection</option>
              <option>Property Insurance</option>
              <option>Credit Life</option>
              <option>Term Plan</option>
            </select>
          </div>
          <div class="sangam-filter-group">
            <label class="sangam-filter-label" style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px; display:block;">Partner</label>
            <select class="sangam-filter-select" style="padding:8px 12px; border:1px solid #E5E7EB; border-radius:6px; background:white; font-size:13px; min-width:120px; outline:none;">
              <option>All</option>
              <option>Ambak</option>
              <option>HDFC</option>
              <option>SBI</option>
            </select>
          </div>
          <div class="sangam-filter-group">
            <label class="sangam-filter-label" style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px; display:block;">RM</label>
            <select class="sangam-filter-select" style="padding:8px 12px; border:1px solid #E5E7EB; border-radius:6px; background:white; font-size:13px; min-width:120px; outline:none;">
              <option>All</option>
              <option>Rohit M</option>
              <option>Anil K</option>
              <option>Sneha P</option>
            </select>
          </div>
          
          <div class="sangam-filter-group" style="flex:1;">
            <label class="sangam-filter-label" style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px; display:block; visibility:hidden;">Search</label>
            <div style="display:flex; align-items:center; background:white; border:1px solid #E5E7EB; border-radius:6px; padding:0 12px; height:36px; box-sizing:border-box;">
              <span style="font-size:13px; color:#9CA3AF; margin-right:8px;">🔍</span>
              <input type="text" placeholder="Search Lead Name, Phone, ID..." style="border:none; width:100%; font-size:13px; outline:none; background:transparent;">
            </div>
          </div>
          
          <div style="display:flex; align-items:flex-end; padding-bottom:1px;">
             <button class="btn btn-ghost" style="height:36px; padding:0 16px; border-radius:6px; font-size:13px; font-weight:600; border:1px solid #E5E7EB; background:white; color:#4B5563; cursor:pointer;">More Filters ≡</button>
          </div>
        </div>
      </div>"""

html = re.sub(old_section_regex, new_section, html, flags=re.DOTALL)

with open("index.html", "w") as f:
    f.write(html)
