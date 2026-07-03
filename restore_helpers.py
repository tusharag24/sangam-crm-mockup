import re

def extract_injected_js(filepath, var_name):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    # Looking for var_name = """ ... """
    pattern = rf'{var_name}\s*=\s*\"\"\"(.*?)\"\"\"'
    match = re.search(pattern, content, re.DOTALL)
    if match:
        return match.group(1)
    return ""

js_to_inject = ""

# 1. implement_new_bucket.py (state_js)
js_to_inject += extract_injected_js('/Users/tusharagarwal/.gemini/antigravity/brain/164ff8da-f4f4-4447-999a-1e5077cad5f4/scratch/implement_new_bucket.py', 'state_js') + "\n"

# 2. implement_contacted.py (helpers_js)
js_to_inject += extract_injected_js('/Users/tusharagarwal/.gemini/antigravity/brain/164ff8da-f4f4-4447-999a-1e5077cad5f4/scratch/implement_contacted.py', 'helpers_js') + "\n"

# 3. patch_payment_share.py (payment_popup_js)
js_to_inject += extract_injected_js('/Users/tusharagarwal/.gemini/antigravity/brain/164ff8da-f4f4-4447-999a-1e5077cad5f4/scratch/patch_payment_share.py', 'payment_popup_js') + "\n"

# 4. implement_quote.py (helpers_js)
js_to_inject += extract_injected_js('/Users/tusharagarwal/.gemini/antigravity/brain/164ff8da-f4f4-4447-999a-1e5077cad5f4/scratch/implement_quote.py', 'helpers_js') + "\n"

# 5. implement_payment_done.py (helpers_js)
js_to_inject += extract_injected_js('/Users/tusharagarwal/.gemini/antigravity/brain/164ff8da-f4f4-4447-999a-1e5077cad5f4/scratch/implement_payment_done.py', 'helpers_js') + "\n"

# 6. implement_payment_flow.py (js_handlers)
js_to_inject += extract_injected_js('/Users/tusharagarwal/.gemini/antigravity/brain/164ff8da-f4f4-4447-999a-1e5077cad5f4/scratch/implement_payment_flow.py', 'js_handlers') + "\n"

# 7. add_missing_fns.py (functions_to_add)
js_to_inject += extract_injected_js('/Users/tusharagarwal/.gemini/antigravity/brain/164ff8da-f4f4-4447-999a-1e5077cad5f4/scratch/add_missing_fns.py', 'functions_to_add') + "\n"

# 8. update_ui.py (popup_js)
js_to_inject += extract_injected_js('/Users/tusharagarwal/.gemini/antigravity/brain/164ff8da-f4f4-4447-999a-1e5077cad5f4/scratch/update_ui.py', 'popup_js') + "\n"

with open('/Users/tusharagarwal/.gemini/antigravity/scratch/sangam-crm/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace // Init with the aggregated JS
if "// Init" in html:
    html = html.replace('// Init', js_to_inject + '\n// Init')
    with open('/Users/tusharagarwal/.gemini/antigravity/scratch/sangam-crm/index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Injected successfully.")
else:
    print("// Init not found!")
