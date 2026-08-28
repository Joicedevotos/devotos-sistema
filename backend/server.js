import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 5000

const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `produto-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const permitido = /jpeg|jpg|png|gif|webp/
    const extOk = permitido.test(path.extname(file.originalname).toLowerCase())
    const mimeOk = permitido.test(file.mimetype)
    if (extOk && mimeOk) cb(null, true)
    else cb(new Error('Apenas imagens sao permitidas (jpg, png, gif, webp)'))
  }
})

app.use(cors())
app.use(express.json())
app.use(express.static('uploads'))

const TAMANHOS_POR_TIPO = {
  'Camiseta': ['P', 'M', 'G', 'GG', 'XG'],
  'Baby Look': ['P', 'M', 'G', 'GG', 'XG'],
  'Infantil': ['02', '04', '06', '08', '10', '12'],
  'Plus Size': ['G1', 'G2', 'G3']
}

let produtos = []
let clientes = []
let entradas = []
let saidas = []
let produtoId = 1
let clienteId = 1
let entradaId = 1
let saidaId = 1

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body
  if (username === 'admin' && password === 'admin123') {
    res.json({ success: true, token: 'token-123', user: { id: 1, username: 'admin' } })
  } else {
    res.status(401).json({ error: 'Erro' })
  }
})

app.post('/api/produtos', (req, res) => {
  upload.single('imagem')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message })

    const { tipo, tamanho, descricao, codigo_barras, valor_custo, valor_venda, quantidade } = req.body

    if (!TAMANHOS_POR_TIPO[tipo]) return res.status(400).json({ error: 'Selecione um produto valido' })
    if (!TAMANHOS_POR_TIPO[tipo].includes(tamanho)) return res.status(400).json({ error: 'Selecione um tamanho valido para esse produto' })

    const imagem = req.file ? req.file.filename : null
    const novo = {
      id: produtoId++,
      tipo,
      tamanho,
      nome: `${tipo} - ${tamanho}`,
      descricao,
      codigo_barras: codigo_barras || null,
      valor_custo: parseFloat(valor_custo),
      valor_venda: parseFloat(valor_venda),
      quantidade: parseInt(quantidade),
      imagem
    }
    produtos.push(novo)
    res.status(201).json(novo)
  })
})

app.get('/api/produtos', (req, res) => {
  res.json(produtos)
})

app.put('/api/produtos/:id', (req, res) => {
  upload.single('imagem')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message })

    const produto = produtos.find(p => p.id === parseInt(req.params.id))
    if (!produto) return res.status(404).json({ error: 'Produto nao encontrado' })

    const { tipo, tamanho, descricao, codigo_barras, valor_custo, valor_venda, quantidade } = req.body

    if (!TAMANHOS_POR_TIPO[tipo]) return res.status(400).json({ error: 'Selecione um produto valido' })
    if (!TAMANHOS_POR_TIPO[tipo].includes(tamanho)) return res.status(400).json({ error: 'Selecione um tamanho valido para esse produto' })

    produto.tipo = tipo
    produto.tamanho = tamanho
    produto.nome = `${tipo} - ${tamanho}`
    produto.descricao = descricao
    produto.codigo_barras = codigo_barras || null
    produto.valor_custo = parseFloat(valor_custo)
    produto.valor_venda = parseFloat(valor_venda)
    produto.quantidade = parseInt(quantidade)

    if (req.file) {
      if (produto.imagem) {
        const antiga = path.join(uploadsDir, produto.imagem)
        fs.unlink(antiga, () => {})
      }
      produto.imagem = req.file.filename
    }

    res.json(produto)
  })
})

app.delete('/api/produtos/:id', (req, res) => {
  const produto = produtos.find(p => p.id === parseInt(req.params.id))
  if (produto && produto.imagem) {
    const caminho = path.join(uploadsDir, produto.imagem)
    fs.unlink(caminho, () => {})
  }
  produtos = produtos.filter(p => p.id !== parseInt(req.params.id))
  res.json({ msg: 'deletado' })
})

app.post('/api/clientes', (req, res) => {
  const { nome, cpf, telefone, endereco, data_aniversario } = req.body
  const novo = { id: clienteId++, nome, cpf, telefone, endereco, data_aniversario }
  clientes.push(novo)
  res.status(201).json(novo)
})

app.get('/api/clientes', (req, res) => {
  res.json(clientes)
})

app.put('/api/clientes/:id', (req, res) => {
  const cliente = clientes.find(c => c.id === parseInt(req.params.id))
  if (!cliente) return res.status(404).json({ error: 'Cliente nao encontrado' })

  const { nome, cpf, telefone, endereco, data_aniversario } = req.body
  cliente.nome = nome
  cliente.cpf = cpf
  cliente.telefone = telefone
  cliente.endereco = endereco
  cliente.data_aniversario = data_aniversario

  res.json(cliente)
})

app.delete('/api/clientes/:id', (req, res) => {
  clientes = clientes.filter(c => c.id !== parseInt(req.params.id))
  res.json({ msg: 'deletado' })
})

// Aniversariantes da semana atual (domingo a sabado)
app.get('/api/clientes/aniversariantes', (req, res) => {
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

    // Verifica o aniversario no ano anterior, atual e seguinte para cobrir semanas que cruzam a virada do ano
    const candidatos = [
      new Date(anoAtual - 1, mes, dia),
      new Date(anoAtual, mes, dia),
      new Date(anoAtual + 1, mes, dia)
    ]
    return candidatos.some(d => d >= domingo && d <= sabado)
  })

  res.json(aniversariantes)
})

// Aniversariantes do mes atual
app.get('/api/clientes/aniversariantes-mes', (req, res) => {
  const mesAtual = new Date().getMonth() + 1

  const aniversariantes = clientes.filter(c => {
    if (!c.data_aniversario) return false
    const mes = parseInt(c.data_aniversario.split('-')[1])
    return mes === mesAtual
  })

  res.json(aniversariantes)
})

// ==================== ENTRADAS ====================
app.post('/api/entradas', (req, res) => {
  const { produto_id, quantidade, data, subtipo, cliente_id } = req.body
  const produto = produtos.find(p => p.id === parseInt(produto_id))
  if (!produto) return res.status(404).json({ error: 'Produto nao encontrado' })

  const qtd = parseInt(quantidade)
  if (!qtd || qtd <= 0) return res.status(400).json({ error: 'Quantidade invalida' })

  const tipoEntrada = subtipo === 'devolucao' ? 'devolucao' : 'compra'

  let cliente = null
  let saidaBaixada = null
  if (tipoEntrada === 'devolucao') {
    cliente = clientes.find(c => c.id === parseInt(cliente_id))
    if (!cliente) return res.status(400).json({ error: 'Selecione o cliente que devolveu' })

    // Se o cliente tinha esse produto fiado (pendente ou parcial), a devolucao baixa o fiado
    const fiadoAberto = (s) => s.cliente_id === cliente.id && s.produto_id === produto.id && s.fiado && (s.status_fiado === 'pendente' || s.status_fiado === 'parcial')
    saidaBaixada = saidas.find(s => fiadoAberto(s) && s.quantidade === qtd) || saidas.find(fiadoAberto)

    if (saidaBaixada) {
      saidaBaixada.status_fiado = 'devolvido'
    }
  }

  produto.quantidade += qtd

  const nova = {
    id: entradaId++,
    produto_id: produto.id,
    produto_nome: produto.nome,
    quantidade: qtd,
    data: data || new Date().toISOString().slice(0, 10),
    subtipo: tipoEntrada,
    cliente_id: cliente ? cliente.id : null,
    cliente_nome: cliente ? cliente.nome : null,
    fiado_baixado: !!saidaBaixada
  }
  entradas.push(nova)
  res.status(201).json(nova)
})

app.get('/api/entradas', (req, res) => {
  res.json(entradas)
})

// ==================== SAIDAS ====================
app.post('/api/saidas', (req, res) => {
  const { produto_id, quantidade, cliente_id, valor_vendido, forma_pagamento, data_acordada, data } = req.body
  const produto = produtos.find(p => p.id === parseInt(produto_id))
  if (!produto) return res.status(404).json({ error: 'Produto nao encontrado' })

  const qtd = parseInt(quantidade)
  if (!qtd || qtd <= 0) return res.status(400).json({ error: 'Quantidade invalida' })
  if (produto.quantidade < qtd) return res.status(400).json({ error: 'Estoque insuficiente para essa saida' })

  const cliente = clientes.find(c => c.id === parseInt(cliente_id))
  if (!cliente) return res.status(400).json({ error: 'Selecione o cliente comprador' })

  const valor = parseFloat(valor_vendido)
  if (isNaN(valor) || valor < 0) return res.status(400).json({ error: 'Valor vendido invalido' })

  const fiado = forma_pagamento === 'fiado'
  if (fiado && !data_acordada) return res.status(400).json({ error: 'Informe a data acordada para pagamento' })

  produto.quantidade -= qtd

  const nova = {
    id: saidaId++,
    produto_id: produto.id,
    produto_nome: produto.nome,
    quantidade: qtd,
    data: data || new Date().toISOString().slice(0, 10),
    cliente_id: cliente.id,
    cliente_nome: cliente.nome,
    valor_custo: produto.valor_custo,
    valor_venda_cadastrado: produto.valor_venda,
    valor_vendido: valor,
    forma_pagamento,
    fiado,
    data_acordada: fiado ? data_acordada : null,
    status_fiado: fiado ? 'pendente' : null,
    valor_pago: 0,
    pagamentos: []
  }
  saidas.push(nova)
  res.status(201).json(nova)
})

app.get('/api/saidas', (req, res) => {
  res.json(saidas)
})

// Registrar pagamento (total ou parcial) de uma venda fiado
app.post('/api/saidas/:id/pagamento', (req, res) => {
  const { data_pagamento, valor_pago } = req.body
  const saida = saidas.find(s => s.id === parseInt(req.params.id))
  if (!saida) return res.status(404).json({ error: 'Registro nao encontrado' })
  if (!saida.fiado) return res.status(400).json({ error: 'Esta venda nao e fiado' })
  if (saida.status_fiado === 'pago') return res.status(400).json({ error: 'Este fiado ja foi pago integralmente' })
  if (saida.status_fiado === 'devolvido') return res.status(400).json({ error: 'Este produto foi devolvido, nao ha pagamento pendente' })

  const valor = parseFloat(valor_pago)
  if (isNaN(valor) || valor <= 0) return res.status(400).json({ error: 'Valor pago invalido' })

  saida.pagamentos.push({ data: data_pagamento || new Date().toISOString().slice(0, 10), valor })
  saida.valor_pago = parseFloat((saida.valor_pago + valor).toFixed(2))

  saida.status_fiado = saida.valor_pago >= saida.valor_vendido - 0.009 ? 'pago' : 'parcial'

  res.json(saida)
})

app.get('/api/dashboard/stats', (req, res) => {
  const total = produtos.reduce((sum, p) => sum + (p.valor_custo * p.quantidade), 0)
  res.json({ totalProdutos: produtos.length, totalClientes: clientes.length, totalEstoque: total.toFixed(2) })
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' })
})

app.listen(PORT, () => {
  console.log('Servidor rodando na porta ' + PORT)
  console.log('Banco OK')
})