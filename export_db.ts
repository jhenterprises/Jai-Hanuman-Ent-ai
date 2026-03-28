import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = './data/database.sqlite';
const outputPath = './data/database_export.json';

function exportSqliteToJson() {
  console.log('Current working directory:', process.cwd());
  console.log('Checking path:', dbPath);
  console.log('File exists:', fs.existsSync(dbPath));

  if (!fs.existsSync(dbPath)) {
    console.error(`Database file not found at ${dbPath}`);
    return;
  }

  const db = new Database(dbPath, { readonly: true });
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table';").all() as { name: string }[];

  const data: Record<string, any[]> = {};

  for (const table of tables) {
    const tableName = table.name;
    console.log(`Exporting table: ${tableName}`);

    const rows = db.prepare(`SELECT * FROM ${tableName};`).all();
    data[tableName] = rows;
  }

  db.close();

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Successfully exported database to ${outputPath}`);
}

exportSqliteToJson();
