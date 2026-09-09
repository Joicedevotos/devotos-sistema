import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import multer from 'multer'
import pg from 'pg'
import ExcelJS from 'exceljs'
import { Readable } from 'stream'

dotenv.config()

const { Pool } = pg

const app = express()
const PORT = process.env.PORT || 5000

if (!process.env.DATABASE_URL) {
  console.error('Faltou configurar DATABASE_URL (connection string do banco Postgres/Neon) no .env')
  process.exit(1)
}

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const permitido = /jpeg|jpg|png|gif|webp/
    const extOk = permitido.test(file.originalname.toLowerCase())
    const mimeOk = permitido.test(file.mimetype)
    if (extOk && mimeOk) cb(null, true)
    else cb(new Error('Apenas imagens sao permitidas (jpg, png, gif, webp)'))
  }
})

const uploadPlanilha = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const permitido = /\.(xlsx|xls|csv)$/
    if (permitido.test(file.originalname.toLowerCase())) cb(null, true)
    else cb(new Error('Envie um arquivo de planilha (.xlsx, .xls ou .csv)'))
  }
})

app.use(cors())
app.use(express.json())

const TAMANHOS_POR_TIPO = {
  'Camiseta': ['P', 'M', 'G', 'GG', 'XG'],
  'Baby Look': ['P', 'M', 'G', 'GG', 'XG'],
  'Infantil': ['02', '04', '06', '08', '10', '12'],
  'Plus Size': ['G1', 'G2', 'G3']
}

const PRODUTO_CAMPOS = `id, tipo, tamanho, nome, descricao, codigo_barras, valor_custo, valor_venda, quantidade, (imagem_dados IS NOT NULL) AS tem_imagem`

