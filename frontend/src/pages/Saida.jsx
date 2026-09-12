import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { formatarMoeda } from '../utils/formatters'
import { TIPOS_PRODUTO, TAMANHOS_POR_TIPO } from '../constants/produtoOpcoes'
import { API_URL } from '../config'

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
  const [form, setForm] = useState({
    tipo: '',
    tamanho: '',
    descricao: '',
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

  // descricoes disponiveis = dos produtos ja cadastrados que batem com o Produto + Tamanho escolhidos
  const descricoesDisponiveis = useMemo(() => {
    if (!form.tipo || !form.tamanho) return []
    return produtos
      .filter(p => p.tipo === form.tipo && p.tamanho === form.tamanho)
      .map(p => (p.descricao || '').trim())
      .filter((d, i, arr) => arr.indexOf(d) === i)
  }, [produtos, form.tipo, form.tamanho])

  const produtoSelecionado = useMemo(() => {
    if (!form.tipo || !form.tamanho || !form.descricao) return null
    return produtos.find(p =>
      p.tipo === form.tipo &&
      p.tamanho === form.tamanho &&
      (p.descricao || '').trim() === form.descricao
    ) || null
  }, [produtos, form.tipo, form.tamanho, form.descricao])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'tipo') {
      // ao trocar o produto, tamanho e descricao selecionados podem nao existir mais nas opcoes
      setForm({ ...form, tipo: value, tamanho: '', descricao: '' })
      return
    }
    if (name === 'tamanho') {
      setForm({ ...form, tamanho: value, descricao: '' })
      return
    }
    setForm({ ...form, [name]: value })
  }

  const limparForm = () => {
    setForm({ tipo: '', tamanho: '', descricao: '', quantidade: '', cliente_id: '', data: hoje(), valor_vendido: '', forma_pagamento: 'dinheiro', data_acordada: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!produtoSelecionado) {
      alert('Selecione o Produto, o Tamanho e a Descricao')
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
          <select name="tipo" value={form.tipo} onChange={handleChange} required>
            <option value="">Selecione o Produto</option>
            {TIPOS_PRODUTO.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select name="tamanho" value={form.tamanho} onChange={handleChange} required disabled={!form.tipo}>
            <option value="">{form.tipo ? 'Selecione o Tamanho' : 'Selecione o Produto primeiro'}</option>
            {(TAMANHOS_POR_TIPO[form.tipo] || []).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select name="descricao" value={form.descricao} onChange={handleChange} required disabled={!form.tamanho}>
            <option value="">
              {!form.tamanho
                ? 'Selecione o Tamanho primeiro'
                : descricoesDisponiveis.length > 0
                  ? 'Selecione a Descricao'
                  : 'Nenhum produto cadastrado para esse Tamanho'}
            </option>
            {descricoesDisponiveis.map(d => (
              <option key={d} value={d}>{d || '(sem descricao)'}</option>
            ))}
          </select>

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
