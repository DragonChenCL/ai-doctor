import { marked } from 'marked'

// Parse in an inert template, then rebuild only explicitly allowed nodes.
// Remote images and arbitrary attributes are deliberately excluded.
const tags = new Set('p br hr h1 h2 h3 h4 h5 h6 strong b em i del s blockquote pre code ul ol li table thead tbody tr th td a'.split(' '))
export function renderSafeMarkdown(value) {
  const source = String(value ?? '')
  const output = document.createElement('div')
  try {
    const template = document.createElement('template')
    template.innerHTML = marked.parse(source)
    function copy(node, parent) {
      if (node.nodeType === 3) {
        parent.appendChild(document.createTextNode(node.textContent))
        return
      }
      if (node.nodeType !== 1) return
      const tag = node.localName
      if (node.namespaceURI !== 'http://www.w3.org/1999/xhtml') return
      if (!tags.has(tag)) {
        if (tag === 'img' && node.getAttribute('alt')) {
          parent.appendChild(document.createTextNode(node.getAttribute('alt')))
        }
        return
      }
      const el = document.createElement(tag)
      if (tag === 'a') {
        try {
          const url = new URL(node.getAttribute('href') || '')
          if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) {
            el.href = url.href
            el.target = '_blank'
            el.rel = 'noopener noreferrer'
            el.referrerPolicy = 'no-referrer'
          }
        } catch {}
      }
      for (const child of node.childNodes) copy(child, el)
      parent.appendChild(el)
    }
    for (const child of template.content.childNodes) copy(child, output)
  } catch {
    output.textContent = source
  }
  return output.innerHTML
}