// remove acentos/espacos extras e ignora maiusculas/minusculas, pra comparar valores vindos de planilha
function normalizarTexto(valor) {
  return String(valor ?? '')
    .normalize('NFD').replace(new RegExp('[̀-ͯ]', 'g'), '')
    .trim()
    .toLowerCase()
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS produtos (
      id SERIAL PRIMARY KEY,
      tipo TEXT NOT NULL,
      tamanho TEXT NOT NULL,
      nome TEXT,
      descricao TEXT,
      codigo_barras TEXT,
      valor_custo DOUBLE PRECISION,
      valor_venda DOUBLE PRECISION,
      quantidade INTEGER,
      imagem_dados BYTEA,
      imagem_mime TEXT
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      cpf TEXT,
      telefone TEXT,
      endereco TEXT,
      data_aniversario TEXT
    );

    CREATE TABLE IF NOT EXISTS entradas (
      id SERIAL PRIMARY KEY,
      produto_id INTEGER REFERENCES produtos(id),
      produto_nome TEXT,
      quantidade INTEGER,
      data TEXT,
      subtipo TEXT,
      cliente_id INTEGER REFERENCES clientes(id),
      cliente_nome TEXT,
      fiado_baixado BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS saidas (
      id SERIAL PRIMARY KEY,
      produto_id INTEGER REFERENCES produtos(id),
      produto_nome TEXT,
      quantidade INTEGER,
      data TEXT,
      cliente_id INTEGER REFERENCES clientes(id),
      cliente_nome TEXT,
      valor_custo DOUBLE PRECISION,
      valor_venda_cadastrado DOUBLE PRECISION,
      valor_vendido DOUBLE PRECISION,
      forma_pagamento TEXT,
      fiado BOOLEAN DEFAULT FALSE,
      data_acordada TEXT,
      status_fiado TEXT,
      valor_pago DOUBLE PRECISION DEFAULT 0,
      pagamentos JSONB DEFAULT '[]'
    );
  `)
  console.log('Banco de dados (Postgres) pronto')
}

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    res.json({ success: true, token: 'token-123', user: { id: 1, username: 'admin' } })
  } else {
    res.status(401).json({ error: 'Erro' })
  }
})

// ==================== PRODUTOS ====================
app.post('/api/produtos', (req, res) => {
  upload.single('imagem')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message })
    try {
      const { tipo, tamanho, descricao, codigo_barras, valor_custo, valor_venda, quantidade } = req.body

      if (!TAMANHOS_POR_TIPO[tipo]) return res.status(400).json({ error: 'Selecione um produto valido' })
      if (!TAMANHOS_POR_TIPO[tipo].includes(tamanho)) return res.status(400).json({ error: 'Selecione um tamanho valido para esse produto' })

      const nome = `${tipo} - ${tamanho}`
      const imagemDados = req.file ? req.file.buffer : null
      const imagemMime = req.file ? req.file.mimetype : null

      const result = await pool.query(
        `INSERT INTO produtos (tipo, tamanho, nome, descricao, codigo_barras, valor_custo, valor_venda, quantidade, imagem_dados, imagem_mime)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING ${PRODUTO_CAMPOS}`,
        [tipo, tamanho, nome, descricao, codigo_barras || null, parseFloat(valor_custo), parseFloat(valor_venda), parseInt(quantidade), imagemDados, imagemMime]
      )
      res.status(201).json(result.rows[0])
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Erro ao salvar produto' })
    }
  })
})

app.get('/api/produtos', async (req, res) => {
  try {
    const result = await pool.query(`SELECT ${PRODUTO_CAMPOS} FROM produtos ORDER BY id`)
    res.json(result.rows)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Erro ao listar produtos' })
  }
})

app.get('/api/produtos/:id/imagem', async (req, res) => {
  try {
    const result = await pool.query('SELECT imagem_dados, imagem_mime FROM produtos WHERE id=$1', [req.params.id])
    const row = result.rows[0]
    if (!row || !row.imagem_dados) return res.status(404).end()
    res.set('Content-Type', row.imagem_mime || 'image/jpeg')
    res.set('Cache-Control', 'public, max-age=3600')
    res.send(row.imagem_dados)
  } catch (e) {
    console.error(e)
    res.status(500).end()
  }
})

app.put('/api/produtos/:id', (req, res) => {
  upload.single('imagem')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message })
    try {
      const { tipo, tamanho, descricao, codigo_barras, valor_custo, valor_venda, quantidade } = req.body

      if (!TAMANHOS_POR_TIPO[tipo]) return res.status(400).json({ error: 'Selecione um produto valido' })
      if (!TAMANHOS_POR_TIPO[tipo].includes(tamanho)) return res.status(400).json({ error: 'Selecione um tamanho valido para esse produto' })

      const nome = `${tipo} - ${tamanho}`
      let result

      if (req.file) {
        result = await pool.query(
          `UPDATE produtos SET tipo=$1, tamanho=$2, nome=$3, descricao=$4, codigo_barras=$5, valor_custo=$6, valor_venda=$7, quantidade=$8, imagem_dados=$9, imagem_mime=$10
           WHERE id=$11 RETURNING ${PRODUTO_CAMPOS}`,
          [tipo, tamanho, nome, descricao, codigo_barras || null, parseFloat(valor_custo), parseFloat(valor_venda), parseInt(quantidade), req.file.buffer, req.file.mimetype, req.params.id]
        )
      } else {
        result = await pool.query(
          `UPDATE produtos SET tipo=$1, tamanho=$2, nome=$3, descricao=$4, codigo_barras=$5, valor_custo=$6, valor_venda=$7, quantidade=$8
           WHERE id=$9 RETURNING ${PRODUTO_CAMPOS}`,
          [tipo, tamanho, nome, descricao, codigo_barras || null, parseFloat(valor_custo), parseFloat(valor_venda), parseInt(quantidade), req.params.id]
        )
      }

      if (!result.rows[0]) return res.status(404).json({ error: 'Produto nao encontrado' })
      res.json(result.rows[0])
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Erro ao atualizar produto' })
    }
  })
})

app.delete('/api/produtos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM produtos WHERE id=$1', [req.params.id])
    res.json({ msg: 'deletado' })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Erro ao deletar produto' })
  }
})

// Modelo de planilha para cadastro em massa
app.get('/api/produtos/modelo', async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook()
    const planilha = workbook.addWorksheet('Produtos')
    planilha.columns = [
      { header: 'Produto', key: 'tipo', width: 15 },
      { header: 'Tamanho', key: 'tamanho', width: 10 },
      { header: 'Descricao', key: 'descricao', width: 30 },
      { header: 'Codigo de Barras', key: 'codigo_barras', width: 20 },
      { header: 'Valor Custo', key: 'valor_custo', width: 12 },
      { header: 'Valor Venda', key: 'valor_venda', width: 12 },
      { header: 'Quantidade', key: 'quantidade', width: 12 }
    ]
    planilha.addRow({ tipo: 'Camiseta', tamanho: 'M', descricao: 'Camiseta basica preta', codigo_barras: '7891234567890', valor_custo: 25.5, valor_venda: 49.9, quantidade: 10 })
    planilha.getRow(1).font = { bold: true }

    const opcoes = workbook.addWorksheet('Opcoes validas')
    opcoes.columns = [{ header: 'Produto', key: 'tipo', width: 15 }, { header: 'Tamanhos aceitos', key: 'tamanhos', width: 40 }]
    Object.entries(TAMANHOS_POR_TIPO).forEach(([tipo, tamanhos]) => {
      opcoes.addRow({ tipo, tamanhos: tamanhos.join(', ') })
    })
    opcoes.getRow(1).font = { bold: true }

    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.set('Content-Disposition', 'attachment; filename="modelo-produtos.xlsx"')
    await workbook.xlsx.write(res)
    res.end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Erro ao gerar modelo de planilha' })
  }
})

// Cadastro em massa via planilha
app.post('/api/produtos/importar', (req, res) => {
  uploadPlanilha.single('planilha')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message })
    try {
      if (!req.file) return res.status(400).json({ error: 'Nenhuma planilha enviada' })

      const workbook = new ExcelJS.Workbook()
      const nomeArquivo = req.file.originalname.toLowerCase()
      if (nomeArquivo.endsWith('.csv')) {
        await workbook.csv.read(Readable.from(req.file.buffer))
      } else {
        await workbook.xlsx.load(req.file.buffer)
      }
      const planilha = workbook.worksheets[0]
      if (!planilha) return res.status(400).json({ error: 'Planilha vazia' })

      const cabecalho = {}
      planilha.getRow(1).eachCell((cell, colNumber) => {
        cabecalho[normalizarTexto(cell.value)] = colNumber
      })
      const pegarCelula = (row, ...nomes) => {
        for (const nome of nomes) {
          const col = cabecalho[normalizarTexto(nome)]
          if (col) return row.getCell(col).value
        }
        return ''
      }

      const tiposValidos = Object.keys(TAMANHOS_POR_TIPO)
      const encontrarTipo = (valor) => tiposValidos.find(t => normalizarTexto(t) === normalizarTexto(valor))

      const validos = []
      const erros = []

      for (let numeroLinha = 2; numeroLinha <= planilha.rowCount; numeroLinha++) {
        const row = planilha.getRow(numeroLinha)
        if (row.cellCount === 0 || row.values.every(v => v === null || v === undefined || v === '')) continue

        const tipoBruto = pegarCelula(row, 'Produto', 'Tipo')
        const tamanhoBruto = pegarCelula(row, 'Tamanho')
        const descricao = pegarCelula(row, 'Descricao', 'Descrição')
        const codigoBarras = pegarCelula(row, 'Codigo de Barras', 'Código de Barras', 'codigo_barras')
        const valorCustoBruto = pegarCelula(row, 'Valor Custo', 'valor_custo')
        const valorVendaBruto = pegarCelula(row, 'Valor Venda', 'valor_venda')
        const quantidadeBruto = pegarCelula(row, 'Quantidade', 'quantidade')

        const tipo = encontrarTipo(tipoBruto)
        if (!tipo) {
          erros.push({ linha: numeroLinha, motivo: `Produto invalido: "${tipoBruto}"` })
          continue
        }
        const tamanho = (TAMANHOS_POR_TIPO[tipo] || []).find(t => normalizarTexto(t) === normalizarTexto(tamanhoBruto))
        if (!tamanho) {
          erros.push({ linha: numeroLinha, motivo: `Tamanho invalido "${tamanhoBruto}" para o produto ${tipo}` })
          continue
        }
        const valorCusto = parseFloat(String(valorCustoBruto).replace(',', '.'))
        const valorVenda = parseFloat(String(valorVendaBruto).replace(',', '.'))
        const quantidade = parseInt(quantidadeBruto)
        if (isNaN(valorCusto) || isNaN(valorVenda)) {
          erros.push({ linha: numeroLinha, motivo: 'Valor de custo ou venda invalido' })
          continue
        }
        if (isNaN(quantidade)) {
          erros.push({ linha: numeroLinha, motivo: 'Quantidade invalida' })
          continue
        }

        validos.push({
          tipo, tamanho,
          descricao: descricao ? String(descricao).trim() : null,
          codigo_barras: codigoBarras ? String(codigoBarras).trim() : null,
          valor_custo: valorCusto,
          valor_venda: valorVenda,
          quantidade
        })
      }

      let criados = 0
      for (const p of validos) {
        const nome = `${p.tipo} - ${p.tamanho}`
        await pool.query(
          `INSERT INTO produtos (tipo, tamanho, nome, descricao, codigo_barras, valor_custo, valor_venda, quantidade) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [p.tipo, p.tamanho, nome, p.descricao, p.codigo_barras, p.valor_custo, p.valor_venda, p.quantidade]
        )
        criados++
      }

      res.json({ criados, totalLinhas: criados + erros.length, erros })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Erro ao importar planilha. Verifique se o arquivo esta no formato correto.' })
    }
  })
})

