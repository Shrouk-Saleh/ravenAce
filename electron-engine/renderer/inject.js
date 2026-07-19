const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, 'dist');
const htmlPath = path.join(distPath, 'index.html');
const assetsPath = path.join(distPath, 'assets');

let html = fs.readFileSync(htmlPath, 'utf8');

const files = fs.readdirSync(assetsPath);
const jsFile = files.find(f => f.endsWith('.js'));
const cssFile = files.find(f => f.endsWith('.css'));

let injections = '';
if (cssFile) injections += `<link rel="stylesheet" href="./assets/${cssFile}">\n`;
if (jsFile) injections += `<script type="module" src="./assets/${jsFile}"></script>\n`;

if (!html.includes(jsFile)) {
    html = html.replace('</body>', injections + '</body>');
    fs.writeFileSync(htmlPath, html);
    console.log('Injected!', injections);
} else {
    console.log('Already injected!');
}
