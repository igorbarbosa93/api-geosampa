// Proxy para serviços públicos usados pelo mapa do simulador.
// Chamadas server-side evitam bloqueios de CORS dos servidores do
// GeoSampa (GeoServer/WMS) e do Nominatim (OSM).

const GEOSAMPA_WMS = process.env.GEOSAMPA_WMS_URL ||
  'https://wms.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wms'
// Nome da camada de lotes no GeoServer do GeoSampa — ajustável por env
// caso a Prefeitura renomeie (verificar GetCapabilities do WMS).
const LOTE_LAYER = process.env.GEOSAMPA_LOTE_LAYER || 'geoportal:lote_cidadao'

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const UA = 'viaSP-simulador/1.0 (analise de viabilidade urbanistica)'

async function fetchJson(url, timeoutMs = 12000) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' }, signal: ctl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(t)
  }
}

// GET /v1/geosampa/busca?q=endereco
async function busca(req, res) {
  const q = String(req.query.q || '').trim()
  if (q.length < 3) {
    return res.status(400).json({ status: 'erro', mensagem: 'Informe ao menos 3 caracteres para buscar.' })
  }
  try {
    // viewbox restringe à Grande São Paulo
    const url = `${NOMINATIM}?format=jsonv2&limit=6&countrycodes=br&bounded=1` +
      `&viewbox=-46.90,-23.30,-46.30,-24.05` +
      `&q=${encodeURIComponent(q + ', São Paulo')}`
    const data = await fetchJson(url)
    res.json({
      status: 'success',
      resultados: data.map(d => ({
        label: d.display_name,
        lat: parseFloat(d.lat),
        lng: parseFloat(d.lon)
      }))
    })
  } catch (err) {
    res.status(502).json({ status: 'erro', mensagem: 'Busca de endereço indisponível no momento. Clique diretamente no mapa sobre o lote.' })
  }
}

