with open('diff.patch', 'r', encoding='utf-8') as f:
    lines = f.readlines()

deleted_lines = []
in_deleted_block = False

# We want the last major chunk of deleted lines
for line in reversed(lines):
    if line.startswith('-') and not line.startswith('---'):
        deleted_lines.append(line[1:]) # remove the '-'
    elif line.startswith('@@'):
        if len(deleted_lines) > 500: # We found the massive deletion block!
            break
        else:
            deleted_lines = [] # Reset if it wasn't the big one
    elif line.startswith(' '):
        if len(deleted_lines) > 0:
            deleted_lines.append(line[1:])

deleted_lines.reverse()

with open('recovered.js', 'w', encoding='utf-8') as f:
    f.writelines(deleted_lines)
