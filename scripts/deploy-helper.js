const fs = require('fs');
const path = require('path');

function save(relPath, b64) {
  const fullPath = path.resolve(relPath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, Buffer.from(b64, 'base64').toString('utf8'), 'utf8');
  console.log(`[Generated] ${relPath}`);
}

module.exports = { save };