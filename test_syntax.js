const fs = require('fs');
const acorn = require('acorn');
const code = fs.readFileSync('index.html', 'utf-8');
const scriptMatch = code.match(/<script>([\s\S]*?)<\/script>/g);
if (scriptMatch) {
    for (let script of scriptMatch) {
        let content = script.replace(/<script>/, '').replace(/<\/script>/, '');
        try {
            acorn.parse(content, { ecmaVersion: 2020 });
            console.log("Syntax OK");
        } catch (e) {
            console.error(e.message);
            console.error("Around line: " + e.loc.line);
        }
    }
}