// ==================== CLIENTES ====================
app.post('/api/clientes', async (req, res) => {
  try {
    const { nome, cpf, telefone, endereco, data_aniversario } = req.body
    const result = await pool.query(
      'INSERT INTO clientes (nome, cpf, telefone, endereco, data_aniversario) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [nome, cpf, telefone, endereco, data_aniversario || null]
    )
    res.status(201).json(result.rows[0])
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Erro ao salvar cliente' })
  }
})

app.get('/api/clientes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clientes ORDER BY id')
    res.json(result.rows)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Erro ao listar clientes' })
  }
})

app.put('/api/clientes/:id', async (req, res) => {
  try {
    const { nome, cpf, telefone, endereco, data_aniversario } = req.body
    const result = await pool.query(
      'UPDATE clientes SET nome=$1, cpf=$2, telefone=$3, endereco=$4, data_aniversario=$5 WHERE id=$6 RETURNING *',
      [nome, cpf, telefone, endereco, data_aniversario || null, req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Cliente nao encontrado' })
    res.json(result.rows[0])
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Erro ao atualizar cliente' })
  }
})

app.delete('/api/clientes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM clientes WHERE id=$1', [req.params.id])
    res.json({ msg: 'deletado' })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Erro ao deletar cliente' })
  }
})

