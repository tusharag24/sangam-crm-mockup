const fs = require('fs');
const code = fs.readFileSync('index.html', 'utf8');

const regex = /<script\b[^>]*>([\s\S]*?)<\/script>/gm;
let match = regex.exec(code);
if (match) {
    let scriptContent = match[1];
    
    // Check if variables in handleGenerateQuoteFromNew are defined
    // We will just do a simple string analysis
    let funcBody = scriptContent.substring(scriptContent.indexOf("window.handleGenerateQuoteFromNew = function(tab) {"));
    funcBody = funcBody.substring(0, funcBody.indexOf("};") + 2);
    console.log(funcBody);
}