// GET /v1/geosampa/lote?lat=&lng=
// Consulta GetFeatureInfo no WMS de lotes do GeoSampa no ponto clicado.
async function lote(req, res) {
  const lat = parseFloat(req.query.lat)
  const lng = parseFloat(req.query.lng)
  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ status: 'erro', mensagem: 'Parâmetros lat e lng são obrigatórios.' })
  }
  const d = 0.0004 // ~40m de janela em torno do clique
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`
  const params = new URLSearchParams({
    service: 'WMS', version: '1.1.1', request: 'GetFeatureInfo',
    layers: LOTE_LAYER, query_layers: LOTE_LAYER, styles: '',
    bbox, srs: 'EPSG:4326', width: '101', height: '101', x: '50', y: '50',
    info_format: 'application/json', feature_count: '3'
  })
  try {
    const data = await fetchJson(`${GEOSAMPA_WMS}?${params}`)
    const feat = (data.features || [])[0]
    if (!feat) {
      return res.json({ status: 'vazio', mensagem: 'Nenhum lote encontrado neste ponto. Aproxime o zoom e clique dentro do lote.' })
    }
    const p = feat.properties || {}
    // O nome do atributo de SQL varia conforme a publicação da camada
    const sql = p.lo_sql || p.sql || p.sqlc || p.SQL || p.sq || p.cd_sql ||
      (p.lo_setor && p.lo_quadra && p.lo_lote ? `${p.lo_setor}.${p.lo_quadra}.${p.lo_lote}` : null)
    res.json({
      status: 'success',
      sql,
      endereco: p.lo_endereco || p.endereco || p.nm_logradouro || null,
      area_m2: p.lo_area || p.area || p.ar_lote || null,
      propriedades: p,
      geometria: feat.geometry || null
    })
  } catch (err) {
    res.status(502).json({
      status: 'erro',
      mensagem: 'Consulta ao cadastro do GeoSampa indisponível. Você ainda pode analisar pelas coordenadas do ponto clicado.'
    })
  }
}

// ─── Triangulação de zoneamento ───
// Consulta as camadas oficiais no ponto e cruza com a base da legislação
// para calcular o CA de forma determinística (sem especulação da IA).

const LEGISLACAO = require('../prompts/legislacao-his')

// Candidatos de nome de camada (o GeoServer da PMSP muda nomenclatura);
// o primeiro que responder com feature é memorizado.
const LAYER_CANDIDATES = {
  zona: (process.env.GEOSAMPA_ZONA_LAYERS ||
    'geoportal:perimetros_zonas_lei_18177_2024,geoportal:zoneamento_lei_18177,geoportal:zoneamento_2024,geoportal:zoneamento_2016,geoportal:zoneamento,geoportal:zona_uso').split(','),
  eixo: (process.env.GEOSAMPA_EIXO_LAYERS ||
    'geoportal:eixos_area_influencia,geoportal:area_influencia_eixos,geoportal:eixo_estruturacao').split(','),
  operacao: (process.env.GEOSAMPA_OU_LAYERS ||
    'geoportal:operacao_urbana,geoportal:operacoes_urbanas,geoportal:piu_perimetro').split(','),
  tombamento: (process.env.GEOSAMPA_TOMB_LAYERS ||
    'geoportal:tombamento,geoportal:bens_tombados,geoportal:zepec').split(',')
}
const layerCache = {}

// ─── Autodescoberta de camadas via GetCapabilities ───
// O GeoServer da PMSP renomeia camadas entre publicações; em vez de
// depender de nomes fixos, o servidor lê o catálogo real na primeira
// requisição e classifica as camadas por palavra-chave.
const DISCOVERY_PATTERNS = {
  // Lei 18.177/2024 (Mapa 1) é o zoneamento VIGENTE — prioridade sobre 2016
  zona:       [/18[_.-]?177/i, /perimetros?[_-]?d?a?s?[_-]?zonas/i, /zonea/i, /zona[_-]?uso/i, /lei[_-]?16402/i],
  eixo:       [/eixo/i],
  operacao:   [/opera[cç][aã]o[_-]?urbana/i, /\bpiu\b/i, /\bouc\b/i],
  tombamento: [/tomb/i, /zepec/i, /patrimonio/i]
}
// Ordena candidatos descobertos pela prioridade dos padrões (18.177 primeiro)
function rankByPatterns(names, patterns) {
  const score = n => { const i = patterns.findIndex(p => p.test(n)); return i < 0 ? 99 : i }
  return [...names].sort((a, b) => score(a) - score(b))
}
let discoveryPromise = null

async function discoverLayers() {
  if (discoveryPromise) return discoveryPromise
  discoveryPromise = (async () => {
    const url = `${GEOSAMPA_WMS}?service=WMS&version=1.1.1&request=GetCapabilities`
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), 20000)
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctl.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const xml = await res.text()
      const names = [...xml.matchAll(/<Name>([^<]+)<\/Name>/g)].map(m => m[1].trim())
      const found = {}
      for (const [kind, patterns] of Object.entries(DISCOVERY_PATTERNS)) {
        found[kind] = rankByPatterns(names.filter(n => patterns.some(p => p.test(n))), patterns)
      }
      console.log('[geosampa] camadas descobertas:', JSON.stringify(found))
      return found
    } catch (err) {
      console.error('[geosampa] GetCapabilities falhou:', err.message)
      discoveryPromise = null // permite nova tentativa na próxima requisição
      return {}
    } finally {
      clearTimeout(t)
    }
  })()
  return discoveryPromise
}

async function featureAtPoint(kind, lat, lng) {
  const d = 0.0004
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`
  let candidates
  if (layerCache[kind]) {
    candidates = [layerCache[kind]]
  } else {
    const discovered = await discoverLayers()
    // Descobertas primeiro (existem de fato no servidor), estáticas como reserva
    candidates = [...(discovered[kind] || []), ...LAYER_CANDIDATES[kind]]
  }
  for (const layer of candidates) {
    try {
      const params = new URLSearchParams({
        service: 'WMS', version: '1.1.1', request: 'GetFeatureInfo',
        layers: layer.trim(), query_layers: layer.trim(), styles: '',
        bbox, srs: 'EPSG:4326', width: '101', height: '101', x: '50', y: '50',
        info_format: 'application/json', feature_count: '3'
      })
      const data = await fetchJson(`${GEOSAMPA_WMS}?${params}`, 8000)
      layerCache[kind] = layer.trim()
      const feat = (data.features || [])[0]
      return feat ? (feat.properties || {}) : null
    } catch { /* tenta o próximo candidato */ }
  }
  return undefined // camada indisponível (≠ null, que significa "sem feature no ponto")
}

// Padrão de siglas de zona da LPUOS (ZEU, ZEUP, ZM, ZC, ZEIS-1..5, ZER, ZPI, ZOE, ZEPAM...)
const SIGLA_RE = /^Z(EU[P]?|EMP?|M[a]?|C[A]?|OE|R|ER|EPAM|EPEC|PI|DE|PDS[r]?|COR|PR|EIS[\s-]?[1-5])$|^ZEIS[\s-]?[1-5]/i

function extrairSigla(props) {
  if (!props) return null
  const norm = v => String(v).toUpperCase().trim().replace(/\s+/g, '-')
    .replace(/^ZEIS-?(\d)/, 'ZEIS-$1').replace(/-+$/, '')
  // 1) chaves conhecidas da camada de zoneamento
  for (const k of ['zl_zona', 'zona', 'sigla', 'tx_zona', 'cd_zona', 'nm_zona', 'zoneamento', 'tx_sigla']) {
    if (props[k]) return norm(props[k])
  }
  // 2) varredura: qualquer valor string que casa com padrão de sigla de zona
  for (const v of Object.values(props)) {
    if (typeof v === 'string' && SIGLA_RE.test(v.trim())) return norm(v)
  }
  return null
}

