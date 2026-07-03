const fs = require('fs');
const esprima = require('esprima');

const code = fs.readFileSync('index.html', 'utf8');

// Find the JS blocks
const regex = /<script\b[^>]*>([\s\S]*?)<\/script>/gm;
let match;
while ((match = regex.exec(code)) !== null) {
    try {
        esprima.parseScript(match[1]);
    } catch (e) {
        console.error('Error in script tag starting at index ' + match.index);
        console.error(e.message);
        
        // Convert to absolute line number
        const preCode = code.substring(0, match.index);
        const startLine = preCode.split('\n').length;
        console.error('Line number in index.html: ~' + (startLine + e.lineNumber));
    }
}
