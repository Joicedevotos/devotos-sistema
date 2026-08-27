import express from 'express'
import { generateToken } from '../middleware/auth.js'

const router = express.Router()

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuário e senha obrigatórios' })
    }

    // Validação simples para teste
    if (username === 'admin' && password === 'admin123') {
      const token = generateToken(1, username)

      res.json({
        success: true,
        token,
        user: {
          id: 1,
          username: username
        }
      })
    } else {
      res.status(401).json({ error: 'Usuário ou senha incorretos' })
    }
  } catch (error) {
    console.error('Erro no login:', error)
    res.status(500).json({ error: 'Erro ao fazer login' })
  }
})

export default router