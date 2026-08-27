import express from 'express'

const router = express.Router()

// GET - Listar todos os clientes
router.get('/', async (req, res) => {
  try {
    const customers = [
      {
        id: 1,
        name: 'João Silva',
        cpf: '123.456.789-00',
        phone: '(16) 99999-9999',
        email: 'joao@email.com',
        birthday: '1990-05-15'
      },
      {
        id: 2,
        name: 'Maria Santos',
        cpf: '987.654.321-00',
        phone: '(16) 98888-8888',
        email: 'maria@email.com',
        birthday: '1992-08-20'
      }
    ]
    res.json(customers)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar clientes' })
  }
})

// GET - Aniversariantes da semana
router.get('/birthdays/week', async (req, res) => {
  try {
    const birthdays = []
    res.json(birthdays)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter aniversariantes' })
  }
})

// POST - Criar novo cliente
router.post('/', async (req, res) => {
  try {
    res.json({ success: true, message: 'Cliente criado com sucesso!' })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar cliente' })
  }
})

export default router