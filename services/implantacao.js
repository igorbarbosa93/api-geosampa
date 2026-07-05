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

// Dimensões da lâmina em função de aptos/pav (corredor central, 2 lados)
function dimensoesLamina(aptosPorPav) {
  const d = LEGISLACAO.implantacao_tenda.regra_produto_sp.dimensoes
  const comprimento = Math.ceil(aptosPorPav / 2) * 6.5 + 5
  return { largura: d.largura_m, comprimento, area_pav: Math.round(comprimento * d.largura_m * 0.92) } // 8% de vazios/núcleo
}

// Estima o programa por lâminas SP (8-22 aptos/pav até T+17; máx 20 até T+25)
function estudoDeMassa({ areaTerrenoM2, parametros, declividadePct, dimensoesLote }) {
  if (!areaTerrenoM2 || !parametros) return null
  const regra = LEGISLACAO.implantacao_tenda.regra_produto_sp
  const to = parseFloat(String(parametros.to_maxima || '0,70').split('/').pop().replace(',', '.')) || 0.7
  const ca = typeof parametros.ca_maximo_aplicavel === 'number' ? parametros.ca_maximo_aplicavel : parseFloat(parametros.ca_maximo_aplicavel) || null
  const pav = pavimentosPorGabarito(parametros.gabarito_m)
  const gabaritoTipoMax = pav.tipo // null = livre

  const perdaViarioLazer = areaTerrenoM2 > 3000 ? 0.28 : 0.20
  const areaImplantavel = areaTerrenoM2 * Math.min(to, 1) * (1 - perdaViarioLazer)
  const areaComputavelMax = ca ? areaTerrenoM2 * ca : null
  const cotaParte = parametros.cota_parte_m2 || null
  const recuo = 5, gap = 6

  // Dimensões úteis do lote (testada × profundidade), quando conhecidas
  const dl = dimensoesLote && dimensoesLote.testada_m && dimensoesLote.profundidade_m
    ? { t: dimensoesLote.testada_m - 2 * recuo, p: dimensoesLote.profundidade_m - 2 * recuo }
    : null

  // Duas faixas de altura do produto SP
  const faixas = [
    { rotulo: 'até 18 pav', pavTotalMax: regra.faixa_ate_18_pav.pav_max_total, aptosMax: regra.faixa_ate_18_pav.aptos_por_pav_max },
    { rotulo: 'até 26 pav', pavTotalMax: regra.faixa_alta_26_pav.pav_max_total, aptosMax: regra.faixa_alta_26_pav.aptos_por_pav_max }
  ]

  const opcoes = []
  for (const fx of faixas) {
    let pavTipo = fx.pavTotalMax - 1
    if (gabaritoTipoMax !== null) pavTipo = Math.min(pavTipo, gabaritoTipoMax)
    if (pavTipo < 1) continue

    // Maior lâmina que cabe (economia de escala: começa em aptosMax e desce até 8)
    for (let n = fx.aptosMax; n >= regra.faixa_ate_18_pav.aptos_por_pav_min; n -= 2) {
      const dim = dimensoesLamina(n)
      // Encaixe geométrico quando as dimensões do lote são conhecidas
      let laminas
      if (dl) {
        const eixoMaior = Math.max(dl.t, dl.p), eixoMenor = Math.min(dl.t, dl.p)
        if (dim.comprimento > eixoMaior || dim.largura > eixoMenor) continue
        laminas = Math.floor((eixoMenor + gap) / (dim.largura + gap))
      } else {
        laminas = Math.floor(areaImplantavel / (dim.area_pav * 1.55))
      }
      if (laminas < 1) continue

      // CA pode reduzir pavimentos ou lâminas
      if (areaComputavelMax) {
        const maxPav = Math.floor(areaComputavelMax / (laminas * dim.area_pav))
        if (maxPav < 1) { laminas = Math.max(Math.floor(areaComputavelMax / (dim.area_pav * pavTipo)), 1) }
        else pavTipo = Math.min(pavTipo, maxPav)
      }

      let unidades = laminas * n * pavTipo
      let limitador = dl ? 'encaixe geométrico (testada × profundidade)' : 'área implantável'
      if (areaComputavelMax && laminas * dim.area_pav * pavTipo >= areaComputavelMax * 0.95) limitador = 'CA máximo'
      if (cotaParte) {
        const maxPorCota = Math.floor(areaTerrenoM2 / cotaParte)
        if (unidades > maxPorCota) { unidades = maxPorCota; limitador = `cota-parte (${cotaParte} m²/un)` }
      }
      if (unidades > 400) { unidades = 400; limitador = 'limite de 400 unidades HIS por EHIS (Dec. 63.728/24)' }

      opcoes.push({
        formato: `Lâmina ${n} aptos/pav (${fx.rotulo})`,
        torres: laminas, pavimentos: `T+${pavTipo}`,
        aptos_por_pav: n, unidades_estimadas: unidades,
        area_construida_tipo_m2: Math.round(laminas * dim.area_pav * pavTipo),
        footprint_torre_m: [dim.comprimento, dim.largura],
        eficiencia_lamina: n,
        custo_relativo: n >= 18 ? 'ótimo (custo fixo bem diluído)' : n >= 12 ? 'bom' : 'alto/un — lâmina curta dilui pouco o núcleo',
        limitador
      })
      break // maior lâmina viável desta faixa encontrada
    }
  }
  // Ordena por unidades e depois por eficiência de lâmina (custo)
  opcoes.sort((a, b) => b.unidades_estimadas - a.unidades_estimadas || b.eficiencia_lamina - a.eficiencia_lamina)

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
    alertas_gabarito: [
      'Envoltória de vila / rua sem saída (faixa 20 m): trava 28 m em ZEU/ZEUP/ZEM/ZEMP e 15 m nas demais — VERIFICAR NO LOCAL antes de fixar a altura',
      'Lote confrontante com ZER: trava 15 m na faixa de 20 m paralela à via'
    ],
    premissas: LEGISLACAO.implantacao_tenda.premissas
  }
}

module.exports = { estudoDeMassa, pavimentosPorGabarito, dimensoesLamina }
