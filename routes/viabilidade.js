const { analyzeViability } = require('../services/claude')
const { estudoDeMassa } = require('../services/implantacao')

const SUPPORTED_MIMETYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

module.exports = async (req, res) => {
  const { endereco, sql, coordenadas } = req.body || {}

  // Triangulação oficial vinda do mapa (JSON string de /geosampa/contexto)
  let contexto = null
  if (req.body && req.body.contexto) {
    try { contexto = JSON.parse(req.body.contexto) } catch (e) {
      console.error('[viabilidade] contexto recebido mas inválido (JSON.parse falhou) — análise seguirá SEM dados oficiais:', String(req.body.contexto).slice(0, 120))
      contexto = null
    }
  }

  // Estudo de massa determinístico (formatos Tenda) quando há área + parâmetros
  if (contexto && contexto.area_total_m2 && contexto.lotes && contexto.lotes[0]) {
    const tri = contexto.lotes[0].triangulacao || {}
    const parametros = tri.parametros_calculados
    const decliv = tri.topografia && typeof tri.topografia.declividade_estimada_pct === 'number'
      ? tri.topografia.declividade_estimada_pct : undefined
    if (parametros) {
      try {
        contexto.estudo_massa = estudoDeMassa({
          areaTerrenoM2: contexto.area_total_m2,
          parametros,
          declividadePct: decliv
        })
      } catch (e) {
        console.error('[viabilidade] estudo de massa falhou:', e.message)
      }
    }
  }

  // Imagem OU localização (SQL/endereço/coordenadas vindos do mapa)
  if (!req.file && !endereco && !sql && !coordenadas) {
    return res.status(400).json({
      status: 'erro',
      mensagem: 'Envie a imagem do mapa OU informe sql/endereco/coordenadas do lote selecionado.'
    })
  }

  if (req.file && !SUPPORTED_MIMETYPES.includes(req.file.mimetype)) {
    return res.status(400).json({
      status: 'erro',
      mensagem: `Tipo de imagem não suportado: ${req.file.mimetype}. Use JPEG, PNG, GIF ou WEBP.`
    })
  }

  try {
    const result = await analyzeViability(
      req.file ? req.file.buffer : null,
      req.file ? req.file.mimetype : null,
      { endereco, sql, coordenadas, contexto }
    )
    res.json(result)
  } catch (err) {
    const status = err.message.includes('ANTHROPIC_API_KEY') ? 503 : 500
    res.status(status).json({ status: 'erro', mensagem: err.message })
  }
}
