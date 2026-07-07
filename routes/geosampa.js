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
    const ext = extrairDadosLote(p, feat.geometry)
    res.json({
      status: 'success',
      sql: ext.sql,
      endereco: ext.endereco,
      area_m2: ext.area_m2,
      area_geometria_m2: ext.area_geometria_m2,
      divergencia_area: ext.divergencia_area,
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

// ─── Extração robusta dos dados do lote (campos reais do GeoSampa:
//     "Código do contribuinte" = SQL completo; "Área terreno (m2)";
//     Setor/Quadra/Lote/Dígito SQL separados; Nome logradouro) ───
const normKey = k => String(k).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s_()]+/g, '')

function extrairDadosLote(props, geometry) {
  const entries = Object.entries(props || {}).map(([k, v]) => [normKey(k), v, k])
  const byKey = frag => entries.find(([nk, v]) => nk.includes(frag) && v !== null && v !== '')

  // SQL: 1) qualquer valor no formato NNN.NNN.NNNN(-D); 2) campo "contribuinte";
  //      3) composição setor.quadra.lote-dígito
  let sql = null
  for (const [, v] of entries) {
    const m = String(v).match(/^(\d{3})[.\s]?(\d{3})[.\s]?(\d{4})[-.\s]?(\d)?$/)
    if (m) { sql = `${m[1]}.${m[2]}.${m[3]}${m[4] ? '-' + m[4] : ''}`; break }
  }
  if (!sql) {
    const contrib = byKey('contribuinte')
    if (contrib) sql = String(contrib[1]).trim()
  }
  if (!sql) {
    const setor = byKey('setor'), quadra = byKey('quadra'), lote = byKey('lote')
    const digito = byKey('digito')
    if (setor && quadra && lote) {
      sql = `${String(setor[1]).padStart(3, '0')}.${String(quadra[1]).padStart(3, '0')}.${String(lote[1]).padStart(4, '0')}${digito ? '-' + digito[1] : ''}`
    }
  }

  // Área cadastral: chave com "area"+"terreno" > "area"+"lote" > qualquer "area" numérica
  let area = null
  for (const frags of [['area', 'terreno'], ['area', 'lote'], ['area']]) {
    const hit = entries.find(([nk, v]) => frags.every(f => nk.includes(f)) && !isNaN(parseFloat(v)) && parseFloat(v) > 10)
    if (hit) { area = parseFloat(hit[1]); break }
  }

  // Área pela geometria oficial (shoelace) — fallback e verificação cruzada
  const areaGeo = geometry ? areaGeometriaM2(geometry) : null
  let divergencia = null
  if (area && areaGeo && Math.abs(area - areaGeo) / area > 0.05) {
    divergencia = `Área cadastral (${Math.round(area)} m²) diverge da geometria (${Math.round(areaGeo)} m²) em ${Math.round(Math.abs(area - areaGeo) / area * 100)}% — confirmar na Ficha Técnica`
  }

  // Endereço: logradouro + número/porta + complemento
  const log = byKey('logradouro') || byKey('endereco')
  const num = byKey('porta') || byKey('numero')
  const compl = byKey('complemento')
  const endereco = log ? [log[1], num && String(num[1]).trim() !== 'S/N' ? num[1] : null, compl ? compl[1] : null].filter(Boolean).join(', ') : null

  return { sql, endereco, area_m2: area ?? (areaGeo ? Math.round(areaGeo) : null), area_geometria_m2: areaGeo ? Math.round(areaGeo) : null, divergencia_area: divergencia }
}

