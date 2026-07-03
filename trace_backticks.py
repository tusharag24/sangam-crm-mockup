import re

content = open('/Users/tusharagarwal/.gemini/antigravity/scratch/sangam-crm/index.html').read()
m = re.search(r'<script[^>]*>(.*?)</script>', content, re.DOTALL)
js = m.group(1)

in_block_comment = False
in_str_single = False
in_str_double = False
depth = 0

chars = list(js)
n = len(chars)
line_num = 1
opens = []  # stack of (depth, line_num) for backtick opens

i = 0
while i < n:
    c = chars[i]
    
    if c == '\n':
        line_num += 1
        i += 1
        continue
    
    if in_block_comment:
        if c == '*' and i+1 < n and chars[i+1] == '/':
            in_block_comment = False
            i += 2
        else:
            i += 1
        continue
    
    if in_str_single:
        if c == '\\':
            i += 2
        elif c == "'":
            in_str_single = False
            i += 1
        else:
            i += 1
        continue
    
    if in_str_double:
        if c == '\\':
            i += 2
        elif c == '"':
            in_str_double = False
            i += 1
        else:
            i += 1
        continue
    
    if c == '/' and i+1 < n:
        if chars[i+1] == '/':
            while i < n and chars[i] != '\n':
                i += 1
            continue
        elif chars[i+1] == '*':
            in_block_comment = True
            i += 2
            continue
    
    if c == "'":
        in_str_single = True
        i += 1
        continue
    
    if c == '"':
        in_str_double = True
        i += 1
        continue
    
    if c == '`':
        if opens and opens[-1][0] == depth:
            # closing
            old = opens.pop()
            depth -= 1
        else:
            # opening
            depth += 1
            opens.append((depth, line_num))
        i += 1
        continue
    
    i += 1

print(f'Final depth: {depth}')
print(f'Unclosed template literals: {len(opens)}')
for d, ln in opens:
    lines_list = js.split('\n')
    print(f'  Opened at line {ln}: {lines_list[ln-1].strip()[:100]}')
