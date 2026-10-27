import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { formatarMoeda } from '../utils/formatters'
import { TIPOS_PRODUTO, TAMANHOS_POR_TIPO } from '../constants/produtoOpcoes'
import { API_URL } from '../config'
import { opcoesProduto } from '../utils/opcoesProduto'
import { compararTexto, ordenarClientes, ordenarProdutos } from '../utils/ordenacao'
import { useOrdenacao } from '../utils/useOrdenacao'

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
  // venda sendo corrigida (null = registrando uma nova)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({
    tipo: '',
    tamanho: '',
    produto_id: '',
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
      setProdutos(ordenarProdutos(resProd.data))
      setClientes(ordenarClientes(resCli.data))
      setSaidas(resSai.data)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // um item por produto cadastrado (pode haver descricoes repetidas com estoques diferentes)
  const descricoesDisponiveis = useMemo(
    () => opcoesProduto(produtos, form.tipo, form.tamanho),
    [produtos, form.tipo, form.tamanho]
  )

  const produtoSelecionado = useMemo(() => {
    if (!form.produto_id) return null
    return produtos.find(p => String(p.id) === form.produto_id) || null
  }, [produtos, form.produto_id])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'tipo') {
      // ao trocar o produto, tamanho e descricao selecionados podem nao existir mais nas opcoes
      setForm({ ...form, tipo: value, tamanho: '', produto_id: '' })
      return
    }
    if (name === 'tamanho') {
      setForm({ ...form, tamanho: value, produto_id: '' })
      return
    }
    setForm({ ...form, [name]: value })
  }

  const limparForm = () => {
    setForm({ tipo: '', tamanho: '', produto_id: '', quantidade: '', cliente_id: '', data: hoje(), valor_vendido: '', forma_pagamento: 'dinheiro', data_acordada: '' })
    setEditando(null)
  }

  // produto da venda ja excluido do cadastro: a correcao mantem o produto gravado na venda
  const produtoExcluido = editando && !editando.produto_id

  const iniciarEdicao = (s) => {
    const produto = produtos.find(p => p.id === s.produto_id)
    setEditando(s)
    setForm({
      tipo: produto?.tipo || '',
      tamanho: produto?.tamanho || '',
      produto_id: produto ? String(produto.id) : '',
      quantidade: s.quantidade ?? '',
      cliente_id: s.cliente_id ? String(s.cliente_id) : '',
      data: s.data || hoje(),
      valor_vendido: s.valor_vendido ?? '',
      forma_pagamento: s.forma_pagamento || 'dinheiro',
      data_acordada: s.data_acordada || ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const descreverVenda = (s) =>
    `${new Date(s.data + 'T00:00:00').toLocaleDateString('pt-BR')} — ${s.produto_nome}${descricaoVenda(s) ? ' ' + descricaoVenda(s) : ''} — ${s.cliente_nome} — ${s.quantidade} un. — ${formatarMoeda(s.valor_vendido)}`

  const excluirVenda = async (s) => {
    const aviso = s.fiado && s.valor_pago > 0 ? `\n\nATENCAO: os pagamentos ja registrados desse fiado (${formatarMoeda(s.valor_pago)}) tambem serao apagados.` : ''
    if (!window.confirm(`Excluir esta venda?\n\n${descreverVenda(s)}\n\nAs pecas voltam para o estoque.${aviso}`)) return
    try {
      await axios.delete(`${API_URL}/api/saidas/${s.id}`)
      if (editando?.id === s.id) limparForm()
      carregarDados()
      alert('Venda excluida! As pecas voltaram para o estoque.')
    } catch (error) {
      alert('Erro: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!produtoSelecionado && !produtoExcluido) {
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
    if (editando?.fiado && editando.valor_pago > 0 && form.forma_pagamento !== 'fiado' &&
      !window.confirm(`Essa venda tinha ${formatarMoeda(editando.valor_pago)} de pagamentos de fiado registrados. Ao trocar a forma de pagamento, esses pagamentos serao apagados. Continuar?`)) return
    const dados = {
      produto_id: produtoSelecionado ? produtoSelecionado.id : null,
      quantidade: form.quantidade,
      cliente_id: form.cliente_id,
      data: form.data,
      valor_vendido: form.valor_vendido,
      forma_pagamento: form.forma_pagamento,
      data_acordada: form.forma_pagamento === 'fiado' ? form.data_acordada : null
    }
    try {
      if (editando) {
        await axios.put(`${API_URL}/api/saidas/${editando.id}`, dados)
      } else {
        await axios.post(`${API_URL}/api/saidas`, dados)
      }
      limparForm()
      carregarDados()
      alert(editando ? 'Venda corrigida com sucesso!' : 'Saida registrada com sucesso!')
    } catch (error) {
      alert('Erro: ' + (error.response?.data?.error || error.message))
    }
  }

  const textoPagamento = (s) => {
    if (!s.fiado) return FORMAS_PAGAMENTO.find(f => f.value === s.forma_pagamento)?.label || s.forma_pagamento
    if (s.status_fiado === 'pago') return 'Fiado Pago'
    if (s.status_fiado === 'parcial') return 'Fiado Parcial'
    if (s.status_fiado === 'devolvido') return 'Fiado Devolvido'
    return 'Fiado Pendente'
  }

  const CORES_FIADO = { pago: 'green', parcial: '#c77700', devolvido: '#667eea' }
  const statusFiado = (s) => {
    if (!s.fiado) return textoPagamento(s)
    return <span style={{ color: CORES_FIADO[s.status_fiado] || 'red', fontWeight: 'bold' }}>{textoPagamento(s)}</span>
  }

  // vendas antigas sem descricao salva: pega do cadastro (se o produto ainda existir)
  const descricaoVenda = (s) =>
    s.produto_descricao ?? produtos.find(p => p.id === s.produto_id)?.descricao ?? ''

  // ordenacao do historico pelo cabecalho; padrao = mais recentes primeiro
  const porData = (a, b) => (a.data || '').localeCompare(b.data || '') || a.id - b.id
  const { ordenada: saidasOrdenadas, Cabecalho } = useOrdenacao([...saidas].sort((a, b) => porData(b, a)), {
    data: porData,
    produto: (a, b) => compararTexto(descricaoVenda(a), descricaoVenda(b)) || compararTexto(a.produto_nome, b.produto_nome),
    cliente: (a, b) => compararTexto(a.cliente_nome, b.cliente_nome),
    quantidade: (a, b) => a.quantidade - b.quantidade,
    valor: (a, b) => a.valor_vendido - b.valor_vendido,
    pagamento: (a, b) => compararTexto(textoPagamento(a), textoPagamento(b))
  }, { inicial: { coluna: 'data', asc: false }, descPrimeiro: ['data'] })

  return (
    <div className="page">
      <h2>📤 Registro de Vendas</h2>

      <div className="form-section">
        <h3>{editando ? 'Corrigir Venda' : 'Nova Saida (Venda)'}</h3>
        {editando && (
          <p style={{ fontSize: '13px', color: '#c77700', margin: '0 0 10px' }}>
            Corrigindo: {descreverVenda(editando)}
          </p>
        )}
        <form onSubmit={handleSubmit}>
          {produtoExcluido ? (
            <p style={{ fontSize: '13px', color: '#555', margin: '0 0 5px' }}>
              O cadastro desse produto foi excluido — a venda continua com <strong>{editando.produto_nome}</strong>.
            </p>
          ) : (<>
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

          <select name="produto_id" value={form.produto_id} onChange={handleChange} required disabled={!form.tamanho}>
            <option value="">
              {!form.tamanho
                ? 'Selecione o Tamanho primeiro'
                : descricoesDisponiveis.length > 0
                  ? 'Selecione a Descricao'
                  : 'Nenhum produto cadastrado para esse Tamanho'}
            </option>
            {descricoesDisponiveis.map(o => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>

          {produtoSelecionado && (
            <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: '#667eea', margin: '-5px 0 5px' }}>
              <span>Estoque atual: <strong>{produtoSelecionado.quantidade}</strong></span>
              <span>Valor de Custo: <strong>{formatarMoeda(produtoSelecionado.valor_custo)}</strong></span>
              <span>Valor de Venda Cadastrado: <strong>{formatarMoeda(produtoSelecionado.valor_venda)}</strong></span>
            </div>
          )}
          </>)}

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

          <button type="submit">{editando ? 'Salvar Correcao' : 'Registrar Saida'}</button>
          {editando && (
            <button type="button" onClick={limparForm} style={{ background: '#999' }}>Cancelar</button>
          )}
        </form>
      </div>

      <h3>Historico de Saidas ({saidas.length})</h3>
      {saidas.length > 0 ? (
        <div className="tabela-rolavel">
        <table className="movimentacoes-table">
          <thead>
            <tr>
              <Cabecalho coluna="data">Data</Cabecalho>
              <Cabecalho coluna="produto">Produto</Cabecalho>
              <Cabecalho coluna="cliente">Cliente</Cabecalho>
              <Cabecalho coluna="quantidade">Quantidade</Cabecalho>
              <Cabecalho coluna="valor">Valor Vendido</Cabecalho>
              <Cabecalho coluna="pagamento">Pagamento</Cabecalho>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {saidasOrdenadas.map(s => (
              <tr key={s.id}>
                <td>{new Date(s.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td>
                  {s.produto_nome}
                  {descricaoVenda(s) && <div style={{ fontSize: '12px', color: '#555' }}>{descricaoVenda(s)}</div>}
                </td>
                <td>{s.cliente_nome}</td>
                <td>{s.quantidade}</td>
                <td>{formatarMoeda(s.valor_vendido)}</td>
                <td>{statusFiado(s)}</td>
                <td>
                  <button onClick={() => iniciarEdicao(s)} style={{background: '#667eea', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>Editar</button>
                  <button onClick={() => excluirVenda(s)} style={{background: '#e53e3e', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '5px', cursor: 'pointer', marginLeft: '5px', marginTop: '4px'}}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      ) : (
        <p>Nenhuma saida registrada</p>
      )}
    </div>
  )
}

export default Saida
