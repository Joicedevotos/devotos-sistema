import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { formatarMoeda } from '../utils/formatters'

const API_URL = 'http://localhost:5000'
const hoje = () => new Date().toISOString().slice(0, 10)

function HistoricoClientes() {
  const [clientes, setClientes] = useState([])
  const [saidas, setSaidas] = useState([])
  const [pagamentoAberto, setPagamentoAberto] = useState(null)
  const [pagamentoForm, setPagamentoForm] = useState({ data_pagamento: hoje(), valor_pago: '' })
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState('')

  const carregarDados = async () => {
    try {
      const [resCli, resSai] = await Promise.all([
        axios.get(`${API_URL}/api/clientes`),
        axios.get(`${API_URL}/api/saidas`)
      ])
      setClientes(resCli.data)
      setSaidas(resSai.data)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const abrirPagamento = (saidaId) => {
    setPagamentoAberto(saidaId)
    setPagamentoForm({ data_pagamento: hoje(), valor_pago: '' })
  }

  const cancelarPagamento = () => {
    setPagamentoAberto(null)
    setPagamentoForm({ data_pagamento: hoje(), valor_pago: '' })
  }

  const confirmarPagamento = async (saidaId) => {
    if (!pagamentoForm.valor_pago || parseFloat(pagamentoForm.valor_pago) <= 0) {
      alert('Informe um valor pago valido')
      return
    }
    try {
      await axios.post(`${API_URL}/api/saidas/${saidaId}/pagamento`, pagamentoForm)
      cancelarPagamento()
      carregarDados()
      alert('Pagamento registrado!')
    } catch (error) {
      alert('Erro: ' + (error.response?.data?.error || error.message))
    }
  }

  const grupos = clientes
    .map(cliente => {
      const compras = saidas.filter(s => s.cliente_id === cliente.id)
      const totalQuantidade = compras.reduce((sum, s) => sum + s.quantidade, 0)
      const totalValor = compras.reduce((sum, s) => sum + s.valor_vendido, 0)

      const produtosMap = {}
      compras.forEach(s => {
        if (!produtosMap[s.produto_id]) produtosMap[s.produto_id] = { nome: s.produto_nome, quantidade: 0 }
        produtosMap[s.produto_id].quantidade += s.quantidade
      })

      return { cliente, compras, totalQuantidade, totalValor, produtosComprados: Object.values(produtosMap) }
    })

  const grupoSelecionado = clienteSelecionadoId
    ? grupos.find(g => g.cliente.id === parseInt(clienteSelecionadoId) && g.compras.length > 0)
    : null

  return (
    <div className="page">
      <h2>🧾 Historico de Compras por Cliente</h2>

      <div className="form-section">
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333' }}>
          Selecione o cliente
        </label>
        <select value={clienteSelecionadoId} onChange={(e) => setClienteSelecionadoId(e.target.value)}>
          <option value="">Selecione um cliente cadastrado</option>
          {clientes.map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      {!clienteSelecionadoId && <p>Selecione um cliente acima para ver o historico de compras</p>}

      {clienteSelecionadoId && !grupoSelecionado && (
        <p>Nenhuma compra registrada para este cliente ainda</p>
      )}

      {grupoSelecionado && [grupoSelecionado].map(({ cliente, compras, totalQuantidade, totalValor, produtosComprados }) => (
        <div key={cliente.id} className="form-section">
          <h3>{cliente.nome}</h3>
          <p style={{ marginBottom: '10px', color: '#555' }}>
            Total de itens comprados: <strong>{totalQuantidade}</strong> &nbsp;|&nbsp;
            Valor total: <strong>{formatarMoeda(totalValor)}</strong>
          </p>

          <p style={{ marginBottom: '10px', fontSize: '14px', color: '#555' }}>
            Produtos comprados:{' '}
            {produtosComprados.map((p, i) => (
              <span key={i}>
                {p.nome} (x{p.quantidade}){i < produtosComprados.length - 1 ? ', ' : ''}
              </span>
            ))}
          </p>

          <table className="movimentacoes-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Quantidade</th>
                <th>Valor</th>
                <th>Forma Pagamento</th>
                <th>Data / Status</th>
                <th>Acao</th>
              </tr>
            </thead>
            <tbody>
              {[...compras].reverse().map(s => {
                const emAberto = s.fiado && (s.status_fiado === 'pendente' || s.status_fiado === 'parcial')
                const restante = s.valor_vendido - s.valor_pago
                return (
                  <tr key={s.id}>
                    <td>{s.produto_nome}</td>
                    <td>{s.quantidade}</td>
                    <td>
                      {s.fiado ? (
                        s.status_fiado === 'devolvido' ? (
                          <span style={{ color: '#667eea', fontWeight: 'bold' }}>Produto Devolvido</span>
                        ) : s.status_fiado === 'pago' ? (
                          <span style={{ color: 'green', fontWeight: 'bold' }}>{formatarMoeda(s.valor_vendido)} (pago)</span>
                        ) : s.status_fiado === 'parcial' ? (
                          <span>
                            Pago: {formatarMoeda(s.valor_pago)}<br />
                            <span style={{ color: 'red', fontWeight: 'bold' }}>Resta: {formatarMoeda(restante)}</span>
                          </span>
                        ) : (
                          <span style={{ color: 'red', fontWeight: 'bold' }}>{formatarMoeda(s.valor_vendido)}</span>
                        )
                      ) : (
                        <span>{formatarMoeda(s.valor_vendido)}</span>
                      )}
                    </td>
                    <td>{s.fiado ? 'Fiado' : s.forma_pagamento}</td>
                    <td>
                      {s.fiado ? (
                        <>
                          Acordado: {new Date(s.data_acordada + 'T00:00:00').toLocaleDateString('pt-BR')}
                          {s.status_fiado === 'pago' && <div style={{ color: 'green' }}>Fiado Pago</div>}
                          {s.status_fiado === 'parcial' && <div style={{ color: '#c77700' }}>Fiado Parcial</div>}
                          {s.status_fiado === 'devolvido' && <div style={{ color: '#667eea' }}>Produto Devolvido</div>}
                        </>
                      ) : (
                        new Date(s.data + 'T00:00:00').toLocaleDateString('pt-BR')
                      )}
                    </td>
                    <td>
                      {emAberto ? (
                        pagamentoAberto === s.id ? (
                          <div style={{ display: 'grid', gap: '5px', minWidth: '160px' }}>
                            <input
                              type="date"
                              value={pagamentoForm.data_pagamento}
                              onChange={(e) => setPagamentoForm({ ...pagamentoForm, data_pagamento: e.target.value })}
                            />
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Valor Pago"
                              value={pagamentoForm.valor_pago}
                              onChange={(e) => setPagamentoForm({ ...pagamentoForm, valor_pago: e.target.value })}
                            />
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <button type="button" onClick={() => confirmarPagamento(s.id)}>Confirmar</button>
                              <button
                                type="button"
                                onClick={cancelarPagamento}
                                style={{ background: '#999' }}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button type="button" onClick={() => abrirPagamento(s.id)}>
                            Registrar Pagamento
                          </button>
                        )
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

export default HistoricoClientes
