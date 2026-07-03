import re

html = open("index.html").read()

# Split by "function renderContactedStage(isReadOnly = false) {"
parts = html.split("    function renderContactedStage(isReadOnly = false) {")

if len(parts) > 2:
    # There are duplicates!
    # The first part is everything before the FIRST occurrence
    # The second part is the body of the FIRST occurrence up to the SECOND occurrence
    # The third part is the body of the SECOND occurrence
    
    # Let's find the end of the second occurrence. It ends when we see `  </script>` or another `function`.
    # Wait, the old renderContactedStage was near the end of the file.
    
    body2 = parts[2]
    # We want to delete the whole function body of parts[2]. 
    # It probably ends right before `  </script>`.
    # Let's just find `  </script>` in body2 and keep it.
    end_index = body2.rfind("  </script>")
    if end_index != -1:
        rest_of_file = body2[end_index:]
        
        # Reconstruct html
        new_html = parts[0] + "    function renderContactedStage(isReadOnly = false) {" + parts[1] + rest_of_file
        
        with open("index.html", "w") as f:
            f.write(new_html)
        print("Duplicate removed.")
    else:
        print("Could not find script end tag.")
else:
    print("No duplicates found.")

