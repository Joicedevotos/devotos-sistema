import React, { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = 'http://localhost:5000'

function Fiado() {
  const [saidas, setSaidas] = useState([])

  const carregarDados = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/saidas`)
      setSaidas(res.data)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const fiadosEmAberto = saidas
    .filter(s => s.fiado && (s.status_fiado === 'pendente' || s.status_fiado === 'parcial'))
    .map(s => ({ ...s, valor_aberto: s.valor_vendido - s.valor_pago }))
    .sort((a, b) => new Date(a.data_acordada) - new Date(b.data_acordada))

  const totalEmAberto = fiadosEmAberto.reduce((sum, s) => sum + s.valor_aberto, 0)

  return (
    <div className="page">
      <h2>💳 Fiado</h2>

      <div className="form-section">
        <p style={{ color: '#555' }}>
          Total em aberto (fiado): <strong style={{ color: 'red' }}>R$ {totalEmAberto.toFixed(2)}</strong>
        </p>
      </div>

      {fiadosEmAberto.length > 0 ? (
        <table className="movimentacoes-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Produto</th>
              <th>Valor em Aberto</th>
              <th>Data Acordada</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {fiadosEmAberto.map(s => (
              <tr key={s.id}>
                <td>{s.cliente_nome}</td>
                <td>{s.produto_nome} (x{s.quantidade})</td>
                <td style={{ color: 'red', fontWeight: 'bold' }}>R$ {s.valor_aberto.toFixed(2)}</td>
                <td>{new Date(s.data_acordada + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td>{s.status_fiado === 'parcial' ? 'Parcial (pago R$ ' + s.valor_pago.toFixed(2) + ')' : 'Pendente'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Nenhum fiado em aberto no momento</p>
      )}
    </div>
  )
}

export default Fiado
