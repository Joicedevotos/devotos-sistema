import React, { useState } from 'react'

// Ordenacao de tabela clicando no cabecalho. `comparadores` = { coluna: (a, b) => numero }.
// Clicar na mesma coluna inverte; empates mantem a ordem da lista recebida (sort estavel).
// `descPrimeiro` = colunas que comecam do maior pro menor (ex.: data mais recente primeiro).
export function useOrdenacao(lista, comparadores, { inicial = null, descPrimeiro = [] } = {}) {
  const [ordem, setOrdem] = useState(inicial)

  const ordenada = ordem
    ? [...lista].sort((a, b) => (ordem.asc ? 1 : -1) * comparadores[ordem.coluna](a, b))
    : lista

  const ordenarPor = (coluna) =>
    setOrdem(o => ({ coluna, asc: o?.coluna === coluna ? !o.asc : !descPrimeiro.includes(coluna) }))

  const Cabecalho = ({ coluna, children }) => (
    <th onClick={() => ordenarPor(coluna)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} title="Clique para ordenar">
      {children} {ordem?.coluna === coluna ? (ordem.asc ? '▲' : '▼') : <span style={{ opacity: 0.35 }}>⇅</span>}
    </th>
  )

  return { ordenada, Cabecalho }
}
