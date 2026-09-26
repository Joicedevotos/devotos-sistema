// Reduz as fotos ja guardadas no banco (tabela imagens) pra no maximo 1000px em JPEG,
// o mesmo tamanho que o app passou a enviar nas fotos novas.
//
// Uso (dentro de backend/, com o .env apontando pro banco):
//   npm install --no-save sharp        (so na primeira vez)
//   node backup-banco.cjs              (fazer backup antes!)
//   node reduzir-fotos.cjs             -> so mostra quanto vai economizar, nao altera nada
//   node reduzir-fotos.cjs --aplicar   -> reduz de verdade
require('dotenv').config();
const { Client } = require('pg');
const crypto = require('crypto');
const sharp = require('sharp');

const LADO_MAXIMO = 1000;
const QUALIDADE = 80;
const aplicar = process.argv.includes('--aplicar');

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
  });
  await client.connect();

  const { rows: lista } = await client.query('SELECT hash FROM imagens ORDER BY hash');
  let antes = 0, depois = 0, reduzidas = 0;

  for (const [n, { hash }] of lista.entries()) {
    const { rows: [img] } = await client.query('SELECT dados FROM imagens WHERE hash=$1', [hash]);
    if (!img) continue;
    const original = img.dados;
    let nova;
    try {
      nova = await sharp(original)
        .rotate() // respeita a orientacao da foto do celular
        .resize(LADO_MAXIMO, LADO_MAXIMO, { fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: QUALIDADE, mozjpeg: true })
        .toBuffer();
    } catch (e) {
      console.log(`${n + 1}/${lista.length} ${hash}: nao consegui abrir (${e.message}), mantida`);
      antes += original.length; depois += original.length;
      continue;
    }

    antes += original.length;
    if (nova.length >= original.length) { depois += original.length; continue; }
    depois += nova.length;
    reduzidas++;
    console.log(`${n + 1}/${lista.length} ${hash}: ${Math.round(original.length / 1024)} KB -> ${Math.round(nova.length / 1024)} KB`);

    if (aplicar) {
      const novoHash = crypto.createHash('md5').update(nova).digest('hex');
      await client.query('BEGIN');
      await client.query('INSERT INTO imagens (hash, dados, mime) VALUES ($1, $2, $3) ON CONFLICT (hash) DO NOTHING', [novoHash, nova, 'image/jpeg']);
      await client.query('UPDATE produtos SET imagem_hash=$1 WHERE imagem_hash=$2', [novoHash, hash]);
      await client.query('DELETE FROM imagens WHERE hash=$1', [hash]);
      await client.query('COMMIT');
    }
  }

  await client.end();
  const mb = b => (b / 1024 / 1024).toFixed(1) + ' MB';
  console.log(`\n${reduzidas} de ${lista.length} fotos reduzidas: ${mb(antes)} -> ${mb(depois)}`);
  if (!aplicar) console.log('Nada foi alterado. Rode com --aplicar para reduzir de verdade.');
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
