import React, { useState } from 'react'
import axios from 'axios'
import { API_URL } from '../config'

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        username,
        password
      })

      if (response.data.success) {
        onLogin(response.data.token, response.data.user)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>🙏 Loja Devotos</h1>
      <p>Sistema de Controle de Estoque</p>
      <form onSubmit={handleLogin} style={{ maxWidth: '300px', margin: '2rem auto' }}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Usuário"
          style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
          disabled={loading}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
          disabled={loading}
        />
        {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}
        <button type="submit" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}

export default Login