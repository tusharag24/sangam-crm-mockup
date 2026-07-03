import json
with open("/Users/tusharagarwal/.gemini/antigravity/brain/164ff8da-f4f4-4447-999a-1e5077cad5f4/.system_generated/logs/transcript_full.jsonl") as f:
    for line in f:
        data = json.loads(line)
        if "whatsapp circle" in line.lower() or "call/whatsapp" in line.lower():
            print(f"Found in {data.get('type')}: {str(data)[:200]}")
