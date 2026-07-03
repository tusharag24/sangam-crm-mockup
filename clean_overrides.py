html = open("index.html").read()

def extract_window_function(html_content, func_name):
    # Find exact matching window.func_name = function() { ... } 
    # to delete the old override
    
    # We know the old one has NO parameters (or we just find the second one)
    import re
    # Find all occurrences of window.handleGenerateQuoteFromNew
    matches = [m.start() for m in re.finditer(r'window\.handleGenerateQuoteFromNew\s*=', html_content)]
    
    if len(matches) > 1:
        # We assume the first one is the good one we just patched (with parameters)
        # and the second one is the old empty one that is overriding it.
        start_idx = matches[1]
        brace_count = 0
        in_string = False
        string_char = ''
        start_brace = html_content.find("{", start_idx)
        
        for i in range(start_brace, len(html_content)):
            char = html_content[i]
            if char in ["'", '"', "`"]:
                if i > 0 and html_content[i-1] == '\\': pass
                elif not in_string:
                    in_string = True; string_char = char
                elif in_string and string_char == char:
                    in_string = False
            if not in_string:
                if char == '{': brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        return start_idx, i + 1
    return -1, -1

s, e = extract_window_function(html, "handleGenerateQuoteFromNew")
if s != -1:
    old_func = html[s:e]
    html = html.replace(old_func, "")
    print("Removed duplicate handleGenerateQuoteFromNew")

with open("index.html", "w") as f:
    f.write(html)