// Aniversariantes da semana atual (domingo a sabado)
app.get('/api/clientes/aniversariantes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clientes')
    const clientes = result.rows

    const hoje = new Date()
    const anoAtual = hoje.getFullYear()

    const domingo = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - hoje.getDay())
    domingo.setHours(0, 0, 0, 0)
    const sabado = new Date(domingo)
    sabado.setDate(domingo.getDate() + 6)
    sabado.setHours(23, 59, 59, 999)

    const aniversariantes = clientes.filter(c => {
      if (!c.data_aniversario) return false
      const [, mesStr, diaStr] = c.data_aniversario.split('-')
      const mes = parseInt(mesStr) - 1
      const dia = parseInt(diaStr)
      if (isNaN(mes) || isNaN(dia)) return false

      const candidatos = [
        new Date(anoAtual - 1, mes, dia),
        new Date(anoAtual, mes, dia),
        new Date(anoAtual + 1, mes, dia)
      ]
      return candidatos.some(d => d >= domingo && d <= sabado)
    })

    res.json(aniversariantes)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Erro ao calcular aniversariantes' })
  }
})

// Aniversariantes do mes atual
app.get('/api/clientes/aniversariantes-mes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clientes')
    const clientes = result.rows
    const mesAtual = new Date().getMonth() + 1

    const aniversariantes = clientes.filter(c => {
      if (!c.data_aniversario) return false
      const mes = parseInt(c.data_aniversario.split('-')[1])
      return mes === mesAtual
    })

    res.json(aniversariantes)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Erro ao calcular aniversariantes' })
  }
})

