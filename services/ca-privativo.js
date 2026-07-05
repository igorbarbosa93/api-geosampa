// CA PRIVATIVO POTENCIAL (EHIS/EZEIS) — modelo da especialista
// (CA_PRIVATIVO_POTENCIAL_7.xlsx) verificado contra a legislação em 05/07/2026.
//
// VEREDITO JURÍDICO (pesquisa com fontes SMUL/Secovi/Machado Meyer/Sbarra):
// - Base dos acréscimos: PDE Lei 16.050/2014, art. 60, I, alíneas "c","d","e"
//   (redação Lei 17.975/2023), regulamentado pelo Decreto 63.728/2024, que
//   admite aplicação COMBINADA das alíneas em EZEIS (somadas ao CA da zona).
// - O Quadro 2 do Dec. 63.728 JÁ EMBUTE a alínea "c" (+50% p/ HIS) nas zonas
//   comuns (coluna EHIS = 1,5× o CA geral). Em ZEIS o quadro dá CA 4 "seco"
//   e as alíneas c/d somam por fora — estrutura da planilha é coerente.
// - TETO LEGAL: áreas não computáveis limitadas a 59% da área construída
//   total em EHIS/EHMP/EZEIS (LPUOS art. 62 / Dec. 63.728).

const LEGISLACAO = require('../prompts/legislacao-his')

const EFICIENCIA_PRIVATIVA = { mercado: 0.75, tenda: 0.50 }
const TETO_NAO_COMPUTAVEL = 0.59 // fração máxima da área construída TOTAL

// PIU/AIU Arco Jurubatuba (Lei 17.965/23 + Lei 18.178/24 + Dec. 64.472/25)
// CORREÇÃO da planilha: não existe "Dif CA +2"; o que existe é CA máx 4 nas
// áreas T e, SOMENTE EM T1, manutenção expressa do acréscimo de 50% EHIS /
// 25% EHMP. Setor "EIXO" não existe (categorias: T1, T2, Q1, Q2, Q3).
const PIU_ACJ = {
  setores_validos: ['T1', 'T2', 'Q1', 'Q2', 'Q3'],
  ca_max_areas_T: 4,
  acrescimo_ehis_50_confirmado_em: ['T1'],
  nota: 'Em T1: EHIS chega a CA 6 computável (4 + 50% alínea c) + até 2 não computável (alínea e). "CA 8" como coeficiente NÃO existe — 8x só como área construída total (6 comp + 2 não comp), sujeita ao teto de 59%.'
}

function resolverZona(sigla) {
  const bruto = String(sigla || '').trim().replace(/^ZEIS[\s-]?(\d)/i, 'ZEIS-$1')
  if (LEGISLACAO.quadro_zonas_2024[bruto]) return bruto
  const alvo = bruto.toUpperCase()
  for (const k of Object.keys(LEGISLACAO.quadro_zonas_2024)) {
    if (k.toUpperCase() === alvo) return k
  }
  return null
}

function r2(v) { return Math.round(v * 100) / 100 }

