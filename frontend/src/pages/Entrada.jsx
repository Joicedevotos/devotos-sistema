import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { API_URL } from '../config'

const hoje = () => new Date().toISOString().slice(0, 10)

function Entrada() {
  const [produtos, setProdutos] = useState([])
  const [clientes, setClientes] = useState([])
  const [entradas, setEntradas] = useState([])
  const [buscaProduto, setBuscaProduto] = useState('')
  const [produtoSelecionado, setProdutoSelecionado] = useState(null)
  const [form, setForm] = useState({ quantidade: '', data: hoje(), subtipo: 'compra', cliente_id: '' })

  const carregarDados = async () => {
    try {
      const [resProd, resCli, resEnt] = await Promise.all([
        axios.get(`${API_URL}/api/produtos`),
        axios.get(`${API_URL}/api/clientes`),
        axios.get(`${API_URL}/api/entradas`)
      ])
      setProdutos(resProd.data)
      setClientes(resCli.data)
      setEntradas(resEnt.data)
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
    setForm({ quantidade: '', data: hoje(), subtipo: 'compra', cliente_id: '' })
    setBuscaProduto('')
    setProdutoSelecionado(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!produtoSelecionado) {
      alert('Selecione um produto valido pelo nome ou codigo de barras')
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
          <input
            type="text"
            list="produtos-entrada"
            placeholder="Buscar produto por nome ou codigo de barras"
            value={buscaProduto}
            onChange={handleBuscaProduto}
            required
          />
          <datalist id="produtos-entrada">
            {produtos.map(p => (
              <option key={p.id} value={labelProduto(p)} />
            ))}
          </datalist>

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