// Área de Polygon/MultiPolygon GeoJSON em m² (projeção local equiretangular)
function areaGeometriaM2(geom) {
  const rings = geom.type === 'Polygon' ? [geom.coordinates[0]]
    : geom.type === 'MultiPolygon' ? geom.coordinates.map(p => p[0]) : []
  let total = 0
  for (const ring of rings) {
    if (!ring || ring.length < 4) continue
    const lat0 = ring[0][1] * Math.PI / 180
    const mLng = 111320 * Math.cos(lat0), mLat = 111320
    let s = 0
    for (let i = 0; i < ring.length - 1; i++) {
      const [x1, y1] = [ring[i][0] * mLng, ring[i][1] * mLat]
      const [x2, y2] = [ring[i + 1][0] * mLng, ring[i + 1][1] * mLat]
      s += x1 * y2 - x2 * y1
    }
    total += Math.abs(s / 2)
  }
  return total || null
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
    'geoportal:tombamento,geoportal:bens_tombados,geoportal:zepec').split(','),
  topografia: (process.env.GEOSAMPA_TOPO_LAYERS ||
    'geoportal:curva_de_nivel,geoportal:curvas_nivel,geoportal:altimetria').split(','),
  melhoramento: (process.env.GEOSAMPA_MELHORAMENTO_LAYERS ||
    'geoportal:melhoramento_viario,geoportal:melhoramentos_viarios').split(','),
  hidrografia: (process.env.GEOSAMPA_HIDRO_LAYERS ||
    'geoportal:hidrografia,geoportal:curso_dagua,geoportal:rios').split(','),
  drenagem: (process.env.GEOSAMPA_DRENAGEM_LAYERS ||
    'geoportal:rede_drenagem,geoportal:drenagem,geoportal:galerias').split(','),
  alta_tensao: (process.env.GEOSAMPA_LT_LAYERS ||
    'geoportal:rede_alta_tensao,geoportal:linha_transmissao').split(',')
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
  tombamento: [/tomb/i, /zepec/i, /patrimonio/i],
  topografia: [/curva[_-]?d?e?[_-]?nivel/i, /altimetr/i, /\bmdt\b/i, /\bmdc\b/i, /decliv/i, /topograf/i],
  melhoramento: [/melhoramento/i, /alargamento/i, /faixa[_-]?n?a?o?[_-]?edific/i],
  hidrografia: [/hidrograf/i, /curso[_-]?d?[_-]?agua/i, /corrego/i, /\brio\b/i, /nascente/i],
  drenagem: [/drenag/i, /galeria/i, /piscin[aã]o/i, /reservatorio[_-]?d?e?[_-]?contencao/i],
  alta_tensao: [/alta[_-]?tensao/i, /transmissao/i, /linhao/i, /servidao/i]
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

