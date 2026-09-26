import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const db = new Database(path.join(root, 'data', 'sanctuary.sqlite'), { readonly: true });
const rows = db.prepare('SELECT id, data_json as dataJson, image_url as imageUrl, status FROM gm_characters ORDER BY id').all();
const outputDir = path.join(root, 'data', 'characters');
fs.mkdirSync(outputDir, { recursive: true });
for (const row of rows) {
  const data = JSON.parse(row.dataJson);
  data.imageUrl = row.imageUrl || data.imageUrl || '';
  data.status = row.status;
  fs.writeFileSync(path.join(outputDir, `${row.id}.json`), JSON.stringify(data, null, 2) + '\n', 'utf8');
}
console.log(`Exported ${rows.length} characters to ${path.relative(root, outputDir)}`);
