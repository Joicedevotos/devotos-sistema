import { formatarMoeda } from './formatters'
import { compararTexto } from './ordenacao'

// Produtos cadastrados para o Produto + Tamanho escolhidos, um item por cadastro (id).
// Pode haver mais de um cadastro com a mesma descricao (ex.: lotes com custo/preco diferentes),
// entao a selecao precisa ser pelo id — nao pela descricao — e o texto mostra o estoque de cada um.
export function opcoesProduto(produtos, tipo, tamanho) {
  if (!tipo || !tamanho) return []
  const lista = produtos
    .filter(p => p.tipo === tipo && p.tamanho === tamanho)
    .sort((a, b) =>
      compararTexto(a.descricao, b.descricao) ||
      b.quantidade - a.quantidade
    )
  const contagem = {}
  for (const p of lista) {
    const d = (p.descricao || '').trim()
    contagem[d] = (contagem[d] || 0) + 1
  }
  return lista.map(p => {
    const d = (p.descricao || '').trim()
    let label = `${d || '(sem descricao)'} — estoque: ${p.quantidade}`
    if (contagem[d] > 1) label += ` — venda ${formatarMoeda(p.valor_venda)} (cód. ${p.id})`
    return { id: String(p.id), label }
  })
}