// Cálculo determinístico do CA a partir do quadro consolidado 2024
// (Quadro 3 LPUOS revisado + Quadro 2 do Decreto 63.728/2024 — EHIS).
// areaLoteM2: quando conhecida (lote único ou soma do bloco), aplica as
// travas de lote pequeno das ZEIS; quando não, retorna a condição.
function calcularParametros(sigla, emEixo, temTombamento, areaLoteM2) {
  if (!sigla) return null
  const norm = sigla.replace(/^ZEIS-?(\d)$/, 'ZEIS-$1')
  const q = LEGISLACAO.quadro_zonas_2024[norm]
  if (!q) return { sigla: norm, nota: 'Zona fora do quadro consolidado — verificar Quadro 3 LPUOS no anexo oficial' }

  const p = {
    sigla: norm,
    fonte: 'Quadro consolidado 2024 (LPUOS rev. L18.081/24 + Mapa 1 L18.177/24 + Quadro 2 Dec. 63.728/24)',
    confiabilidade: q.conf === 'duplo' ? 'confirmado por duas fontes' : 'fonte única — conferir no anexo oficial da Lei 18.081/24',
    ca_basico: q.ca_bas,
    ca_maximo_geral: q.ca_max_geral,
    ca_maximo_ehis: q.ca_max_ehis,
    ca_maximo_ehmp: q.ca_max_ehmp,
    to_maxima: q.to,
    gabarito_m: q.gabarito_m === null ? 'livre (NA)' : q.gabarito_m,
    recuos: q.recuos,
    cota_parte_m2: q.cota_parte_m2,
    em_eixo: emEixo === true,
    tombamento_no_lote: temTombamento === true,
    condicoes: q.condicoes || []
  }

  if (q.ca_max_ehis === null) {
    p.alerta_ehis = 'Zona sem CA EHIS no Quadro 2 do Decreto — EHIS inviável ou a validar caso a caso'
  }

  // Trava de lote pequeno (ZEIS — notas e/f/g do Quadro 2)
  let caEhis = q.ca_max_ehis
  if (q.trava_lote) {
    p.trava_lote_pequeno = {
      limite_m2: q.trava_lote.limite_m2,
      ca_reduzido: q.trava_lote.ca_reduzido,
      regra: `CA cai para ${q.trava_lote.ca_reduzido} se a área do lote (ou do bloco remembrado) for < ${q.trava_lote.limite_m2} m²`
    }
    if (typeof areaLoteM2 === 'number' && areaLoteM2 > 0) {
      if (areaLoteM2 < q.trava_lote.limite_m2) {
        caEhis = q.trava_lote.ca_reduzido
        p.trava_lote_pequeno.aplicada = true
        p.trava_lote_pequeno.dica_remembramento = `Remembrar lotes vizinhos até ≥ ${q.trava_lote.limite_m2} m² eleva o CA de ${q.trava_lote.ca_reduzido} para ${q.ca_max_ehis}`
      } else {
        p.trava_lote_pequeno.aplicada = false
      }
    }
  }

  // Bônus EZEIS em Eixo (Lei 17.975/23): quadra integralmente contida, sem vedações.
  // A trava de lote pequeno prevalece: sem área mínima não há bônus.
  const bonus = LEGISLACAO.bonus_ezeis_eixo_2024
  const travado = p.trava_lote_pequeno && p.trava_lote_pequeno.aplicada === true
  if (travado) {
    p.ca_maximo_aplicavel = q.trava_lote.ca_reduzido
    if (q.bonus_eixo_ca && emEixo === true) {
      p.bonus_bloqueado = `Bônus EZEIS CA ${q.bonus_eixo_ca} indisponível enquanto a trava de lote pequeno vigorar — remembramento até ≥ ${q.trava_lote.limite_m2} m² destrava CA ${q.ca_max_ehis} e habilita o bônus`
    }
  } else if (q.bonus_eixo_ca && emEixo === true && temTombamento !== true) {
    p.ca_maximo_aplicavel = q.bonus_eixo_ca
    p.bonus_aplicado = `Lei 17.975/2023: EZEIS com CA ${q.bonus_eixo_ca} — condicionado a QUADRA INTEGRALMENTE CONTIDA no eixo (verificar geometria da quadra) e às vedações: ${bonus.vedacoes.join('; ')}`
  } else {
    p.ca_maximo_aplicavel = caEhis ?? q.ca_max_geral
    if (q.bonus_eixo_ca && temTombamento === true) p.bonus_bloqueado = 'Bônus EZEIS CA 6 BLOQUEADO por tombamento/ZEPEC no lote'
    else if (q.bonus_eixo_ca && emEixo !== true) p.bonus_nao_aplicado = 'Fora de área de influência de Eixo (raios 2024: 700 m estações / 400 m corredores) — sem bônus EZEIS'
  }

  p.outorga = q.ca_max_ehis !== null
    ? 'HIS: ISENTA — Fs=0 (Dec. 63.504/24 + 63.728/24); HMP: Fs=0,4'
    : 'Outorga padrão da zona'
  p.regras_gabarito_2024 = LEGISLACAO.regras_gabarito_2024
  return p
}

// GET /v1/geosampa/contexto?lat=&lng=
async function contexto(req, res) {
  const lat = parseFloat(req.query.lat)
  const lng = parseFloat(req.query.lng)
  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ status: 'erro', mensagem: 'Parâmetros lat e lng são obrigatórios.' })
  }

  // Amostragem topográfica: centro + 4 pontos a ~35 m (para declividade)
  const OFF = 0.00032
  const topoPts = [[lat, lng], [lat + OFF, lng], [lat - OFF, lng], [lat, lng + OFF], [lat, lng - OFF]]

  const [zonaProps, eixoProps, ouProps, tombProps, ...topoProps] = await Promise.all([
    featureAtPoint('zona', lat, lng),
    featureAtPoint('eixo', lat, lng),
    featureAtPoint('operacao', lat, lng),
    featureAtPoint('tombamento', lat, lng),
    ...topoPts.map(([la, lo]) => featureAtPoint('topografia', la, lo))
  ])

  // Extrai cota altimétrica de cada amostra e estima a declividade
  const extrairCota = props => {
    if (!props) return null
    for (const k of ['cota', 'elevacao', 'altitude', 'nm_cota', 'cd_cota', 'z']) {
      const v = parseFloat(props[k]); if (!isNaN(v)) return v
    }
    for (const v of Object.values(props)) {
      const n = parseFloat(v); if (!isNaN(n) && n > 400 && n < 1300) return n // faixa plausível de SP (~430-1.100 m)
    }
    return null
  }
  const cotas = topoProps.map(extrairCota).filter(c => c !== null)
  let topografia = null
  if (topoProps.every(p => p === undefined)) {
    topografia = { status: 'camada indisponível' }
  } else if (cotas.length >= 2) {
    const amp = Math.max(...cotas) - Math.min(...cotas)
    const declividade = Math.round((amp / 70) * 1000) / 10 // % sobre ~70 m de vão amostral
    topografia = { cotas_amostradas_m: cotas, amplitude_m: amp, declividade_estimada_pct: declividade }
  } else {
    topografia = { status: 'sem curvas no raio amostrado — terreno possivelmente plano ou camada esparsa', cotas_amostradas_m: cotas }
  }

  const sigla = extrairSigla(zonaProps)
  const emEixo = eixoProps === undefined ? null : (eixoProps !== null)
  const temTomb = tombProps === undefined ? null : (tombProps !== null)
  const operacao = ouProps ? (ouProps.nm_operacao || ouProps.nome || ouProps.tx_nome || 'Operação urbana identificada') : (ouProps === null ? null : undefined)

  const areaLote = parseFloat(req.query.area) || undefined
  const parametros = calcularParametros(sigla, emEixo === true, temTomb === true, areaLote)

  res.json({
    status: 'success',
    triangulacao: {
      zona: sigla || (zonaProps === undefined ? 'camada indisponível' : 'não identificada no ponto'),
      zona_propriedades: zonaProps || null,
      em_area_influencia_eixo: emEixo,
      operacao_urbana: operacao === undefined ? 'camada indisponível' : operacao,
      tombamento_no_ponto: temTomb,
      topografia,
      parametros_calculados: parametros,
      fonte: 'GeoSampa WMS (GetFeatureInfo) + base legislação 2016-2025',
      ressalva: 'Confirmação documental obrigatória: Ficha Técnica do lote (SQL) na SMUL e certidões — camadas WMS podem ter defasagem de publicação'
    }
  })
}

