const { analyzeViability } = require('../services/claude')

const SUPPORTED_MIMETYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

module.exports = async (req, res) => {
  const { endereco, sql, coordenadas } = req.body || {}

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
      { endereco, sql, coordenadas }
    )
    res.json(result)
  } catch (err) {
    const status = err.message.includes('ANTHROPIC_API_KEY') ? 503 : 500
    res.status(status).json({ status: 'erro', mensagem: err.message })
  }
}
