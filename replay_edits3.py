import json

with open('recovered_tool_calls.json', 'r') as f:
    tool_calls = json.load(f)

with open('index.html', 'r') as f:
    lines = f.read().splitlines()

def apply_replace(lines, start_line, end_line, target, replacement):
    start_idx = max(0, start_line - 1)
    end_idx = min(len(lines), end_line)
    section_text = '\n'.join(lines[start_idx:end_idx])
    if target in section_text:
        new_section_text = section_text.replace(target, replacement, 1)
        new_lines = new_section_text.split('\n')
        return lines[:start_idx] + new_lines + lines[end_idx:]
    else:
        return lines

applied_count = 0
for tc in tool_calls:
    name = tc.get('name') or tc.get('function', {}).get('name')
    args = tc.get('args') or tc.get('arguments') or tc.get('function', {}).get('arguments')
    
    if isinstance(args, str):
        try:
            args = json.loads(args)
        except:
            pass
            
    if not isinstance(args, dict):
        continue
        
    target_file = args.get('TargetFile', '')
    if 'index.html' not in target_file:
        continue
        
    if name in ['replace_file_content', 'default_api:replace_file_content']:
        lines = apply_replace(lines, args['StartLine'], args['EndLine'], args['TargetContent'], args['ReplacementContent'])
        applied_count += 1
    elif name in ['multi_replace_file_content', 'default_api:multi_replace_file_content']:
        chunks = args.get('ReplacementChunks', [])
        chunks.sort(key=lambda x: x['StartLine'], reverse=True)
        for chunk in chunks:
            lines = apply_replace(lines, chunk['StartLine'], chunk['EndLine'], chunk['TargetContent'], chunk['ReplacementContent'])
        applied_count += 1

with open('index.html', 'w') as f:
    f.write('\n'.join(lines) + '\n')

print(f"Replayed {applied_count} edits onto index.html")
