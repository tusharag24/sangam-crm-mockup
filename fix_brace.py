with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace the specific extra } right after renderCenterPanel
old_str = """      document.getElementById('detail-center').innerHTML = html;
    }

    }

    function renderOutreachStage() {"""

new_str = """      document.getElementById('detail-center').innerHTML = html;
    }

    function renderOutreachStage() {"""

if old_str in html:
    html = html.replace(old_str, new_str)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Fixed extra brace.")
else:
    print("Could not find the extra brace string.")
