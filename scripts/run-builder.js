const fs = require('fs');
const path = require('path');

const bundle = JSON.parse(fs.readFileSync('scripts/ai-bundle.json', 'utf8'));

for (const [file, content] of Object.entries(bundle)) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, content.trim(), 'utf8');
  console.log(`[Created] ${file}`);
}
console.log('AI Bundle deployed successfully.');