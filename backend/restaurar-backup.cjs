// Restaura um backup (gerado por backup-banco.cjs) num banco NOVO e vazio.
// As fotos entram ja no formato novo: uma copia de cada foto (tabela imagens) e
// reduzidas pra no maximo 1000px em JPEG.
//
// Uso (dentro de backend/):
//   npm install --no-save sharp        (so na primeira vez)
//   node restaurar-backup.cjs "C:\...\backup-devotos-XXXX.json" --env .env.novo
//
// --env escolhe o arquivo com o DATABASE_URL do banco de DESTINO (padrao: .env).
// Por seguranca, recusa rodar se o banco de destino ja tiver produtos.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const args = process.argv.slice(2);
const iEnv = args.indexOf('--env');
const arquivoEnv = iEnv >= 0 ? args[iEnv + 1] : '.env';
const arquivoBackup = args.find((a, i) => !a.startsWith('--') && i !== iEnv + 1);
require('dotenv').config({ path: path.resolve(arquivoEnv) });

const { Client } = require('pg');
const sharp = require('sharp');

const LADO_MAXIMO = 1000;
const QUALIDADE = 80;

// Mesmo esquema que o server.js cria no initDb
const ESQUEMA = `
  CREATE TABLE IF NOT EXISTS produtos (
    id SERIAL PRIMARY KEY, tipo TEXT NOT NULL, tamanho TEXT NOT NULL, nome TEXT, descricao TEXT,
    codigo_barras TEXT, valor_custo DOUBLE PRECISION, valor_venda DOUBLE PRECISION, quantidade INTEGER,
    imagem_dados BYTEA, imagem_mime TEXT
  );
  CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY, nome TEXT NOT NULL, cpf TEXT, telefone TEXT, endereco TEXT, data_aniversario TEXT
  );
  CREATE TABLE IF NOT EXISTS entradas (
    id SERIAL PRIMARY KEY, produto_id INTEGER REFERENCES produtos(id), produto_nome TEXT, quantidade INTEGER,
    data TEXT, subtipo TEXT, cliente_id INTEGER REFERENCES clientes(id), cliente_nome TEXT, fiado_baixado BOOLEAN DEFAULT FALSE
  );
  CREATE TABLE IF NOT EXISTS saidas (
    id SERIAL PRIMARY KEY, produto_id INTEGER REFERENCES produtos(id), produto_nome TEXT, quantidade INTEGER,
    data TEXT, cliente_id INTEGER REFERENCES clientes(id), cliente_nome TEXT, valor_custo DOUBLE PRECISION,
    valor_venda_cadastrado DOUBLE PRECISION, valor_vendido DOUBLE PRECISION, forma_pagamento TEXT,
    fiado BOOLEAN DEFAULT FALSE, data_acordada TEXT, status_fiado TEXT, valor_pago DOUBLE PRECISION DEFAULT 0,
    pagamentos JSONB DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS imagens (hash TEXT PRIMARY KEY, dados BYTEA NOT NULL, mime TEXT);
  ALTER TABLE produtos ADD COLUMN IF NOT EXISTS imagem_hash TEXT;
`;

async function reduzir(buf) {
  try {
    const nova = await sharp(buf)
      .rotate()
      .resize(LADO_MAXIMO, LADO_MAXIMO, { fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: QUALIDADE, mozjpeg: true })
      .toBuffer();
    return nova.length < buf.length ? { dados: nova, mime: 'image/jpeg' } : null;
  } catch {
    return null; // formato que o sharp nao abre: guarda como veio
  }
}

async function inserir(client, tabela, linhas, colunas) {
  for (const linha of linhas) {
    const valores = colunas.map(c => {
      const v = linha[c];
      return c === 'pagamentos' ? JSON.stringify(v ?? []) : v ?? null;
    });
    const params = colunas.map((_, i) => `$${i + 1}`).join(',');
    await client.query(`INSERT INTO ${tabela} (${colunas.join(',')}) VALUES (${params})`, valores);
  }
  // os proximos cadastros continuam a numeracao depois do maior id restaurado
  await client.query(`SELECT setval(pg_get_serial_sequence('${tabela}', 'id'), GREATEST((SELECT MAX(id) FROM ${tabela}), 1), (SELECT COUNT(*) > 0 FROM ${tabela}))`);
  console.log(`${tabela}: ${linhas.length} registros`);
}

(async () => {
  if (!arquivoBackup || !fs.existsSync(arquivoBackup)) throw new Error('Informe o arquivo de backup (.json)');
  if (!process.env.DATABASE_URL) throw new Error(`Faltou DATABASE_URL em ${arquivoEnv}`);

  const backup = JSON.parse(fs.readFileSync(arquivoBackup, 'utf8'));
  const t = backup.tabelas;
  console.log(`Backup de ${backup.geradoEm}`);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
  });
  await client.connect();
  await client.query(ESQUEMA);

  const { rows: [{ n }] } = await client.query('SELECT COUNT(*)::int AS n FROM produtos');
  if (n > 0) throw new Error(`O banco de destino ja tem ${n} produtos. Por seguranca, so restauro num banco vazio.`);

  // Fotos: uma por conteudo (md5 do original), reduzida antes de enviar
  const hashDoOriginal = new Map(); // md5 do original -> hash da foto guardada
  let antes = 0, depois = 0;
  for (const p of t.produtos || []) {
    if (!p.imagem_dados) continue;
    const original = Buffer.from(p.imagem_dados.base64, 'base64');
    const chave = crypto.createHash('md5').update(original).digest('hex');
    if (!hashDoOriginal.has(chave)) {
      const reduzida = await reduzir(original);
      const dados = reduzida ? reduzida.dados : original;
      const mime = reduzida ? reduzida.mime : p.imagem_mime;
      const hash = crypto.createHash('md5').update(dados).digest('hex');
      await client.query('INSERT INTO imagens (hash, dados, mime) VALUES ($1,$2,$3) ON CONFLICT (hash) DO NOTHING', [hash, dados, mime]);
      hashDoOriginal.set(chave, hash);
      antes += original.length; depois += dados.length;
    }
    p.imagem_hash = hashDoOriginal.get(chave);
  }
  const mb = b => (b / 1024 / 1024).toFixed(1) + ' MB';
  console.log(`imagens: ${hashDoOriginal.size} fotos diferentes, ${mb(antes)} -> ${mb(depois)}`);

  await client.query('BEGIN');
  await inserir(client, 'produtos', t.produtos || [],
    ['id', 'tipo', 'tamanho', 'nome', 'descricao', 'codigo_barras', 'valor_custo', 'valor_venda', 'quantidade', 'imagem_hash']);
  await inserir(client, 'clientes', t.clientes || [],
    ['id', 'nome', 'cpf', 'telefone', 'endereco', 'data_aniversario']);
  await inserir(client, 'entradas', t.entradas || [],
    ['id', 'produto_id', 'produto_nome', 'quantidade', 'data', 'subtipo', 'cliente_id', 'cliente_nome', 'fiado_baixado']);
  await inserir(client, 'saidas', t.saidas || [],
    ['id', 'produto_id', 'produto_nome', 'quantidade', 'data', 'cliente_id', 'cliente_nome', 'valor_custo',
      'valor_venda_cadastrado', 'valor_vendido', 'forma_pagamento', 'fiado', 'data_acordada', 'status_fiado',
      'valor_pago', 'pagamentos']);
  await client.query('COMMIT');

  await client.end();
  console.log('\nRestauracao concluida.');
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
