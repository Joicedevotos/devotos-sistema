import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { API_URL } from '../config'

const numero = (casas) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: casas })

function formatarBytes(bytes) {
  if (bytes >= 1e9) return `${numero(2).format(bytes / 1e9)} GB`
  const mb = bytes / 1e6
  return `${numero(mb < 10 ? 1 : 0).format(mb)} MB`
}

function formatarLimite(bytes) {
  return `${numero(1).format(bytes / 1e9)} GB`
}

// O Neon fecha o mes a meia-noite UTC do dia 1o; no fuso do Brasil isso cairia no dia anterior
function formatarDia(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
}

// Verde ate 70%, amarelo ate 90%, vermelho acima: perto do limite o banco para de funcionar
function nivel(fracao) {
  if (fracao >= 0.9) return 'ruim'
  if (fracao >= 0.7) return 'atencao'
  return 'bom'
}

function Medidor({ titulo, usado, limite, texto, explicacao }) {
  const fracao = Math.min(1, usado / limite)
  const pct = Math.round((usado / limite) * 100)
  return (
    <div className="uso-medidor">
      <div className="uso-cabecalho">
        <strong>{titulo}</strong>
        <span className={`uso-pct uso-${nivel(fracao)}`}>{pct}%</span>
      </div>
      <div className="uso-barra" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={titulo}>
        <div className={`uso-preenchido uso-fundo-${nivel(fracao)}`} style={{ width: `${Math.max(fracao * 100, 1)}%` }} />
      </div>
      <small>{texto}. {explicacao}</small>
    </div>
  )
}

// Consumo do banco (Neon, plano gratis) no Dashboard
function PainelUsoBanco() {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(false)

  const carregar = async () => {
    setErro(false)
    try {
      const { data } = await axios.get(`${API_URL}/api/uso-banco`)
      setDados(data)
    } catch (error) {
      console.error('Erro ao carregar uso do banco:', error)
      setErro(true)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  if (!dados) {
    return (
      <div className="uso-banco">
        {erro ? (
          <p>
            Não foi possível carregar o uso do banco.{' '}
            <button className="uso-tentar" onClick={carregar}>Tentar de novo</button>
          </p>
        ) : <p>Carregando uso do banco...</p>}
      </div>
    )
  }

  const { limites } = dados
  const temConsumoMensal = dados.transferenciaBytes !== null

  return (
    <div className="uso-banco">
      <p className="uso-dica">
        Plano grátis do Neon.
        {dados.renovaEm && <> O consumo do mês zera em <strong>{formatarDia(dados.renovaEm)}</strong>.</>}
      </p>

      {temConsumoMensal && (
        <Medidor
          titulo="Transferência no mês"
          usado={dados.transferenciaBytes}
          limite={limites.transferenciaBytes}
          texto={`${formatarBytes(dados.transferenciaBytes)} de ${formatarLimite(limites.transferenciaBytes)}`}
          explicacao="Dados enviados do banco para o sistema, principalmente fotos dos produtos. No limite, o sistema fica fora do ar até o mês virar."
        />
      )}

      <Medidor
        titulo="Espaço usado"
        usado={dados.espacoBytes}
        limite={limites.espacoBytes}
        texto={`${formatarBytes(dados.espacoBytes)} de ${formatarLimite(limites.espacoBytes)}`}
        explicacao="Tudo o que está guardado, incluindo as fotos. No limite, não dá para cadastrar nem vender mais nada."
      />

      {temConsumoMensal && (
        <Medidor
          titulo="Processamento no mês"
          usado={dados.processamentoHoras}
          limite={limites.processamentoHoras}
          texto={`${numero(1).format(dados.processamentoHoras)} de ${limites.processamentoHoras} horas`}
          explicacao="Tempo em que o banco ficou ligado atendendo o sistema. No limite, o sistema fica fora do ar até o mês virar."
        />
      )}

      {dados.avisoNeon && <p className="uso-dica">{dados.avisoNeon}</p>}
    </div>
  )
}

export default PainelUsoBanco
