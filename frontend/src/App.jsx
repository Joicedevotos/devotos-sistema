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

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [currentPage, setCurrentPage] = useState('dashboard')

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }, [token])

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

  return (
    <div className="app-container">
      {/* MENU LATERAL */}
      <nav className="sidebar">
        <div className="logo">
          <h2>🙏 Devotos</h2>
        </div>
        
        <button 
          className={`menu-item ${currentPage === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentPage('dashboard')}
        >
          📊 Dashboard
        </button>

        <button 
          className={`menu-item ${currentPage === 'produtos' ? 'active' : ''}`}
          onClick={() => setCurrentPage('produtos')}
        >
          📦 Produtos
        </button>

        <button 
          className={`menu-item ${currentPage === 'clientes' ? 'active' : ''}`}
          onClick={() => setCurrentPage('clientes')}
        >
          👥 Clientes
        </button>

        <button
          className={`menu-item ${currentPage === 'entrada' ? 'active' : ''}`}
          onClick={() => setCurrentPage('entrada')}
        >
          📥 Entrada/Devolução para Estoque
        </button>

        <button
          className={`menu-item ${currentPage === 'saida' ? 'active' : ''}`}
          onClick={() => setCurrentPage('saida')}
        >
          📤 Registro de Vendas
        </button>

        <button
          className={`menu-item ${currentPage === 'historico' ? 'active' : ''}`}
          onClick={() => setCurrentPage('historico')}
        >
          🧾 Histórico Clientes
        </button>

        <button
          className={`menu-item ${currentPage === 'fiado' ? 'active' : ''}`}
          onClick={() => setCurrentPage('fiado')}
        >
          💳 Fiado
        </button>

        <button
          className={`menu-item ${currentPage === 'filtro-estoque' ? 'active' : ''}`}
          onClick={() => setCurrentPage('filtro-estoque')}
        >
          🔍 Filtro no Estoque
        </button>

        <button className="menu-item logout" onClick={handleLogout}>
          🚪 Sair
        </button>
      </nav>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="content">
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
    </div>
  )
}

export default App