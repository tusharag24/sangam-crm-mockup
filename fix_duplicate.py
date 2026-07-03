import re

with open('index.html', 'r') as f:
    lines = f.readlines()

# find the FIRST and LAST index of renderContactedStage
indices = [i for i, line in enumerate(lines) if "function renderContactedStage(" in line]

if len(indices) > 1:
    last_idx = indices[-1]
    
    # We want to remove from last_idx down to the first occurrence of "// Init" or "renderPipelineCards();"
    end_idx = -1
    for i in range(last_idx, len(lines)):
        if "renderPipelineCards();" in lines[i]:
            end_idx = i
            break
            
    if end_idx != -1:
        # Check if "// Init" is right above it
        if "// Init" in lines[end_idx - 1]:
            end_idx -= 1
        elif "// Init" in lines[end_idx - 2]:
            end_idx -= 2
        elif "// Init" in lines[end_idx - 3]:
            end_idx -= 3
            
        print(f"Removing lines from {last_idx} to {end_idx-1}")
        
        # Keep everything before last_idx, and everything from end_idx onwards
        new_lines = lines[:last_idx] + lines[end_idx:]
        
        with open('index.html', 'w') as f:
            f.writelines(new_lines)
        print("Success")
    else:
        print("Could not find end marker")
else:
    print("No duplicates found")
