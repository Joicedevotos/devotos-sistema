import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { formatarMoeda } from '../utils/formatters'

const API_URL = 'http://localhost:5000'

function Dashboard() {
  const [aniversariantesSemana, setAniversariantesSemana] = useState([])
  const [aniversariantesMes, setAniversariantesMes] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      const [resSemana, resMes, resStats] = await Promise.all([
        axios.get(`${API_URL}/api/clientes/aniversariantes`),
        axios.get(`${API_URL}/api/clientes/aniversariantes-mes`),
        axios.get(`${API_URL}/api/dashboard/stats`)
      ])
      setAniversariantesSemana(resSemana.data)
      setAniversariantesMes(resMes.data)
      setStats(resStats.data)

      setLoading(false)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setLoading(false)
    }
  }

  const formatarData = (data) => {
    if (!data) return ''
    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  if (loading) return <div className="page">Carregando...</div>

  return (
    <div className="page">
      <h2>📊 Dashboard</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>📦 Produtos</h3>
          <p className="stat-number">{stats.totalProdutos || 0}</p>
        </div>
        <div className="stat-card">
          <h3>👥 Clientes</h3>
          <p className="stat-number">{stats.totalClientes || 0}</p>
        </div>
        <div className="stat-card">
          <h3>💰 Total Estoque (custo)</h3>
          <p className="stat-number">{formatarMoeda(stats.totalEstoque || 0)}</p>
        </div>
      </div>

      <h3>🎂 Aniversariantes da Semana</h3>
      {aniversariantesSemana.length > 0 ? (
        <ul className="aniversariantes-list">
          {aniversariantesSemana.map(cliente => (
            <li key={cliente.id}>
              <strong>{cliente.nome}</strong> - {formatarData(cliente.data_aniversario)}
            </li>
          ))}
        </ul>
      ) : (
        <p>Nenhum aniversariante esta semana</p>
      )}

      <h3 style={{ marginTop: '25px' }}>📅 Aniversariantes do Mes</h3>
      {aniversariantesMes.length > 0 ? (
        <ul className="aniversariantes-list">
          {aniversariantesMes.map(cliente => (
            <li key={cliente.id}>
              <strong>{cliente.nome}</strong> - {formatarData(cliente.data_aniversario)}
            </li>
          ))}
        </ul>
      ) : (
        <p>Nenhum aniversariante neste mes</p>
      )}
    </div>
  )
}

export default Dashboard
