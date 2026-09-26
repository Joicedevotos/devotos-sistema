import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { TIPOS_PRODUTO, TAMANHOS_POR_TIPO } from '../constants/produtoOpcoes'
import { formatarMoeda } from '../utils/formatters'
import { API_URL } from '../config'

function FiltroEstoque() {
  const [produtos, setProdutos] = useState([])
  const [tiposSelecionados, setTiposSelecionados] = useState([])
  const [tamanhosSelecionados, setTamanhosSelecionados] = useState([])
  const [buscaDescricao, setBuscaDescricao] = useState('')
  const [resultados, setResultados] = useState(null)
  const [mostrarPerguntaPdf, setMostrarPerguntaPdf] = useState(false)
  const [ocultarValorPdf, setOcultarValorPdf] = useState(false)

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

  // ignora maiuscula/minuscula e acentos ("sao jose" encontra "SÃO JOSÉ")
  const normalizar = (texto) => (texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

  const handleProcessar = () => {
    const busca = normalizar(buscaDescricao)
    if (tiposSelecionados.length === 0 && !busca) {
      alert('Marque pelo menos um produto ou digite um trecho da descrição')
      return
    }
    const filtrados = produtos.filter(p => {
      // so mostra o que tem saldo em estoque
      if (!(Number(p.quantidade) > 0)) return false
      if (tiposSelecionados.length > 0 && !tiposSelecionados.includes(p.tipo)) return false
      if (tamanhosSelecionados.length > 0 && !tamanhosSelecionados.includes(p.tamanho)) return false
      if (busca && !normalizar(p.descricao).includes(busca)) return false
      return true
    })
    setResultados(filtrados)
  }

  const handleExportarPDF = () => {
    setMostrarPerguntaPdf(true)
  }

  const confirmarExportacao = (ocultar) => {
    setOcultarValorPdf(ocultar)
    setMostrarPerguntaPdf(false)
    // espera o React aplicar a classe antes de abrir a janela de impressao.
    // As fotos so carregam quando aparecem na tela; pro PDF precisa de todas,
    // entao forca carregar as que faltam e so depois abre a impressao
    setTimeout(async () => {
      const fotos = [...document.querySelectorAll('img[loading="lazy"]')]
      fotos.forEach(img => { img.loading = 'eager' })
      await Promise.all(fotos.map(img => img.complete ? null : new Promise(ok => { img.onload = img.onerror = ok })))
      window.print()
    }, 50)
  }

  const descricaoFiltro = () => {
    const partes = []
    if (tiposSelecionados.length > 0) partes.push(tiposSelecionados.join(', '))
    if (tamanhosSelecionados.length > 0) partes.push(`Tamanhos: ${tamanhosSelecionados.join(', ')}`)
    if (buscaDescricao.trim()) partes.push(`Descrição contém: "${buscaDescricao.trim()}"`)
    return partes.join(' — ')
  }

  return (
    <div className="page">
      <h2 className="no-print">🔍 Filtro no Estoque</h2>

      <div className="form-section no-print">
        <h3>Filtrar Produtos</h3>

        <p style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>Buscar pela descrição (digite um pedaço do nome)</p>
        <input
          type="text"
          value={buscaDescricao}
          onChange={e => setBuscaDescricao(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleProcessar() }}
          placeholder="Ex: guadal"
          style={{ marginBottom: '15px' }}
        />

        <p style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>Produto (marque um ou mais — se não marcar nenhum, busca em todos)</p>
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
        <p style={{ fontSize: '13px', color: '#888', marginTop: '8px' }}>
          Só aparecem produtos com saldo em estoque (produtos zerados ficam de fora).
        </p>
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

              <div className={`catalogo-grid${ocultarValorPdf ? ' ocultar-valor-pdf' : ''}`}>
                {resultados.map(p => (
                  <div className="catalogo-card" key={p.id}>
                    {p.tem_imagem ? (
                      <img src={`${API_URL}/api/imagens/${p.imagem_hash}`} alt={`${p.tipo} ${p.tamanho}`} loading="lazy" />
                    ) : (
                      <div className="catalogo-sem-imagem">sem foto</div>
                    )}
                    <div className="catalogo-info">
                      <p className="catalogo-tamanho">{p.tipo} — Tamanho: <strong>{p.tamanho}</strong></p>
                      {p.descricao && <p className="catalogo-descricao">{p.descricao}</p>}
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
            <p>Nenhum produto com saldo em estoque encontrado com esse filtro</p>
          )}
        </>
      )}

      {mostrarPerguntaPdf && (
        <div
          className="no-print"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}
        >
          <div style={{ background: 'white', borderRadius: '10px', padding: '24px', maxWidth: '340px', textAlign: 'center' }}>
            <p style={{ marginBottom: '20px', fontSize: '15px', color: '#333' }}>
              Deseja que o preço de venda apareça no PDF?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button type="button" onClick={() => confirmarExportacao(false)}>Sim</button>
              <button type="button" onClick={() => confirmarExportacao(true)} style={{ background: '#999' }}>Não</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FiltroEstoque
