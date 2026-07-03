with open("index.html", "r") as f:
    content = f.read()

# Fix the accordion rendering for 'New' stage
content = content.replace("renderAccordion('New', renderOutreachStage(true))", "renderAccordion('New', renderNewStage(true))")

with open("index.html", "w") as f:
    f.write(content)
