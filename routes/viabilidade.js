const { analyzeViability } = require('../services/claude')

const SUPPORTED_MIMETYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

module.exports = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      status: 'erro',
      mensagem: 'Campo "imagem" é obrigatório. Envie a imagem do mapa como multipart/form-data.'
    })
  }

  if (!SUPPORTED_MIMETYPES.includes(req.file.mimetype)) {
    return res.status(400).json({
      status: 'erro',
      mensagem: `Tipo de imagem não suportado: ${req.file.mimetype}. Use JPEG, PNG, GIF ou WEBP.`
    })
  }

  const { endereco, sql, coordenadas } = req.body || {}

  try {
    const result = await analyzeViability(
      req.file.buffer,
      req.file.mimetype,
      { endereco, sql, coordenadas }
    )
    res.json(result)
  } catch (err) {
    const status = err.message.includes('ANTHROPIC_API_KEY') ? 503 : 500
    res.status(status).json({ status: 'erro', mensagem: err.message })
  }
}
