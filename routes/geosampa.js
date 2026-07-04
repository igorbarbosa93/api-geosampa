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

module.exports = { busca, lote }
