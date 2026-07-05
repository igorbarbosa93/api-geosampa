// CA PRIVATIVO POTENCIAL (EHIS/EZEIS) — porte fiel do modelo da especialista
// (planilha CA_PRIVATIVO_POTENCIAL_7.xlsx, abas BASE ZONEAMENTO / PIU JURIBATUBA).
// Empilha benefícios de área NÃO COMPUTÁVEL sobre o CA máximo EHIS da zona.
// status de cada mecanismo preenchido após verificação jurídica.

const LEGISLACAO = require('../prompts/legislacao-his')

// Fatores do modelo (linhas da planilha)
const MODELO = {
  // ZEIS apenas: tipologias com não computabilidade adicional dentro de EZEIS
  zeis_hmp_25:  { fator: 0.25, rotulo: '+25% HMP não computável (EZEIS)' },
  zeis_his2_50: { fator: 0.50, rotulo: '+50% HIS-2 não computável (EZEIS)' },
  // Todas as zonas
  his1_50:      { fator: 0.50, rotulo: '+50% HIS-1 não computável' },
  cota_hmp_20:  { fator: 0.20, rotulo: '+20% Cota de Solidariedade (HMP/R2V)' },
  // 10% incide sobre (CA + benefícios ZEIS + cota HMP), não sobre HIS-1 nem sobre si
  cota_his2_10: { fator: 0.10, rotulo: '+10% Cota de Solidariedade (HIS-2)' }
}

// Fatores de conversão para área PRIVATIVA vendável (premissas de mercado, não lei)
const EFICIENCIA_PRIVATIVA = { mercado: 0.75, tenda: 0.50 }

// PIU Arco Jurubatuba — "Dif CA Operação" por zona/setor (aba PIU JURIBATUBA)
const PIU_JURUBATUBA_DIF_CA = {
  ZEU: { T1: 2, T2: 1 },
  ZEM: { T1: 1 }
}

function resolverZona(sigla) {
  const bruto = String(sigla || '').trim().replace(/^ZEIS[\s-]?(\d)/i, 'ZEIS-$1')
  if (LEGISLACAO.quadro_zonas_2024[bruto]) return bruto
  // Busca case-insensitive (zonas com sufixo "a" minúsculo: ZEUa, ZMa, ZCORa…)
  const alvo = bruto.toUpperCase()
  for (const k of Object.keys(LEGISLACAO.quadro_zonas_2024)) {
    if (k.toUpperCase() === alvo) return k
  }
  return null
}

function caPrivativoPotencial(sigla, opts = {}) {
  const norm = resolverZona(sigla)
  const q = norm ? LEGISLACAO.quadro_zonas_2024[norm] : null
  const caEhis = opts.ca_base ?? (q ? q.ca_max_ehis : null)
  if (!caEhis) return null

  const isZeis = /^ZEIS/i.test(norm)
  const difPiu = opts.piu_jurubatuba_setor && PIU_JURUBATUBA_DIF_CA[norm]
    ? (PIU_JURUBATUBA_DIF_CA[norm][opts.piu_jurubatuba_setor] || 0) : 0
  // Fiel à planilha: os benefícios percentuais incidem sobre o CA da ZONA;
  // a diferença de CA da operação urbana entra como parcela fixa.
  const ca = caEhis

  const camadas = []
  camadas.push({ id: 'ca_zoneamento', rotulo: `CA máx. EHIS da zona (${norm})`, valor: caEhis })
  if (difPiu) camadas.push({ id: 'dif_piu', rotulo: `Dif. CA Operação (PIU ACJ setor ${opts.piu_jurubatuba_setor})`, valor: difPiu, verificacao: 'a confirmar na lei do PIU' })

  const hmp25 = isZeis ? ca * MODELO.zeis_hmp_25.fator : 0
  const his2_50 = isZeis ? ca * MODELO.zeis_his2_50.fator : 0
  const his1_50 = ca * MODELO.his1_50.fator
  const cotaHmp20 = ca * MODELO.cota_hmp_20.fator
  const cotaHis2_10 = (ca + hmp25 + his2_50 + cotaHmp20) * MODELO.cota_his2_10.fator

  if (hmp25) camadas.push({ id: 'zeis_hmp_25', rotulo: MODELO.zeis_hmp_25.rotulo, valor: r2(hmp25) })
  if (his2_50) camadas.push({ id: 'zeis_his2_50', rotulo: MODELO.zeis_his2_50.rotulo, valor: r2(his2_50) })
  camadas.push({ id: 'his1_50', rotulo: MODELO.his1_50.rotulo, valor: r2(his1_50) })
  camadas.push({ id: 'cota_hmp_20', rotulo: MODELO.cota_hmp_20.rotulo, valor: r2(cotaHmp20) })
  camadas.push({ id: 'cota_his2_10', rotulo: MODELO.cota_his2_10.rotulo, valor: r2(cotaHis2_10) })

  const total = ca + difPiu + hmp25 + his2_50 + his1_50 + cotaHmp20 + cotaHis2_10
  return {
    zona: norm,
    ca_ehis_base: caEhis,
    dif_ca_piu: difPiu || null,
    camadas,
    ca_privativo_total: r2(total),
    ca_privativo_mercado: r2((ca + difPiu + cotaHis2_10 + cotaHmp20 + hmp25 + his2_50) * EFICIENCIA_PRIVATIVA.mercado),
    ca_privativo_tenda: r2(total * EFICIENCIA_PRIVATIVA.tenda),
    nota_eficiencia: 'Fatores privativos (×0,75 mercado / ×0,50 Tenda) são premissas de eficiência de projeto, não parâmetros legais',
    fonte: 'Modelo CA_PRIVATIVO_POTENCIAL_7 (especialista) sobre quadro consolidado 2024'
  }
}

function r2(v) { return Math.round(v * 100) / 100 }

// Autoteste: replica os totais da planilha (aba BASE ZONEAMENTO, linha 13)
function autoteste() {
  const esperado = {
    ZEU: 10.92, ZEUa: 5.46, ZEUP: 5.46, ZEUPa: 2.73, ZEM: 5.46, ZEMP: 5.46,
    ZC: 5.46, ZCa: 2.73, 'ZC-ZEIS': 5.46, 'ZCOR-2': 2.73, 'ZCOR-3': 2.73, ZCORa: 2.73,
    ZM: 5.46, ZMa: 2.73, ZMIS: 5.46, ZMISa: 2.73,
    'ZEIS-1': 6.61, 'ZEIS-2': 10.58, 'ZEIS-3': 10.58, 'ZEIS-4': 5.29, 'ZEIS-5': 10.58
  }
  const erros = []
  for (const [zona, total] of Object.entries(esperado)) {
    const r = caPrivativoPotencial(zona)
    if (!r) { erros.push(`${zona}: sem resultado`); continue }
    if (Math.abs(r.ca_privativo_total - total) > 0.011) {
      erros.push(`${zona}: esperado ${total}, obtido ${r.ca_privativo_total}`)
    }
  }
  return erros
}

module.exports = { caPrivativoPotencial, autoteste, PIU_JURUBATUBA_DIF_CA, EFICIENCIA_PRIVATIVA }
