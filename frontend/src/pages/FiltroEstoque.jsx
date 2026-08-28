import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { TIPOS_PRODUTO, TAMANHOS_POR_TIPO } from '../constants/produtoOpcoes'
import { formatarMoeda } from '../utils/formatters'
import { API_URL } from '../config'

function FiltroEstoque() {
  const [produtos, setProdutos] = useState([])
  const [tiposSelecionados, setTiposSelecionados] = useState([])
  const [tamanhosSelecionados, setTamanhosSelecionados] = useState([])
  const [resultados, setResultados] = useState(null)

  useEffect(() => {
    axios.get(`${API_URL}/api/produtos`)
      .then(res => setProdutos(res.data))
      .catch(err => console.error('Erro ao carregar produtos:', err))
  }, [])

  // Tamanhos disponiveis = uniao dos tamanhos de todos os produtos marcados
  const tamanhosDisponiveis = useMemo(() => {
    const set = new Set()
    tiposSelecionados.forEach(t => (TAMANHOS_POR_TIPO[t] || []).forEach(tam => set.add(tam)))
    return Array.from(set)
  }, [tiposSelecionados])

  const toggleTipo = (tipo) => {
    setTiposSelecionados(prev => {
      const novo = prev.includes(tipo) ? prev.filter(t => t !== tipo) : [...prev, tipo]

      // remove da selecao de tamanhos os que nao pertencem mais a nenhum produto marcado
      const tamanhosValidos = new Set()
      novo.forEach(t => (TAMANHOS_POR_TIPO[t] || []).forEach(tam => tamanhosValidos.add(tam)))
      setTamanhosSelecionados(atual => atual.filter(tam => tamanhosValidos.has(tam)))

      return novo
    })
  }

  const toggleTamanho = (tamanho) => {
    setTamanhosSelecionados(prev => prev.includes(tamanho) ? prev.filter(t => t !== tamanho) : [...prev, tamanho])
  }

  const handleProcessar = () => {
    if (tiposSelecionados.length === 0) {
      alert('Marque pelo menos um produto')
      return
    }
    const filtrados = produtos.filter(p => {
      if (!tiposSelecionados.includes(p.tipo)) return false
      if (tamanhosSelecionados.length > 0 && !tamanhosSelecionados.includes(p.tamanho)) return false
      return true
    })
    setResultados(filtrados)
  }

  const handleExportarPDF = () => {
    window.print()
  }

  const descricaoFiltro = () => {
    const partes = [tiposSelecionados.join(', ')]
    if (tamanhosSelecionados.length > 0) partes.push(`Tamanhos: ${tamanhosSelecionados.join(', ')}`)
    return partes.join(' — ')
  }

  return (
    <div className="page">
      <h2 className="no-print">🔍 Filtro no Estoque</h2>

      <div className="form-section no-print">
        <h3>Filtrar Produtos</h3>

        <p style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>Produto (marque um ou mais)</p>
        <div className="filtro-checkboxes">
          {TIPOS_PRODUTO.map(t => (
            <label key={t} className="filtro-checkbox-item">
              <input
                type="checkbox"
                checked={tiposSelecionados.includes(t)}
                onChange={() => toggleTipo(t)}
              />
              {t}
            </label>
          ))}
        </div>

        <p style={{ fontSize: '14px', color: '#333', margin: '15px 0 8px' }}>
          Tamanho (marque um ou mais — se nao marcar nenhum, inclui todos os tamanhos)
        </p>
        <div className="filtro-checkboxes">
          {tamanhosDisponiveis.length > 0 ? (
            tamanhosDisponiveis.map(t => (
              <label key={t} className="filtro-checkbox-item">
                <input
                  type="checkbox"
                  checked={tamanhosSelecionados.includes(t)}
                  onChange={() => toggleTamanho(t)}
                />
                {t}
              </label>
            ))
          ) : (
            <span style={{ color: '#999', fontSize: '13px' }}>Marque um produto acima para ver os tamanhos</span>
          )}
        </div>

        <button type="button" onClick={handleProcessar} style={{ marginTop: '15px' }}>Processar</button>
      </div>

      {resultados && (
        <>
          <h3 className="no-print">Resultado ({resultados.length})</h3>

          {resultados.length > 0 ? (
            <>
              <div className="catalogo-print-titulo">
                <h2>🙏 Loja Devotos — Catálogo</h2>
                <p>{descricaoFiltro()}</p>
              </div>

              <div className="catalogo-grid">
                {resultados.map(p => (
                  <div className="catalogo-card" key={p.id}>
                    {p.tem_imagem ? (
                      <img src={`${API_URL}/api/produtos/${p.id}/imagem`} alt={`${p.tipo} ${p.tamanho}`} />
                    ) : (
                      <div className="catalogo-sem-imagem">sem foto</div>
                    )}
                    <div className="catalogo-info">
                      <p className="catalogo-tamanho">{p.tipo} — Tamanho: <strong>{p.tamanho}</strong></p>
                      <p className="no-print">Estoque: {p.quantidade}</p>
                      <p className="catalogo-valor">{formatarMoeda(p.valor_venda)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" className="no-print" onClick={handleExportarPDF} style={{ marginTop: '20px' }}>
                📄 Exportar para PDF
              </button>
              <p className="no-print" style={{ fontSize: '13px', color: '#888', marginTop: '8px' }}>
                Na janela de impressão que abrir, escolha a opção "Salvar como PDF" para baixar o catálogo e enviar ao cliente.
              </p>
            </>
          ) : (
            <p>Nenhum produto encontrado com esse filtro</p>
          )}
        </>
      )}
    </div>
  )
}

export default FiltroEstoque
