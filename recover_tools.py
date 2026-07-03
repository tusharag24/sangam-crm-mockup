import json

log_path = '/Users/tusharagarwal/.gemini/antigravity/brain/164ff8da-f4f4-4447-999a-1e5077cad5f4/.system_generated/logs/transcript_full.jsonl'
tool_calls = []
with open(log_path, 'r') as f:
    for line in f:
        try:
            data = json.loads(line)
            if 'tool_calls' in data:
                for tc in data['tool_calls']:
                    print("Found a tool call:", tc.get('function', {}).get('name') or tc.get('name', 'unknown'))
                    if tc.get('name') in ['multi_replace_file_content', 'replace_file_content', 'write_to_file', 'default_api:multi_replace_file_content', 'default_api:replace_file_content']:
                        tool_calls.append(tc)
        except Exception as e:
            print("Error parsing line:", e)

print(f"Found {len(tool_calls)} relevant tool calls.")
with open('recovered_tool_calls.json', 'w') as out:
    json.dump(tool_calls, out, indent=2)
