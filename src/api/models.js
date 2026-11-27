import axios from 'axios'
import { wrapUrlForDev } from './http'
import { apiEndpoint } from './endpoint.mjs'

const http = axios.create({ timeout: 20000 })

function toOptions(list) {
  return list.map((m) => ({ label: m.displayName ? `${m.id} (${m.displayName})` : m.id, value: m.id }))
}

export async function listModels(provider, apiKey, baseUrl) {
  switch (provider) {
    case 'openai':
      return toOptions(await listOpenAIModels(apiKey, baseUrl))
    case 'anthropic':
      return toOptions(await listAnthropicModels(apiKey, baseUrl))
    case 'gemini':
      return toOptions(await listGeminiModels(apiKey, baseUrl))
    case 'siliconflow':
      return toOptions(await listSiliconFlowModels(apiKey, baseUrl))
    case 'modelscope':
      return toOptions(await listModelScopeModels(apiKey, baseUrl))
    default:
      return []
  }
}

export async function listOpenAIModels(apiKey, baseUrl) {
  const url = wrapUrlForDev(apiEndpoint(baseUrl, 'https://api.openai.com', 'v1', 'models'))
  const res = await http.get(url, {
    headers: { Authorization: `Bearer ${apiKey}` }
  })
  const data = res.data?.data || []
  return data
    .map((m) => ({ id: m.id, displayName: m.owned_by ? m.owned_by : undefined }))
    .sort((a, b) => a.id.localeCompare(b.id))
}

export async function listAnthropicModels(apiKey, baseUrl) {
  const url = wrapUrlForDev(apiEndpoint(baseUrl, 'https://api.anthropic.com', 'v1', 'models'))
  const res = await http.get(url, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    }
  })
  const arr = res.data?.data || res.data?.models || []
  return arr
    .map((m) => ({ id: m.id || m.slug || m.name, displayName: m.display_name || undefined }))
    .filter((m) => !!m.id)
    .sort((a, b) => a.id.localeCompare(b.id))
}

export async function listGeminiModels(apiKey, baseUrl) {
  // Honor an explicitly configured API version; otherwise try both versions.
  const paths = [...new Set(['v1', 'v1beta'].map(version =>
    apiEndpoint(baseUrl, 'https://generativelanguage.googleapis.com', version, 'models')
  ))]
  let lastError
  for (const p of paths) {
    try {
      const res = await http.get(wrapUrlForDev(p), { headers: { 'x-goog-api-key': apiKey } })
      const arr = res.data?.models || []
      return arr.map((m) => ({ id: (m.name || '').replace(/^models\//, ''), displayName: m.displayName }))
        .filter(m => m.id)
        .sort((a, b) => a.id.localeCompare(b.id))
    } catch (e) {
      lastError = e
      if (![404, 405].includes(e?.response?.status)) throw e
    }
  }
  throw lastError || new Error('无法获取 Gemini 模型列表')
}

export async function listSiliconFlowModels(apiKey, baseUrl) {
  const url = wrapUrlForDev(apiEndpoint(baseUrl, 'https://api.siliconflow.cn', 'v1', 'models'))
  const res = await http.get(url, {
    headers: { Authorization: `Bearer ${apiKey}` }
  })
  const data = res.data?.data || res.data?.models || []
  return data
    .map((m) => ({
      id: m.id || m.name,
      displayName: m.display_name || m.owned_by || m.provider || undefined
    }))
    .filter((m) => !!m.id)
    .sort((a, b) => a.id.localeCompare(b.id))
}

export async function listModelScopeModels(apiKey, baseUrl) {
  const url = wrapUrlForDev(apiEndpoint(baseUrl, 'https://dashscope.aliyuncs.com', 'compatible-mode/v1', 'models'))
  const res = await http.get(url, {
    headers: { Authorization: `Bearer ${apiKey}` }
  })
  const data = res.data?.data || res.data?.models || []
  return data
    .map((m) => ({
      id: m.id || m.name,
      displayName: m.display_name || m.owned_by || m.provider || undefined
    }))
    .filter((m) => !!m.id)
    .sort((a, b) => a.id.localeCompare(b.id))
}
