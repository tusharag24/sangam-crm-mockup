import json

lines = []
with open("/Users/tusharagarwal/.gemini/antigravity/brain/164ff8da-f4f4-4447-999a-1e5077cad5f4/.system_generated/logs/transcript_full.jsonl") as f:
    for line in f:
        data = json.loads(line)
        if data["type"] == "USER_INPUT":
            lines.append(data["content"])

for i, content in enumerate(lines):
    if "whatsapp circles" in content.lower() or "call/whatsapp" in content.lower():
        print(f"--- PROMPT {i} ---")
        print(content)
