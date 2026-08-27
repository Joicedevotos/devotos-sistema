import express from 'express'

const router = express.Router()

// GET - Status do estoque
router.get('/status', async (req, res) => {
  try {
    const inventory = [
      {
        id: 1,
        name: 'Camiseta Nossa Senhora',
        sku: 'CAM001',
        cost_price: 15.00,
        sale_price: 45.00,
        quantity: 10
      },
      {
        id: 2,
        name: 'Camiseta Jesus Cristo',
        sku: 'CAM002',
        cost_price: 15.00,
        sale_price: 45.00,
        quantity: 8
      }
    ]
    res.json(inventory)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter status do estoque' })
  }
})

// GET - Histórico de movimentações
router.get('/movements', async (req, res) => {
  try {
    const movements = []
    res.json(movements)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar movimentações' })
  }
})

// POST - Entrada de estoque
router.post('/entry', async (req, res) => {
  try {
    res.json({ success: true, message: 'Entrada registrada com sucesso!' })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar entrada' })
  }
})

// POST - Saída de estoque
router.post('/exit', async (req, res) => {
  try {
    res.json({ success: true, message: 'Saída registrada com sucesso!' })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar saída' })
  }
})

export default router