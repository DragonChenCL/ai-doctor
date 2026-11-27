import axios from 'axios'
import { wrapUrlForDev } from './http'
import { apiEndpoint } from './endpoint.mjs'

const http = axios.create({ timeout: 120000 })

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms))
}

export async function callAI(doctor, fullPrompt, historyForProvider = []) {
  const { provider, model, apiKey, baseUrl } = doctor

  if (!apiKey) {
    await sleep(600)
    return `【模拟回复 - ${doctor.name}】\n根据提供的病历与讨论历史，我认为需要进一步完善体格检查与辅助检查以明确诊断。`
  }

  let response
  switch (provider) {
    case 'openai':
      response = await callOpenAI({ apiKey, model, fullPrompt, history: historyForProvider, baseUrl })
      break
    case 'anthropic':
      response = await callAnthropic({ apiKey, model, fullPrompt, history: historyForProvider, baseUrl })
      break
    case 'gemini':
      response = await callGemini({ apiKey, model, fullPrompt, history: historyForProvider, baseUrl })
      break
    case 'siliconflow':
      response = await callSiliconFlow({ apiKey, model, fullPrompt, history: historyForProvider, baseUrl })
      break
    case 'modelscope':
      response = await callModelScope({ apiKey, model, fullPrompt, history: historyForProvider, baseUrl })
      break
    default:
      throw new Error('不支持的 AI 服务商')
  }
  if (typeof response !== 'string' || !response.trim()) throw new Error('模型未返回有效文本，请检查模型配置或服务状态')
  return response.trim()
}

async function callOpenAI({ apiKey, model, fullPrompt, history, baseUrl }) {
  const messages = [
    { role: 'system', content: fullPrompt.system },
    ...history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: fullPrompt.user }
  ]
  const url = wrapUrlForDev(apiEndpoint(baseUrl, 'https://api.openai.com', 'v1', 'chat/completions'))
  const res = await http.post(
    url,
    { model, messages, temperature: 0.7 },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  )
  return res.data.choices?.[0]?.message?.content?.trim() || ''
}

async function callAnthropic({ apiKey, model, fullPrompt, history, baseUrl }) {
  const url = wrapUrlForDev(apiEndpoint(baseUrl, 'https://api.anthropic.com', 'v1', 'messages'))
  const messages = [
    ...history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: fullPrompt.user }
  ]
  const res = await http.post(
    url,
    {
      model,
      max_tokens: 1024,
      system: fullPrompt.system,
      messages
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    }
  )
  return res.data?.content?.[0]?.text?.trim() || ''
}

async function callGemini({ apiKey, model, fullPrompt, history, baseUrl }) {
  const url = wrapUrlForDev(apiEndpoint(baseUrl, 'https://generativelanguage.googleapis.com', 'v1beta', `models/${encodeURIComponent(model)}:generateContent`))

  const contents = [
    ...history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: fullPrompt.user }] }
  ]

  const headers = { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }

  const res = await http.post(
    url,
    {
      systemInstruction: { role: 'system', parts: [{ text: fullPrompt.system }] },
      contents
    },
    { headers }
  )

  return (
    res.data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n').trim() ||
    ''
  )
}

async function callSiliconFlow({ apiKey, model, fullPrompt, history, baseUrl }) {
  const messages = [
    { role: 'system', content: fullPrompt.system },
    ...history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: fullPrompt.user }
  ]
  const url = wrapUrlForDev(apiEndpoint(baseUrl, 'https://api.siliconflow.cn', 'v1', 'chat/completions'))
  const res = await http.post(
    url,
    { model, messages, temperature: 0.7 },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  )
  const choice = res.data?.choices?.[0]
  const content = choice?.message?.content || choice?.text
  return (Array.isArray(content) ? content.join('\n') : content || res.data?.output_text || '').trim()
}

async function callModelScope({ apiKey, model, fullPrompt, history, baseUrl }) {
  const messages = [
    { role: 'system', content: fullPrompt.system },
    ...history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: fullPrompt.user }
  ]
  const url = wrapUrlForDev(apiEndpoint(baseUrl, 'https://dashscope.aliyuncs.com', 'compatible-mode/v1', 'chat/completions'))
  const res = await http.post(
    url,
    { model, messages, temperature: 0.7 },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  )
  const choice = res.data?.choices?.[0]
  const content = choice?.message?.content || choice?.text
  return (Array.isArray(content) ? content.join('\n') : content || res.data?.output_text || '').trim()
}