// Cálculo determinístico do CA a partir da base jurídica
function calcularParametros(sigla, emEixo, temTombamento) {
  if (!sigla) return null
  const norm = sigla.replace(/^ZEIS-?(\d)$/, 'ZEIS-$1')
  const zeis = LEGISLACAO.zeis[norm]
  const zona = LEGISLACAO.zonas_uso[norm]
  const base = zeis || zona
  if (!base) return { sigla: norm, nota: 'Zona fora da base de parâmetros — verificar Quadro 3 LPUOS' }

  const p = {
    sigla: norm,
    fonte: zeis ? 'Base ZEIS (Lei 16.402/2016 + Lei 17.975/2023 + Dec. 63.728/2024)' : 'Quadro 3 LPUOS',
    ca_basico: base.ca_basico,
    ca_maximo_zona: base.ca_maximo,
    to_maxima: base.to_maxima || base.to_max || null,
    gabarito: base.gabarito || null,
    his_percentual_minimo: base.his_percentual_minimo || null,
    em_eixo: emEixo === true,
    tombamento_no_lote: temTombamento === true
  }

  // Bônus Lei 17.975/2023: ZEIS-2/3/5 em Eixo, sem tombamento → +50%
  const elegivel = ['ZEIS-2', 'ZEIS-3', 'ZEIS-5'].includes(norm)
  if (elegivel && emEixo === true && temTombamento !== true) {
    p.ca_maximo_aplicavel = base.ca_maximo_em_eixo || base.ca_maximo * 1.5
    p.bonus_aplicado = 'Lei 17.975/2023: +50% (ZEIS em área de influência de Eixo, sem tombamento)'
  } else {
    p.ca_maximo_aplicavel = base.ca_maximo
    if (elegivel && temTombamento === true) p.bonus_bloqueado = 'Bônus +50% BLOQUEADO por tombamento/ZEPEC no lote'
    else if (elegivel && emEixo !== true) p.bonus_nao_aplicado = 'Fora de área de influência de Eixo — sem bônus +50%'
  }

  p.outorga = zeis ? 'ISENTA — Fs=0 (Decreto 63.728/2024)' :
    'EHIS (≥80% HIS): ISENTA — Fs=0; demais usos: outorga padrão'
  return p
}

// GET /v1/geosampa/contexto?lat=&lng=
async function contexto(req, res) {
  const lat = parseFloat(req.query.lat)
  const lng = parseFloat(req.query.lng)
  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ status: 'erro', mensagem: 'Parâmetros lat e lng são obrigatórios.' })
  }

  const [zonaProps, eixoProps, ouProps, tombProps] = await Promise.all([
    featureAtPoint('zona', lat, lng),
    featureAtPoint('eixo', lat, lng),
    featureAtPoint('operacao', lat, lng),
    featureAtPoint('tombamento', lat, lng)
  ])

  const sigla = extrairSigla(zonaProps)
  const emEixo = eixoProps === undefined ? null : (eixoProps !== null)
  const temTomb = tombProps === undefined ? null : (tombProps !== null)
  const operacao = ouProps ? (ouProps.nm_operacao || ouProps.nome || ouProps.tx_nome || 'Operação urbana identificada') : (ouProps === null ? null : undefined)

  const parametros = calcularParametros(sigla, emEixo === true, temTomb === true)

  res.json({
    status: 'success',
    triangulacao: {
      zona: sigla || (zonaProps === undefined ? 'camada indisponível' : 'não identificada no ponto'),
      zona_propriedades: zonaProps || null,
      em_area_influencia_eixo: emEixo,
      operacao_urbana: operacao === undefined ? 'camada indisponível' : operacao,
      tombamento_no_ponto: temTomb,
      parametros_calculados: parametros,
      fonte: 'GeoSampa WMS (GetFeatureInfo) + base legislação 2016-2025',
      ressalva: 'Confirmação documental obrigatória: Ficha Técnica do lote (SQL) na SMUL e certidões — camadas WMS podem ter defasagem de publicação'
    }
  })
}

// GET /v1/geosampa/camadas — diagnóstico: mostra as camadas descobertas
// no GeoServer da PMSP e quais estão em uso para cada consulta
async function camadas(req, res) {
  const discovered = await discoverLayers()
  res.json({
    status: 'success',
    wms: GEOSAMPA_WMS,
    descobertas: discovered,
    em_uso: layerCache,
    candidatos_estaticos: LAYER_CANDIDATES
  })
}

module.exports = { busca, lote, contexto, camadas }
