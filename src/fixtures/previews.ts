import type { OfficeKind } from '../contracts/office'

// DEV-LIMIT(DL-002): locally drawn stand-ins for administrator-supplied template preview images.
// They contain no text, so file names never reach the SVG markup.
const accent: Record<OfficeKind, string> = {
  docs: '#2f6fb3',
  sheets: '#1f8a5b',
  slides: '#c46a12'
}

function seed(name: string): number {
  return Array.from(name).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7)
}

function lines(x: number, y: number, width: number, count: number, gap: number, n: number) {
  return Array.from({ length: count }, (_, i) => {
    const w = width - ((n >> i) & 3) * 9
    return `<rect x="${x}" y="${y + i * gap}" width="${w}" height="3" rx="1.5" fill="#c9d3dc"/>`
  }).join('')
}

function docs(n: number, color: string) {
  const header =
    n % 2
      ? `<rect x="44" y="14" width="72" height="12" fill="${color}"/>`
      : `<rect x="52" y="18" width="40" height="5" rx="2" fill="${color}"/><rect x="52" y="27" width="24" height="3" rx="1.5" fill="#9fb0c0"/>`
  return `<rect x="40" y="8" width="80" height="112" fill="#fff" stroke="#d5dde5"/>${header}${lines(52, 40, 56, 10, 7, n)}`
}

function sheets(n: number, color: string) {
  const cells = Array.from({ length: 7 }, (_, row) =>
    Array.from({ length: 4 }, (_, col) => {
      const fill = row === 0 ? color : (row + col + n) % 5 === 0 ? '#dcefe5' : '#fff'
      return `<rect x="${16 + col * 32}" y="${16 + row * 12}" width="32" height="12" fill="${fill}" stroke="#d5dde5"/>`
    }).join('')
  ).join('')
  const bars = Array.from(
    { length: 5 },
    (_, i) =>
      `<rect x="${24 + i * 22}" y="${112 - ((n >> i) % 4) * 4 - 6}" width="12" height="${((n >> i) % 4) * 4 + 6}" fill="${color}" opacity="0.7"/>`
  ).join('')
  return `<rect x="8" y="8" width="144" height="112" fill="#fff" stroke="#d5dde5"/>${cells}${bars}`
}

function slides(n: number, color: string) {
  const band =
    n % 2
      ? `<rect x="8" y="22" width="144" height="90" fill="${color}"/><rect x="24" y="56" width="80" height="8" rx="2" fill="#fff"/><rect x="24" y="70" width="52" height="4" rx="2" fill="#ffffffb0"/>`
      : `<rect x="8" y="22" width="48" height="90" fill="${color}"/><rect x="68" y="50" width="70" height="8" rx="2" fill="#2c3a46"/>${lines(68, 66, 60, 3, 8, n)}`
  return `<rect x="8" y="22" width="144" height="90" fill="#fff" stroke="#d5dde5"/>${band}`
}

export function syntheticPreview(kind: OfficeKind, name: string): string {
  const n = seed(name)
  const color = accent[kind]
  const body =
    kind === 'docs' ? docs(n, color) : kind === 'sheets' ? sheets(n, color) : slides(n, color)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 128"><rect width="160" height="128" fill="#eef2f5"/>${body}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
