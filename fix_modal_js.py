html = open("index.html").read()
js_funcs = """
    window.openBulkUploadModal = function() {
        document.getElementById('bulkUploadModal').style.display = 'flex';
        setTimeout(() => { document.getElementById('bulkUploadModal').style.opacity = '1'; }, 10);
    };
    window.closeBulkUploadModal = function() {
        document.getElementById('bulkUploadModal').style.display = 'none';
        document.getElementById('bulkUploadModal').style.opacity = '0';
    };
"""
html = html.replace('// Init', js_funcs + '\n    // Init')
with open("index.html", "w") as f:
    f.write(html)