function caPrivativoPotencial(sigla, opts = {}) {
  const norm = resolverZona(sigla)
  const q = norm ? LEGISLACAO.quadro_zonas_2024[norm] : null
  const caEhis = opts.ca_base ?? (q ? q.ca_max_ehis : null)
  if (!caEhis) return null

  const isZeis = /^ZEIS/i.test(norm)
  const camadas = []

  // 1) CA computável EHIS da zona (Quadro 2 Dec. 63.728 — alínea "c" já
  //    embutida nas zonas comuns; em ZEIS o CA é "seco")
  camadas.push({
    id: 'ca_zoneamento', natureza: 'computavel', gratuito: true,
    rotulo: `CA máx. EHIS da zona (${norm})`, valor: caEhis,
    base_legal: 'Quadro 2 do Decreto 63.728/2024', status: 'CONFIRMADO'
  })

  // 2) ZEIS: alíneas "c" (+50% HIS) e "d" (+25% HMP) somam por fora
  let acrescC = 0, acrescD = 0
  if (isZeis) {
    acrescC = caEhis * 0.5
    camadas.push({
      id: 'acrescimo_his_c', natureza: 'computavel', gratuito: true,
      rotulo: '+50% CA p/ uso HIS (alínea c)', valor: r2(acrescC),
      base_legal: 'PDE art. 60, I, "c" (Lei 17.975/23) + Dec. 63.728/24 (combinação em EZEIS)',
      status: 'CONFIRMADO', condicao: 'Macroáreas MEM/MUC/MQU; gratuito p/ EHIS'
    })
    acrescD = caEhis * 0.25
    camadas.push({
      id: 'acrescimo_hmp_d', natureza: 'computavel', gratuito: false,
      rotulo: '+25% CA p/ HMP (alínea d) — ONEROSO', valor: r2(acrescD),
      base_legal: 'PDE art. 60, I, "d" (Lei 17.975/23)',
      status: 'DIVERGENTE da planilha (não é não-computável: é acréscimo computável MEDIANTE OUTORGA)',
      condicao: 'Pagamento de outorga onerosa sobre esta parcela'
    })
  }

  const caComputavelParcial = caEhis + acrescC + acrescD

  // 3) §3º art. 112: +20% de ACC — ONEROSO. Base: CA do empreendimento
  //    "considerados os incentivos de majoração previstos em lei" (Dec. 63.504/24)
  const bonus20 = caComputavelParcial * 0.20
  camadas.push({
    id: 'bonus_cota_20_oneroso', natureza: 'computavel', gratuito: false,
    rotulo: '+20% ACC por atender a cota (§3º) — ONEROSO', valor: r2(bonus20),
    base_legal: 'PDE art. 112, §3º + Decreto 63.504/2024',
    status: 'DIVERGENTE da planilha (é área computável PAGA via outorga, não gratuita)',
    condicao: 'Mediante pagamento de outorga onerosa'
  })

  // ACC FINAL do empreendimento (base das não computáveis abaixo)
  const caComputavel = caComputavelParcial + bonus20

  // 4) Alínea "e": HIS-1 não computável até 50% da ACC máxima permitida
  const his1e = caComputavel * 0.5
  camadas.push({
    id: 'his1_nao_computavel_e', natureza: 'nao_computavel', gratuito: true,
    rotulo: '+50% HIS-1 não computável (alínea e)', valor: r2(his1e),
    base_legal: 'PDE art. 60, I, "e" (Lei 17.975/23); Dec. 63.728/24 art. 17',
    status: 'CONFIRMADO', condicao: 'Teto: 50% da ACC máxima permitida (aqui: incluindo acréscimos legais — interpretação a confirmar na SMUL)'
  })

  // 5) Cota de Solidariedade in-loco: HIS = 10% da ACC FINAL, não computável.
  //    Base legal expressa: "10% da área construída computável" do empreendimento
  //    (art. 112, caput) — por isso incide sobre a ACC já majorada pelos acréscimos.
  const cota10 = caComputavel * 0.10
  camadas.push({
    id: 'cota_solidariedade_10', natureza: 'nao_computavel', gratuito: true,
    rotulo: '+10% Cota de Solidariedade in-loco (HIS) — 10% da ACC final', valor: r2(cota10),
    base_legal: 'PDE arts. 111-112 (Lei 17.975/23)',
    status: 'CONFIRMADO com ressalva', condicao: 'Obrigatória apenas se ACC > 20.000 m²; adesão facultativa abaixo; HIS produzida no próprio empreendimento'
  })

  // Teto de 59% de não computáveis sobre a área construída TOTAL
  let naoComputavel = his1e + cota10
  const computavelTotal = caComputavel // ACC final já inclui o bônus de 20%
  const tetoNC = computavelTotal * TETO_NAO_COMPUTAVEL / (1 - TETO_NAO_COMPUTAVEL)
  let tetoAplicado = false
  if (naoComputavel > tetoNC) { naoComputavel = tetoNC; tetoAplicado = true }

  const total = computavelTotal + naoComputavel

  return {
    zona: norm,
    ca_ehis_base: caEhis,
    ca_computavel_total: r2(computavelTotal),
    ca_nao_computavel: r2(naoComputavel),
    teto_59_aplicado: tetoAplicado,
    camadas,
    ca_privativo_total: r2(total),
    ca_total_gratuito: r2(caEhis + acrescC + Math.min(his1e + cota10, tetoNC)),
    parcela_onerosa: r2(acrescD + bonus20),
    ca_privativo_mercado: r2(total * EFICIENCIA_PRIVATIVA.mercado),
    ca_privativo_tenda: r2(total * EFICIENCIA_PRIVATIVA.tenda),
    nota_eficiencia: 'Fatores ×0,75/×0,50 são premissas de eficiência de projeto (não lei). Teto legal: não computáveis ≤ 59% da área construída total; unidade HIS ≤ 70 m²',
    piu_acj: opts.piu_jurubatuba_setor ? avaliarACJ(norm, opts.piu_jurubatuba_setor) : undefined,
    fonte: 'Modelo da especialista (CA_PRIVATIVO_POTENCIAL_7) corrigido pela verificação jurídica de 05/07/2026'
  }
}

function avaliarACJ(zona, setor) {
  if (!PIU_ACJ.setores_validos.includes(setor)) {
    return { setor, alerta: `Setor "${setor}" não existe na AIU-ACJ (categorias: T1, T2, Q1, Q2, Q3)` }
  }
  const t1 = setor === 'T1'
  return {
    setor,
    ca_max_area_T: PIU_ACJ.ca_max_areas_T,
    acrescimo_ehis_50: t1 ? 'CONFIRMADO em T1 (Dec. 64.472/25) — EHIS até CA 6 computável' : 'NÃO CONFIRMADO fora de T1',
    nota: PIU_ACJ.nota,
    base_legal: 'Lei 17.965/2023 + Lei 18.178/2024 + Decreto 64.472/2025'
  }
}

// Autoteste: valores do modelo CORRIGIDO (difere da planilha nos pontos divergentes)
function autoteste() {
  const erros = []
  const zeu = caPrivativoPotencial('ZEU')
  // ZEU: parcial 6; +20%=1,2; ACC=7,2; NC: 3,6+0,72=4,32; total 11,52
  if (Math.abs(zeu.ca_privativo_total - 11.52) > 0.011) erros.push(`ZEU: esperado 11.52, obtido ${zeu.ca_privativo_total}`)
  const z3 = caPrivativoPotencial('ZEIS-3')
  // ZEIS-3: parcial 7; +20%=1,4; ACC=8,4; NC: 4,2+0,84=5,04; total 13,44
  if (Math.abs(z3.ca_privativo_total - 13.44) > 0.011) erros.push(`ZEIS-3: esperado 13.44, obtido ${z3.ca_privativo_total}`)
  if (!z3.camadas.find(c => c.id === 'acrescimo_hmp_d' && c.gratuito === false)) erros.push('ZEIS-3: alínea d deveria ser onerosa')
  const acj = caPrivativoPotencial('ZEU', { piu_jurubatuba_setor: 'EIXO' })
  if (!acj.piu_acj.alerta) erros.push('ACJ: setor EIXO deveria gerar alerta de inexistência')
  return erros
}

module.exports = { caPrivativoPotencial, autoteste, PIU_ACJ, EFICIENCIA_PRIVATIVA, TETO_NAO_COMPUTAVEL }
