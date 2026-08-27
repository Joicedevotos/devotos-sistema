import express from 'express'

const router = express.Router()

// GET - Listar todos os produtos
router.get('/', async (req, res) => {
  try {
    const products = [
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
    res.json(products)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar produtos' })
  }
})

// POST - Criar novo produto
router.post('/', async (req, res) => {
  try {
    res.json({ success: true, message: 'Produto criado com sucesso!' })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar produto' })
  }
})

export default router