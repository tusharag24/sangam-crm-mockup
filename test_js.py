import esprima
import re

html = open('index.html').read()
match = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
if match:
    code = match.group(1)
    try:
        esprima.parseScript(code)
        print("Syntax is OK")
    except Exception as e:
        print("Syntax error:", e)
