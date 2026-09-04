import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Produtos from './pages/Produtos'
import Clientes from './pages/Clientes'
import Entrada from './pages/Entrada'
import Saida from './pages/Saida'
import HistoricoClientes from './pages/HistoricoClientes'
import Fiado from './pages/Fiado'
import FiltroEstoque from './pages/FiltroEstoque'

const PAGINAS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'produtos', label: 'Produtos', icon: '📦' },
  { id: 'clientes', label: 'Clientes', icon: '👥' },
  { id: 'entrada', label: 'Entrada/Devolução para Estoque', iconLabel: 'Entrada', icon: '📥' },
  { id: 'saida', label: 'Registro de Vendas', iconLabel: 'Vendas', icon: '📤' },
  { id: 'historico', label: 'Histórico Clientes', iconLabel: 'Histórico', icon: '🧾' },
  { id: 'fiado', label: 'Fiado', icon: '💳' },
  { id: 'filtro-estoque', label: 'Filtro no Estoque', iconLabel: 'Filtro', icon: '🔍' },
]

// No menu inferior (estilo app) só cabem poucos itens — o resto vai no "Mais"
const ABAS_PRINCIPAIS = ['dashboard', 'saida', 'fiado', 'clientes']

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [menuMaisAberto, setMenuMaisAberto] = useState(false)

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }, [token])

  const irPara = (pagina) => {
    setCurrentPage(pagina)
    setMenuMaisAberto(false)
  }

  const handleLogin = (newToken, userData) => {
    setToken(newToken)
    setUser(userData)
    localStorage.setItem('token', newToken)
  }

  const handleLogout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
  }

  if (!token) {
    return <Login onLogin={handleLogin} />
  }

  const paginasSecundarias = PAGINAS.filter(p => !ABAS_PRINCIPAIS.includes(p.id))

  return (
    <div className="app-container">
      {/* MENU LATERAL (telas grandes) */}
      <nav className="sidebar">
        <div className="logo">
          <h2>🙏 Devotos</h2>
        </div>

        {PAGINAS.map(p => (
          <button
            key={p.id}
            className={`menu-item ${currentPage === p.id ? 'active' : ''}`}
            onClick={() => irPara(p.id)}
          >
            {p.icon} {p.label}
          </button>
        ))}

        <button className="menu-item logout" onClick={handleLogout}>
          🚪 Sair
        </button>
      </nav>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="content">
        {/* Cabeçalho estilo app (celular) */}
        <header className="app-topbar">
          <span className="app-topbar-title">🙏 Devotos</span>
          <button className="app-topbar-avatar" onClick={handleLogout} title="Sair">
            {user?.username?.[0]?.toUpperCase() || '👤'}
          </button>
        </header>

        {/* Cabeçalho desktop */}
        <header className="top-bar">
          <h1>🙏 Loja Devotos</h1>
          <p>Bem-vindo, <strong>{user?.username}</strong>!</p>
        </header>

        <div className="page-content">
          {currentPage === 'dashboard' && <Dashboard />}
          {currentPage === 'produtos' && <Produtos />}
          {currentPage === 'clientes' && <Clientes />}
          {currentPage === 'entrada' && <Entrada />}
          {currentPage === 'saida' && <Saida />}
          {currentPage === 'historico' && <HistoricoClientes />}
          {currentPage === 'fiado' && <Fiado />}
          {currentPage === 'filtro-estoque' && <FiltroEstoque />}
        </div>
      </main>

      {/* MENU INFERIOR estilo app (celular) */}
      <nav className="bottom-nav no-print">
        {ABAS_PRINCIPAIS.map(id => {
          const p = PAGINAS.find(pg => pg.id === id)
          return (
            <button
              key={p.id}
              className={`bottom-nav-item ${currentPage === p.id ? 'active' : ''}`}
              onClick={() => irPara(p.id)}
            >
              <span className="bottom-nav-icon">{p.icon}</span>
              <span className="bottom-nav-label">{p.iconLabel || p.label}</span>
            </button>
          )
        })}
        <button
          className={`bottom-nav-item ${menuMaisAberto ? 'active' : ''}`}
          onClick={() => setMenuMaisAberto(m => !m)}
        >
          <span className="bottom-nav-icon">☰</span>
          <span className="bottom-nav-label">Mais</span>
        </button>
      </nav>

      {/* PAINEL "MAIS" (celular) */}
      {menuMaisAberto && (
        <div className="mais-overlay no-print" onClick={() => setMenuMaisAberto(false)}>
          <div className="mais-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mais-sheet-handle" />
            {paginasSecundarias.map(p => (
              <button
                key={p.id}
                className={`mais-sheet-item ${currentPage === p.id ? 'active' : ''}`}
                onClick={() => irPara(p.id)}
              >
                <span className="bottom-nav-icon">{p.icon}</span> {p.label}
              </button>
            ))}
            <button className="mais-sheet-item mais-sheet-logout" onClick={handleLogout}>
              🚪 Sair
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App