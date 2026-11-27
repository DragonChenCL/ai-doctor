// Build provider endpoints from either a host or an explicitly versioned API root.
export function apiEndpoint(baseUrl, fallback, version, resource) {
  const root = new URL(String(baseUrl || '').trim() || fallback)
  if (!['http:', 'https:'].includes(root.protocol) || root.username || root.password || root.search || root.hash) {
    throw new Error('API Base URL 必须是无账号密码、查询参数和片段的 HTTP(S) 地址')
  }
  const path = root.pathname.replace(/\/+$/, '')
  const prefix = /\/v\d+(?:beta\d*|alpha\d*)?$/i.test(path) ? path : `${path}/${version}`
  root.pathname = `${prefix}/${resource}`
  return root.href
}
