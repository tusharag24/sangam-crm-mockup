const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync('index.html', 'utf-8');
const dom = new JSDOM(html, { runScripts: "dangerously" });

try {
    dom.window.document.addEventListener("DOMContentLoaded", () => {
        console.log("DOMContentLoaded fired!");
        console.log("Number of leads rendered: ", dom.window.document.querySelectorAll('#lead-table-body tr').length);
    });
} catch(e) {
    console.error("Error:", e);
}
