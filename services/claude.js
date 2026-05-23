const Anthropic = require('@anthropic-ai/sdk')
const { buildSystemPrompt, buildUserMessage } = require('../prompts/viabilidade')

const SUPPORTED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY não configurada no ambiente.')
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

async function analyzeViability(imageBuffer, mediaType, extras = {}) {
  if (!SUPPORTED_MEDIA_TYPES.includes(mediaType)) {
    throw new Error(`Tipo de imagem não suportado: ${mediaType}. Use JPEG, PNG, GIF ou WEBP.`)
  }

  const client = getClient()
  const base64Image = imageBuffer.toString('base64')
  const userContent = buildUserMessage(base64Image, mediaType, extras)

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 8096,
    system: [
      {
        type: 'text',
        text: buildSystemPrompt(),
        cache_control: { type: 'ephemeral' }
      }
    ],
    messages: [{ role: 'user', content: userContent }]
  })

  const text = response.content[0].text.trim()

  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Resposta da IA não é JSON válido. Tente novamente.')
  }
}

module.exports = { analyzeViability }
