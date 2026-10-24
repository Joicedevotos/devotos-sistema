import { TAMANHOS_POR_TIPO } from '../constants/produtoOpcoes'

// ordem alfabetica ignorando maiuscula/acento ("SÃO JOSÉ" junto de "Santa ...")
export const compararTexto = (a, b) =>
  (a || '').trim().localeCompare((b || '').trim(), 'pt-BR', { sensitivity: 'base', numeric: true })

export const ordenarClientes = (clientes) =>
  [...clientes].sort((a, b) => compararTexto(a.nome, b.nome))

// descricao em ordem alfabetica; empate -> tipo; tamanho na ordem da grade (PP, P, M...), nao alfabetica
export const posicaoTamanho = (p) => {
  const i = (TAMANHOS_POR_TIPO[p.tipo] || []).indexOf(p.tamanho)
  return i === -1 ? 999 : i
}

export const ordenarProdutos = (produtos) =>
  [...produtos].sort((a, b) =>
    compararTexto(a.descricao, b.descricao) ||
    compararTexto(a.tipo, b.tipo) ||
    posicaoTamanho(a) - posicaoTamanho(b)
  )
