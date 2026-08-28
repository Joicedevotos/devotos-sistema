import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { formatarMoeda } from '../utils/formatters'

const API_URL = 'http://localhost:5000'
const hoje = () => new Date().toISOString().slice(0, 10)

const FORMAS_PAGAMENTO = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'debito', label: 'Cartao de Debito' },
  { value: 'credito', label: 'Cartao de Credito' },
  { value: 'fiado', label: 'Fiado' }
]

function Saida() {
  const [produtos, setProdutos] = useState([])
  const [clientes, setClientes] = useState([])
  const [saidas, setSaidas] = useState([])
  const [buscaProduto, setBuscaProduto] = useState('')
  const [produtoSelecionado, setProdutoSelecionado] = useState(null)
  const [form, setForm] = useState({
    quantidade: '',
    cliente_id: '',
    data: hoje(),
    valor_vendido: '',
    forma_pagamento: 'dinheiro',
    data_acordada: ''
  })

  const carregarDados = async () => {
    try {
      const [resProd, resCli, resSai] = await Promise.all([
        axios.get(`${API_URL}/api/produtos`),
        axios.get(`${API_URL}/api/clientes`),
        axios.get(`${API_URL}/api/saidas`)
      ])
      setProdutos(resProd.data)
      setClientes(resCli.data)
      setSaidas(resSai.data)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const labelProduto = (p) => `${p.nome} - ${p.codigo_barras || 'sem codigo'}`

  const handleBuscaProduto = (e) => {
    const texto = e.target.value
    setBuscaProduto(texto)
    const encontrado = produtos.find(p => labelProduto(p) === texto)
      || produtos.find(p => p.codigo_barras && p.codigo_barras === texto)
      || produtos.find(p => p.nome.toLowerCase() === texto.toLowerCase())
    setProdutoSelecionado(encontrado || null)
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const limparForm = () => {
    setForm({ quantidade: '', cliente_id: '', data: hoje(), valor_vendido: '', forma_pagamento: 'dinheiro', data_acordada: '' })
    setBuscaProduto('')
    setProdutoSelecionado(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!produtoSelecionado) {
      alert('Selecione um produto valido pelo nome ou codigo de barras')
      return
    }
    if (!form.cliente_id) {
      alert('Selecione o cliente comprador')
      return
    }
    if (form.forma_pagamento === 'fiado' && !form.data_acordada) {
      alert('Informe a data acordada para pagamento do fiado')
      return
    }
    try {
      await axios.post(`${API_URL}/api/saidas`, {
        produto_id: produtoSelecionado.id,
        quantidade: form.quantidade,
        cliente_id: form.cliente_id,
        data: form.data,
        valor_vendido: form.valor_vendido,
        forma_pagamento: form.forma_pagamento,
        data_acordada: form.forma_pagamento === 'fiado' ? form.data_acordada : null
      })
      limparForm()
      carregarDados()
      alert('Saida registrada com sucesso!')
    } catch (error) {
      alert('Erro: ' + (error.response?.data?.error || error.message))
    }
  }

  const statusFiado = (s) => {
    if (!s.fiado) return FORMAS_PAGAMENTO.find(f => f.value === s.forma_pagamento)?.label || s.forma_pagamento
    if (s.status_fiado === 'pago') return <span style={{ color: 'green', fontWeight: 'bold' }}>Fiado Pago</span>
    if (s.status_fiado === 'parcial') return <span style={{ color: '#c77700', fontWeight: 'bold' }}>Fiado Parcial</span>
    return <span style={{ color: 'red', fontWeight: 'bold' }}>Fiado Pendente</span>
  }

  return (
    <div className="page">
      <h2>📤 Registro de Vendas</h2>

      <div className="form-section">
        <h3>Nova Saida (Venda)</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            list="produtos-saida"
            placeholder="Buscar produto por nome ou codigo de barras"
            value={buscaProduto}
            onChange={handleBuscaProduto}
            required
          />
          <datalist id="produtos-saida">
            {produtos.map(p => (
              <option key={p.id} value={labelProduto(p)} />
            ))}
          </datalist>

          {produtoSelecionado && (
            <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: '#667eea', margin: '-5px 0 5px' }}>
              <span>Estoque atual: <strong>{produtoSelecionado.quantidade}</strong></span>
              <span>Valor de Custo: <strong>{formatarMoeda(produtoSelecionado.valor_custo)}</strong></span>
              <span>Valor de Venda Cadastrado: <strong>{formatarMoeda(produtoSelecionado.valor_venda)}</strong></span>
            </div>
          )}

          <select name="cliente_id" value={form.cliente_id} onChange={handleChange} required>
            <option value="">Selecione o cliente comprador</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#333' }}>
              Data da Venda
            </label>
            <input type="date" name="data" value={form.data} onChange={handleChange} required />
          </div>

          <input type="number" name="quantidade" placeholder="Quantidade" value={form.quantidade} onChange={handleChange} required min="1" />

          <input type="number" step="0.01" name="valor_vendido" placeholder="Valor Vendido para o Cliente" value={form.valor_vendido} onChange={handleChange} required />

          <select name="forma_pagamento" value={form.forma_pagamento} onChange={handleChange}>
            {FORMAS_PAGAMENTO.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>

          {form.forma_pagamento === 'fiado' && (
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#333' }}>
                Data Acordada para Pagamento
              </label>
              <input type="date" name="data_acordada" value={form.data_acordada} onChange={handleChange} required />
            </div>
          )}

          <button type="submit">Registrar Saida</button>
        </form>
      </div>

      <h3>Historico de Saidas ({saidas.length})</h3>
      {saidas.length > 0 ? (
        <table className="movimentacoes-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Produto</th>
              <th>Cliente</th>
              <th>Quantidade</th>
              <th>Valor Vendido</th>
              <th>Pagamento</th>
            </tr>
          </thead>
          <tbody>
            {[...saidas].reverse().map(s => (
              <tr key={s.id}>
                <td>{new Date(s.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td>{s.produto_nome}</td>
                <td>{s.cliente_nome}</td>
                <td>{s.quantidade}</td>
                <td>{formatarMoeda(s.valor_vendido)}</td>
                <td>{statusFiado(s)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Nenhuma saida registrada</p>
      )}
    </div>
  )
}

export default Saida
