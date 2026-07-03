html = open("index.html").read()

def extract_function(html_content, func_name):
    start_idx = html_content.find(f"function {func_name}(")
    if start_idx == -1: return -1, -1
    
    brace_count = 0
    in_string = False
    string_char = ''
    start_brace = html_content.find("{", start_idx)
    
    for i in range(start_brace, len(html_content)):
        char = html_content[i]
        
        if char in ["'", '"', "`"]:
            if i > 0 and html_content[i-1] == '\\':
                pass
            elif not in_string:
                in_string = True
                string_char = char
            elif in_string and string_char == char:
                in_string = False
                
        if not in_string:
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    return start_idx, i + 1
    return -1, -1

s, e = extract_function(html, "renderPolicyStage")
if s != -1:
    print(html[s:e])
else:
    print("Not found")
