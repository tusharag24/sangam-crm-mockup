html = open("index.html").read()
start = html.find("window.handleGenerateQuoteFromNew = function(tab) {")
end = html.find("};", start)
print(html[start:end+2])
