// Estudo de massa preliminar: encaixa os formatos padrão Tenda na área do
// terreno e converte gabarito em pavimentos (régua do usuário: 28m=T+9, 48m=T+17).
const LEGISLACAO = require('../prompts/legislacao-his')

function pavimentosPorGabarito(gabaritoM) {
  if (gabaritoM === null || gabaritoM === undefined || gabaritoM === 'livre (NA)') {
    return { totais: null, tipo: null, rotulo: 'livre — travado em T+25 no estudo de massa (parâmetro de produto SP)' }
  }
  const g = typeof gabaritoM === 'number' ? gabaritoM : parseFloat(gabaritoM)
  if (isNaN(g)) return { totais: null, tipo: null, rotulo: String(gabaritoM) }
  const totais = Math.floor(g / LEGISLACAO.regua_pavimentos.pe_direito_medio_m)
  return { totais, tipo: Math.max(totais - 1, 0), rotulo: `térreo + ${Math.max(totais - 1, 0)} pavimentos tipo (${g} m)` }
}

// Estima quantas torres de cada formato cabem e o programa resultante
function estudoDeMassa({ areaTerrenoM2, parametros, declividadePct }) {
  if (!areaTerrenoM2 || !parametros) return null
  const to = parseFloat(String(parametros.to_maxima || '0,70').split('/').pop().replace(',', '.')) || 0.7
  const ca = typeof parametros.ca_maximo_aplicavel === 'number' ? parametros.ca_maximo_aplicavel : parseFloat(parametros.ca_maximo_aplicavel) || null
  const pav = pavimentosPorGabarito(parametros.gabarito_m)

  // Área implantável: TO + perdas com recuos/viário/lazer (premissas Tenda)
  const perdaViarioLazer = areaTerrenoM2 > 3000 ? 0.28 : 0.20
  const areaImplantavel = areaTerrenoM2 * Math.min(to, 1) * (1 - perdaViarioLazer)

  const areaComputavelMax = ca ? areaTerrenoM2 * ca : null
  const cotaParte = parametros.cota_parte_m2 || null

  const opcoes = []
  for (const [key, f] of Object.entries(LEGISLACAO.implantacao_tenda.formatos)) {
    const footprintComEspacamento = f.area_pav_m2 * 1.55 // espaçamento entre torres + circulação externa
    const torresPorArea = Math.floor(areaImplantavel / footprintComEspacamento)
    if (torresPorArea < 1) continue

    // Pavimentos tipo: limitado por gabarito; se livre, limita pelo CA
    let pavTipo = pav.tipo
    if (pavTipo === null && areaComputavelMax) {
      pavTipo = Math.max(Math.floor(areaComputavelMax / (torresPorArea * f.area_pav_m2)), 1)
      pavTipo = Math.min(pavTipo, 25) // gabarito livre: trava em T+25 (parâmetro do usuário)
    }
    if (!pavTipo) continue

    let torres = torresPorArea
    // Se CA limita antes da área, reduz torres
    if (areaComputavelMax) {
      const maxTorresPorCA = Math.max(Math.floor(areaComputavelMax / (f.area_pav_m2 * pavTipo)), 1)
      torres = Math.min(torres, maxTorresPorCA)
    }

    let unidades = torres * f.aptos_por_pav * pavTipo
    let limitador = 'área implantável'
    if (areaComputavelMax && torres * f.area_pav_m2 * pavTipo >= areaComputavelMax * 0.95) limitador = 'CA máximo'
    if (cotaParte) {
      const maxPorCota = Math.floor(areaTerrenoM2 / cotaParte)
      if (unidades > maxPorCota) { unidades = maxPorCota; limitador = `cota-parte (${cotaParte} m²/un)` }
    }
    if (unidades > 400) { unidades = 400; limitador = 'limite de 400 unidades HIS por EHIS (Dec. 63.728/24)' }

    opcoes.push({
      formato: f.nome, torres, pavimentos: `T+${pavTipo}`,
      aptos_por_pav: f.aptos_por_pav, unidades_estimadas: unidades,
      area_construida_tipo_m2: Math.round(torres * f.area_pav_m2 * pavTipo),
      footprint_torre_m: f.footprint_m, limitador
    })
  }
  opcoes.sort((a, b) => b.unidades_estimadas - a.unidades_estimadas)

  // Taludes
  let taludes = null
  if (typeof declividadePct === 'number') {
    const c = LEGISLACAO.taludes.classes.find(c => {
      if (c.faixa.startsWith('<')) return declividadePct < 5
      if (c.faixa.startsWith('>')) return declividadePct > 30
      const [a, b] = c.faixa.replace('%', '').split('–').map(parseFloat)
      return declividadePct >= a && declividadePct <= b
    })
    taludes = { declividade_estimada_pct: declividadePct, ...c, nota: LEGISLACAO.taludes.nota }
  }

  return {
    fonte: LEGISLACAO.implantacao_tenda.fonte,
    area_terreno_m2: areaTerrenoM2,
    area_implantavel_m2: Math.round(areaImplantavel),
    gabarito: pav.rotulo,
    regua_pavimentos: LEGISLACAO.regua_pavimentos.exemplos,
    opcoes_implantacao: opcoes.slice(0, 3),
    recomendada: opcoes[0] || null,
    taludes,
    premissas: LEGISLACAO.implantacao_tenda.premissas
  }
}

module.exports = { estudoDeMassa, pavimentosPorGabarito }
