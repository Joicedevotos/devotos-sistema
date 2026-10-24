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
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!produtoSelecionado) {
      alert('Selecione o Produto, o Tamanho e a Descricao')
      return
    }
    if (form.subtipo === 'devolucao' && !form.cliente_id) {
      alert('Selecione o cliente que devolveu o produto')
      return
    }
    try {
      const res = await axios.post(`${API_URL}/api/entradas`, {
        produto_id: produtoSelecionado.id,
        quantidade: form.quantidade,
        data: form.data,
        subtipo: form.subtipo,
        cliente_id: form.subtipo === 'devolucao' ? form.cliente_id : null
      })
      limparForm()
      carregarDados()
      if (res.data.fiado_baixado) {
        alert('Entrada registrada! Esse produto estava fiado com o cliente e o status foi atualizado para "Produto Devolvido".')
      } else {
        alert('Entrada registrada com sucesso!')
      }
    } catch (error) {
      alert('Erro: ' + (error.response?.data?.error || error.message))
    }
  }

  return (
    <div className="page">
      <h2>📥 Entrada/Devolução para Estoque</h2>

      <div className="form-section">
        <h3>Nova Entrada</h3>
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

          <button type="submit">Registrar Entrada</button>
        </form>
      </div>

      <h3>Historico de Entradas ({entradas.length})</h3>
      {entradas.length > 0 ? (
        <table className="movimentacoes-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Produto</th>
              <th>Tipo</th>
              <th>Cliente (devolucao)</th>
              <th>Quantidade</th>
              <th>Observacao</th>
            </tr>
          </thead>
          <tbody>
            {[...entradas].reverse().map(e => (
              <tr key={e.id}>
                <td>{new Date(e.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td>{e.produto_nome}</td>
                <td>{e.subtipo === 'devolucao' ? 'Devolucao' : 'Compra'}</td>
                <td>{e.cliente_nome || '-'}</td>
                <td>{e.quantidade}</td>
                <td>
                  {e.fiado_baixado ? (
                    <span style={{ color: '#667eea', fontWeight: 'bold' }}>Fiado baixado</span>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Nenhuma entrada registrada</p>
      )}
    </div>
  )
}

export default Entrada
