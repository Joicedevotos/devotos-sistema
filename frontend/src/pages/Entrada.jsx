import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { TIPOS_PRODUTO, TAMANHOS_POR_TIPO } from '../constants/produtoOpcoes'
import { API_URL } from '../config'
import { opcoesProduto } from '../utils/opcoesProduto'
import { ordenarClientes, ordenarProdutos } from '../utils/ordenacao'

const hoje = () => new Date().toISOString().slice(0, 10)

const FORM_VAZIO = { tipo: '', tamanho: '', produto_id: '', quantidade: '', data: hoje(), subtipo: 'compra', cliente_id: '' }

function Entrada() {
  const [produtos, setProdutos] = useState([])
  const [clientes, setClientes] = useState([])
  const [entradas, setEntradas] = useState([])
  const [form, setForm] = useState(FORM_VAZIO)
  // entrada sendo corrigida (null = registrando uma nova)
  const [editando, setEditando] = useState(null)
  // produto da entrada ja excluido do cadastro: a correcao mantem o produto gravado
  const produtoExcluido = editando && !editando.produto_id

  const carregarDados = async () => {
    try {
      const [resProd, resCli, resEnt] = await Promise.all([
        axios.get(`${API_URL}/api/produtos`),
        axios.get(`${API_URL}/api/clientes`),
        axios.get(`${API_URL}/api/entradas`)
      ])
      setProdutos(ordenarProdutos(resProd.data))
      setClientes(ordenarClientes(resCli.data))
      setEntradas(resEnt.data)
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
    setForm(FORM_VAZIO)
    setEditando(null)
  }

  const iniciarEdicao = (entrada) => {
    const produto = produtos.find(p => p.id === entrada.produto_id)
    setEditando(entrada)
    setForm({
      tipo: produto?.tipo || '',
      tamanho: produto?.tamanho || '',
      produto_id: produto ? String(produto.id) : '',
      quantidade: entrada.quantidade ?? '',
      data: entrada.data || hoje(),
      subtipo: entrada.subtipo === 'devolucao' ? 'devolucao' : 'compra',
      cliente_id: entrada.cliente_id ? String(entrada.cliente_id) : ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // descricao da peca vem do cadastro (se o produto ainda existir)
  const descricaoEntrada = (e) => produtos.find(p => p.id === e.produto_id)?.descricao || ''

  const descreverEntrada = (e) =>
    `${new Date(e.data + 'T00:00:00').toLocaleDateString('pt-BR')} — ${e.subtipo === 'devolucao' ? 'Devolucao' : 'Compra'} — ${e.produto_nome}${descricaoEntrada(e) ? ' ' + descricaoEntrada(e) : ''} — ${e.quantidade} un.${e.cliente_nome ? ' — ' + e.cliente_nome : ''}`

  const excluirEntrada = async (entrada) => {
    const aviso = entrada.fiado_baixado ? '\n\nO fiado que essa devolucao tinha baixado volta a ficar em aberto.' : ''
    if (!window.confirm(`Excluir esta entrada?\n\n${descreverEntrada(entrada)}\n\nAs pecas saem do estoque.${aviso}`)) return
    try {
      await axios.delete(`${API_URL}/api/entradas/${entrada.id}`)
      if (editando?.id === entrada.id) limparForm()
      carregarDados()
      alert('Entrada excluida! O estoque foi ajustado.')
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
    if (form.subtipo === 'devolucao' && !form.cliente_id) {
      alert('Selecione o cliente que devolveu o produto')
      return
    }
    const dados = {
      produto_id: produtoSelecionado ? produtoSelecionado.id : null,
      quantidade: form.quantidade,
      data: form.data,
      subtipo: form.subtipo,
      cliente_id: form.subtipo === 'devolucao' ? form.cliente_id : null
    }
    try {
      const res = editando
        ? await axios.put(`${API_URL}/api/entradas/${editando.id}`, dados)
        : await axios.post(`${API_URL}/api/entradas`, dados)
      limparForm()
      carregarDados()
      const acao = editando ? 'Entrada corrigida' : 'Entrada registrada'
      if (res.data.fiado_baixado) {
        alert(`${acao}! Esse produto estava fiado com o cliente e o status foi atualizado para "Produto Devolvido".`)
      } else {
        alert(`${acao} com sucesso!`)
      }
    } catch (error) {
      alert('Erro: ' + (error.response?.data?.error || error.message))
    }
  }

  return (
    <div className="page">
      <h2>📥 Entrada/Devolução para Estoque</h2>

      <div className="form-section">
        <h3>{editando ? 'Corrigir Entrada' : 'Nova Entrada'}</h3>
        {editando && (
          <p style={{ fontSize: '13px', color: '#c77700', margin: '0 0 10px' }}>
            Corrigindo: {descreverEntrada(editando)}
          </p>
        )}
        <form onSubmit={handleSubmit}>
          {produtoExcluido ? (
            <p style={{ fontSize: '13px', color: '#555', margin: '0 0 5px' }}>
              O cadastro desse produto foi excluido — a entrada continua com <strong>{editando.produto_nome}</strong>.
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
            <p style={{ fontSize: '13px', color: '#667eea', margin: '-5px 0 5px' }}>
              Selecionado: <strong>{produtoSelecionado.nome}</strong> (estoque atual: {produtoSelecionado.quantidade})
            </p>
          )}
          </>)}

          <input type="date" name="data" value={form.data} onChange={handleChange} required />

          <select name="subtipo" value={form.subtipo} onChange={handleChange}>
            <option value="compra">Compra de novo estoque</option>
            <option value="devolucao">Devolucao de peca para estoque</option>
          </select>

          {form.subtipo === 'devolucao' && (
            <select name="cliente_id" value={form.cliente_id} onChange={handleChange} required>
              <option value="">Selecione o cliente que devolveu</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          )}

          <input type="number" name="quantidade" placeholder="Quantidade" value={form.quantidade} onChange={handleChange} required min="1" />

          <button type="submit">{editando ? 'Salvar Correcao' : 'Registrar Entrada'}</button>
          {editando && (
            <button type="button" onClick={limparForm} style={{ background: '#999' }}>Cancelar</button>
          )}
        </form>
      </div>

      <h3>Historico de Entradas ({entradas.length})</h3>
      {entradas.length > 0 ? (
        <div className="tabela-rolavel">
        <table className="movimentacoes-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Produto</th>
              <th>Tipo</th>
              <th>Cliente (devolucao)</th>
              <th>Quantidade</th>
              <th>Observacao</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {[...entradas].reverse().map(e => (
              <tr key={e.id}>
                <td>{new Date(e.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td>
                  {e.produto_nome}
                  {descricaoEntrada(e) && <div style={{ fontSize: '12px', color: '#555' }}>{descricaoEntrada(e)}</div>}
                </td>
                <td>{e.subtipo === 'devolucao' ? 'Devolucao' : 'Compra'}</td>
                <td>{e.cliente_nome || '-'}</td>
                <td>{e.quantidade}</td>
                <td>
                  {e.fiado_baixado ? (
                    <span style={{ color: '#667eea', fontWeight: 'bold' }}>Fiado baixado</span>
                  ) : '-'}
                </td>
                <td>
                  <button onClick={() => iniciarEdicao(e)} style={{background: '#667eea', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>Editar</button>
                  <button onClick={() => excluirEntrada(e)} style={{background: '#e53e3e', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '5px', cursor: 'pointer', marginLeft: '5px', marginTop: '4px'}}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      ) : (
        <p>Nenhuma entrada registrada</p>
      )}
    </div>
  )
}

export default Entrada
