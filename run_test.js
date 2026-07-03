const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf-8');
// extract script tags
let scripts = [];
let scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gm;
let match;
while ((match = scriptRegex.exec(html)) !== null) {
    scripts.push(match[1]);
}
let code = scripts.join('\n');

// Mock DOM
global.document = {
    getElementById: (id) => {
        return {
            innerHTML: '',
            style: {},
            classList: { add: ()=>{}, remove: ()=>{} },
            addEventListener: ()=>{},
            appendChild: ()=>{},
            querySelectorAll: () => [],
            textContent: ''
        };
    },
    querySelectorAll: () => [],
    addEventListener: () => {}
};
global.window = {
    location: { search: '' },
    addEventListener: () => {}
};

try {
    eval(code);
    console.log("No syntax/init errors!");
} catch (e) {
    console.log("Runtime error: " + e.message);
    console.log(e.stack);
}