// GET /v1/geosampa/mapa?lat=&lng=&tema=&buffer= — prancha de sobreposição:
// imagem WMS (GetMap) da camada temática no entorno do lote, proxiada
// (evita CORS) para o front compor com a poligonal do terreno.
const TEMAS_MAPA = ['melhoramento', 'hidrografia', 'drenagem', 'alta_tensao', 'zona', 'topografia']

async function mapa(req, res) {
  const lat = parseFloat(req.query.lat)
  const lng = parseFloat(req.query.lng)
  const tema = String(req.query.tema || '')
  if (isNaN(lat) || isNaN(lng) || !TEMAS_MAPA.includes(tema)) {
    return res.status(400).json({ status: 'erro', mensagem: `Parâmetros: lat, lng e tema (${TEMAS_MAPA.join('|')})` })
  }
  const bufferM = Math.min(parseFloat(req.query.buffer) || 150, 600)
  const dLat = bufferM / 111320
  const dLng = bufferM / (111320 * Math.cos(lat * Math.PI / 180))
  const bbox = `${lng - dLng},${lat - dLat},${lng + dLng},${lat + dLat}`

  const discovered = await discoverLayers()
  const candidates = layerCache[tema] ? [layerCache[tema]] : [...(discovered[tema] || []), ...(LAYER_CANDIDATES[tema] || [])]

  for (const layer of candidates) {
    try {
      const params = new URLSearchParams({
        service: 'WMS', version: '1.1.1', request: 'GetMap',
        layers: layer.trim(), styles: '', bbox, srs: 'EPSG:4326',
        width: '640', height: '640', format: 'image/png', transparent: 'true'
      })
      const ctl = new AbortController()
      const t = setTimeout(() => ctl.abort(), 12000)
      const resp = await fetch(`${GEOSAMPA_WMS}?${params}`, { headers: { 'User-Agent': UA }, signal: ctl.signal })
      clearTimeout(t)
      if (!resp.ok) continue
      const ct = resp.headers.get('content-type') || ''
      if (!ct.includes('image')) continue // ServiceException XML → tenta próximo
      const buf = Buffer.from(await resp.arrayBuffer())
      if (buf.length < 200) continue
      layerCache[tema] = layer.trim()
      res.set('Content-Type', 'image/png')
      res.set('X-Geosampa-Layer', layer.trim())
      res.set('X-Geosampa-Bbox', bbox)
      return res.send(buf)
    } catch { /* próximo candidato */ }
  }
  res.status(404).json({ status: 'vazio', mensagem: `Camada de ${tema} indisponível no WMS`, bbox })
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

module.exports = { busca, lote, contexto, camadas, mapa, calcularParametros, extrairDadosLote, areaGeometriaM2 }