// ==================== ENTRADAS ====================
app.post('/api/entradas', async (req, res) => {
  const { produto_id, quantidade, data, subtipo, cliente_id } = req.body
  const qtd = parseInt(quantidade)
  if (!qtd || qtd <= 0) return res.status(400).json({ error: 'Quantidade invalida' })
  const tipoEntrada = subtipo === 'devolucao' ? 'devolucao' : 'compra'

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const produtoRes = await client.query('SELECT * FROM produtos WHERE id=$1 FOR UPDATE', [produto_id])
    const produto = produtoRes.rows[0]
    if (!produto) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Produto nao encontrado' })
    }

    let cliente = null
    let saidaBaixadaId = null

    if (tipoEntrada === 'devolucao') {
      const clienteRes = await client.query('SELECT * FROM clientes WHERE id=$1', [cliente_id])
      cliente = clienteRes.rows[0]
      if (!cliente) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: 'Selecione o cliente que devolveu' })
      }

      // Se o cliente tinha esse produto fiado (pendente ou parcial), a devolucao baixa o fiado.
      // Prioriza um fiado aberto com a mesma quantidade; senao pega qualquer fiado aberto desse par cliente+produto.
      let fiadoRes = await client.query(
        `SELECT id FROM saidas WHERE cliente_id=$1 AND produto_id=$2 AND fiado=TRUE AND status_fiado IN ('pendente','parcial') AND quantidade=$3 ORDER BY id LIMIT 1`,
        [cliente.id, produto.id, qtd]
      )
      if (!fiadoRes.rows[0]) {
        fiadoRes = await client.query(
          `SELECT id FROM saidas WHERE cliente_id=$1 AND produto_id=$2 AND fiado=TRUE AND status_fiado IN ('pendente','parcial') ORDER BY id LIMIT 1`,
          [cliente.id, produto.id]
        )
      }

      if (fiadoRes.rows[0]) {
        saidaBaixadaId = fiadoRes.rows[0].id
        await client.query(`UPDATE saidas SET status_fiado='devolvido' WHERE id=$1`, [saidaBaixadaId])
      }
    }

    await client.query('UPDATE produtos SET quantidade = quantidade + $1 WHERE id=$2', [qtd, produto.id])

    const dataFinal = data || new Date().toISOString().slice(0, 10)
    const insertRes = await client.query(
      `INSERT INTO entradas (produto_id, produto_nome, quantidade, data, subtipo, cliente_id, cliente_nome, fiado_baixado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [produto.id, produto.nome, qtd, dataFinal, tipoEntrada, cliente ? cliente.id : null, cliente ? cliente.nome : null, !!saidaBaixadaId]
    )

    await client.query('COMMIT')
    res.status(201).json(insertRes.rows[0])
  } catch (e) {
    await client.query('ROLLBACK')
    console.error(e)
    res.status(500).json({ error: 'Erro ao registrar entrada' })
  } finally {
    client.release()
  }
})

app.get('/api/entradas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM entradas ORDER BY id')
    res.json(result.rows)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Erro ao listar entradas' })
  }
})

// ==================== SAIDAS ====================
app.post('/api/saidas', async (req, res) => {
  const { produto_id, quantidade, cliente_id, valor_vendido, forma_pagamento, data_acordada, data } = req.body
  const qtd = parseInt(quantidade)
  if (!qtd || qtd <= 0) return res.status(400).json({ error: 'Quantidade invalida' })

  const valor = parseFloat(valor_vendido)
  if (isNaN(valor) || valor < 0) return res.status(400).json({ error: 'Valor vendido invalido' })

  const fiado = forma_pagamento === 'fiado'
  if (fiado && !data_acordada) return res.status(400).json({ error: 'Informe a data acordada para pagamento' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const produtoRes = await client.query('SELECT * FROM produtos WHERE id=$1 FOR UPDATE', [produto_id])
    const produto = produtoRes.rows[0]
    if (!produto) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Produto nao encontrado' })
    }
    if (produto.quantidade < qtd) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Estoque insuficiente para essa saida' })
    }

    const clienteRes = await client.query('SELECT * FROM clientes WHERE id=$1', [cliente_id])
    const cliente = clienteRes.rows[0]
    if (!cliente) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Selecione o cliente comprador' })
    }

    await client.query('UPDATE produtos SET quantidade = quantidade - $1 WHERE id=$2', [qtd, produto.id])

    const dataFinal = data || new Date().toISOString().slice(0, 10)
    const insertRes = await client.query(
      `INSERT INTO saidas (produto_id, produto_nome, quantidade, data, cliente_id, cliente_nome, valor_custo, valor_venda_cadastrado, valor_vendido, forma_pagamento, fiado, data_acordada, status_fiado, valor_pago, pagamentos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,0,'[]') RETURNING *`,
      [produto.id, produto.nome, qtd, dataFinal, cliente.id, cliente.nome, produto.valor_custo, produto.valor_venda, valor, forma_pagamento, fiado, fiado ? data_acordada : null, fiado ? 'pendente' : null]
    )

    await client.query('COMMIT')
    res.status(201).json(insertRes.rows[0])
  } catch (e) {
    await client.query('ROLLBACK')
    console.error(e)
    res.status(500).json({ error: 'Erro ao registrar saida' })
  } finally {
    client.release()
  }
})

app.get('/api/saidas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM saidas ORDER BY id')
    res.json(result.rows)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Erro ao listar saidas' })
  }
})

// Registrar pagamento (total ou parcial) de uma venda fiado
app.post('/api/saidas/:id/pagamento', async (req, res) => {
  const { data_pagamento, valor_pago } = req.body
  const valor = parseFloat(valor_pago)
  if (isNaN(valor) || valor <= 0) return res.status(400).json({ error: 'Valor pago invalido' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const saidaRes = await client.query('SELECT * FROM saidas WHERE id=$1 FOR UPDATE', [req.params.id])
    const saida = saidaRes.rows[0]
    if (!saida) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Registro nao encontrado' })
    }
    if (!saida.fiado) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Esta venda nao e fiado' })
    }
    if (saida.status_fiado === 'pago') {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Este fiado ja foi pago integralmente' })
    }
    if (saida.status_fiado === 'devolvido') {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Este produto foi devolvido, nao ha pagamento pendente' })
    }

    const pagamentos = Array.isArray(saida.pagamentos) ? saida.pagamentos : []
    pagamentos.push({ data: data_pagamento || new Date().toISOString().slice(0, 10), valor })
    const novoValorPago = parseFloat((saida.valor_pago + valor).toFixed(2))
    const novoStatus = novoValorPago >= saida.valor_vendido - 0.009 ? 'pago' : 'parcial'

    const updateRes = await client.query(
      'UPDATE saidas SET pagamentos=$1, valor_pago=$2, status_fiado=$3 WHERE id=$4 RETURNING *',
      [JSON.stringify(pagamentos), novoValorPago, novoStatus, req.params.id]
    )

    await client.query('COMMIT')
    res.json(updateRes.rows[0])
  } catch (e) {
    await client.query('ROLLBACK')
    console.error(e)
    res.status(500).json({ error: 'Erro ao registrar pagamento' })
  } finally {
    client.release()
  }
})

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const produtosCount = await pool.query('SELECT COUNT(*)::int AS count FROM produtos')
    const clientesCount = await pool.query('SELECT COUNT(*)::int AS count FROM clientes')
    const totalCusto = await pool.query('SELECT COALESCE(SUM(valor_custo * quantidade), 0) AS total FROM produtos')

    res.json({
      totalProdutos: produtosCount.rows[0].count,
      totalClientes: clientesCount.rows[0].count,
      totalEstoque: Number(totalCusto.rows[0].total).toFixed(2)
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Erro ao carregar dashboard' })
  }
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' })
})

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log('Servidor rodando na porta ' + PORT)
    })
  })
  .catch(err => {
    console.error('Erro ao conectar no banco de dados:', err)
    process.exit(1)
  })
