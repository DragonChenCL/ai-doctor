import test from 'node:test'
import assert from 'node:assert/strict'
import { apiEndpoint } from '../src/api/endpoint.mjs'

const cases = [
  [
    [
      "https://api.openai.com/v1/",
      "https://api.openai.com",
      "v1",
      "chat/completions"
    ],
    "https://api.openai.com/v1/chat/completions"
  ],
  [
    [
      "https://proxy.example/api/v1",
      "https://api.openai.com",
      "v1",
      "models"
    ],
    "https://proxy.example/api/v1/models"
  ],
  [
    [
      "",
      "https://api.openai.com",
      "v1",
      "models"
    ],
    "https://api.openai.com/v1/models"
  ],
  [
    [
      "https://dashscope.aliyuncs.com/compatible-mode/v1/",
      "https://dashscope.aliyuncs.com",
      "compatible-mode/v1",
      "models"
    ],
    "https://dashscope.aliyuncs.com/compatible-mode/v1/models"
  ],
  [
    [
      "https://generativelanguage.googleapis.com/v1beta",
      "https://generativelanguage.googleapis.com",
      "v1",
      "models"
    ],
    "https://generativelanguage.googleapis.com/v1beta/models"
  ],
  [
    [
      "https://proxy.example/v1beta/",
      "https://generativelanguage.googleapis.com",
      "v1beta",
      "models/gemini:generateContent"
    ],
    "https://proxy.example/v1beta/models/gemini:generateContent"
  ],
  [
    [
      "https://proxy.example///",
      "https://api.openai.com",
      "v1",
      "models"
    ],
    "https://proxy.example/v1/models"
  ]
]
for (const [args, expected] of cases) {
  test(`endpoint: ${args[0] || args[1]} -> ${args[3]}`, () => assert.equal(apiEndpoint(...args), expected))
}
for (const bad of ['javascript:alert(1)', 'https://user:pass@example.com', 'https://example.com?key=secret', 'https://example.com#x']) {
  test(`reject invalid base: ${bad}`, () => assert.throws(() => apiEndpoint(bad, '', 'v1', 'models')))
}
