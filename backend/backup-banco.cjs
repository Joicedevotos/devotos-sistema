// Backup completo do banco (Neon) em JSON. Uso: node backup-banco.cjs
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const { rows: tabelas } = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name"
  );
  const backup = { geradoEm: new Date().toISOString(), tabelas: {} };
  for (const { table_name } of tabelas) {
    const { rows } = await client.query(`SELECT * FROM "${table_name}"`);
    backup.tabelas[table_name] = rows.map(r => {
      for (const k in r) if (Buffer.isBuffer(r[k])) r[k] = { base64: r[k].toString('base64') };
      return r;
    });
    console.log(`${table_name}: ${rows.length} registros`);
  }
  await client.end();
  const dir = process.argv[2] || path.join(require('os').homedir(), 'Desktop', 'BACKUP DEVOTOS');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const arquivo = path.join(dir, `backup-devotos-${stamp}.json`);
  fs.writeFileSync(arquivo, JSON.stringify(backup));
  console.log('Salvo em:', arquivo, `(${(fs.statSync(arquivo).size / 1024 / 1024).toFixed(2)} MB)`);
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
