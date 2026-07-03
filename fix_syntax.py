with open("index.html", "r") as f:
    content = f.read()

# Fix the 3 broken lines
content = content.replace("handleSelectVerification('Verification Pending')", "handleSelectVerification(&quot;Verification Pending&quot;)")
content = content.replace("handleSelectVerification('Payment Failed')", "handleSelectVerification(&quot;Payment Failed&quot;)")
content = content.replace("handleSelectVerification('Verified')", "handleSelectVerification(&quot;Verified&quot;)")

with open("index.html", "w") as f:
    f.write(content)
