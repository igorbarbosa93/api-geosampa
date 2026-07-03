const Anthropic = require('@anthropic-ai/sdk')
const { buildSystemPrompt, buildUserMessage } = require('../prompts/viabilidade')

const SUPPORTED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// claude-sonnet-5: rápido e preciso (padrão). Para laudos mais profundos,
// configure ANTHROPIC_MODEL=claude-opus-4-7 no ambiente (2-3x mais lento).
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'

function getApiKey() {
  const raw = process.env.ANTHROPIC_API_KEY
  if (!raw) {
    throw new Error('ANTHROPIC_API_KEY não configurada no ambiente.')
  }
  // Remove espaços, quebras de linha e aspas acidentais da colagem
  const key = raw.trim().replace(/^["']+|["']+$/g, '')
  if (!key.startsWith('sk-ant-')) {
    throw new Error('ANTHROPIC_API_KEY inválida: a chave deve começar com "sk-ant-". Gere uma nova em console.anthropic.com → API Keys e cole o valor completo, sem aspas.')
  }
  if (key.startsWith('sk-ant-admin')) {
    throw new Error('ANTHROPIC_API_KEY inválida: essa é uma chave de administrador (sk-ant-admin...), que não serve para análises. Gere uma chave de API padrão em console.anthropic.com → API Keys.')
  }
  return key
}

function getClient() {
  return new Anthropic({ apiKey: getApiKey() })
}

async function analyzeViability(imageBuffer, mediaType, extras = {}) {
  if (!SUPPORTED_MEDIA_TYPES.includes(mediaType)) {
    throw new Error(`Tipo de imagem não suportado: ${mediaType}. Use JPEG, PNG, GIF ou WEBP.`)
  }

  const client = getClient()
  const base64Image = imageBuffer.toString('base64')
  const userContent = buildUserMessage(base64Image, mediaType, extras)

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 20000,
    system: [
      {
        type: 'text',
        text: buildSystemPrompt(),
        cache_control: { type: 'ephemeral' }
      }
    ],
    messages: [{ role: 'user', content: userContent }]
  })

  if (response.stop_reason === 'max_tokens') {
    throw new Error('O laudo excedeu o tamanho máximo de resposta. Tente novamente com uma imagem mais simples ou informe o endereço/SQL para reduzir a análise.')
  }

  let text = (response.content.find(b => b.type === 'text')?.text || '').trim()

  // Remove cercas de markdown e texto fora do objeto JSON
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) text = text.slice(start, end + 1)

  try {
    return JSON.parse(text)
  } catch {
    console.error('[viabilidade] Resposta não-JSON da IA (inicio):', text.slice(0, 500))
    throw new Error('Resposta da IA não é JSON válido. Tente novamente.')
  }
}

module.exports = { analyzeViability }
