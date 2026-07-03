import json

with open('recovered_tool_calls.json', 'r') as f:
    tool_calls = json.load(f)

with open('old_index.html', 'r') as f:
    lines = f.read().splitlines()

# We need to replay the edits on the file.
# The `replace_file_content` and `multi_replace_file_content` use 1-based indexing for StartLine and EndLine.
# Note: Replaying line-based replacements sequentially can be tricky because line numbers shift.
# Actually, the system applies diffs by searching for the target content within the StartLine-EndLine range.
# Let's write a simple diff applier.
def apply_replace(lines, start_line, end_line, target, replacement):
    # 1-based to 0-based
    start_idx = max(0, start_line - 1)
    end_idx = min(len(lines), end_line)
    
    # Try to find the target string in the lines range
    section_text = '\n'.join(lines[start_idx:end_idx])
    if target in section_text:
        new_section_text = section_text.replace(target, replacement, 1)
        new_lines = new_section_text.split('\n')
        return lines[:start_idx] + new_lines + lines[end_idx:]
    else:
        # fuzzy match fallback?
        return lines

for tc in tool_calls:
    name = tc.get('function', {}).get('name') or tc.get('name')
    args = tc.get('function', {}).get('arguments') or tc.get('arguments')
    
    # sometimes arguments is a JSON string
    if isinstance(args, str):
        try:
            args = json.loads(args)
        except:
            continue
            
    if not isinstance(args, dict):
        continue
        
    target_file = args.get('TargetFile', '')
    if 'index.html' not in target_file:
        continue
        
    if name in ['replace_file_content', 'default_api:replace_file_content']:
        lines = apply_replace(lines, args['StartLine'], args['EndLine'], args['TargetContent'], args['ReplacementContent'])
    elif name in ['multi_replace_file_content', 'default_api:multi_replace_file_content']:
        chunks = args.get('ReplacementChunks', [])
        # Apply from bottom to top to avoid line number shifting issues for a single tool call!
        chunks.sort(key=lambda x: x['StartLine'], reverse=True)
        for chunk in chunks:
            lines = apply_replace(lines, chunk['StartLine'], chunk['EndLine'], chunk['TargetContent'], chunk['ReplacementContent'])

with open('index.html', 'w') as f:
    f.write('\n'.join(lines) + '\n')

print("Replayed edits onto index.html")
