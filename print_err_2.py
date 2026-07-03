import re
html = open('index.html').read()
match = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
if match:
    lines = match.group(1).split('\n')
    print("---")
    for i in range(1090, 1110):
        print(f"{i+1}: {lines[i]}")
    print("---")
