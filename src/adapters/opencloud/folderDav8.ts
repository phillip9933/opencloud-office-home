import { buildResource, type Resource, type WebDavResponseResource } from '@opencloud-eu/web-client'
import { DavNamespaces, type WebDAV } from '@opencloud-eu/web-client/webdav'
import { FolderListingLimitError, HttpStatusError } from './errors8'
import { FOLDER_ROW_LIMIT } from '../../contracts/office'

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024
const REQUEST_TIMEOUT_MS = 15_000
const DAV_PROPERTIES = ['resourcetype', 'getcontenttype', 'getlastmodified', 'creationdate']
const OC_PROPERTIES = ['fileid', 'name', 'permissions', 'remote-item-id', 'shareroot']
const BODY = `<d:propfind xmlns:d="${DavNamespaces.d}" xmlns:oc="${DavNamespaces.oc}"><d:prop>
${DAV_PROPERTIES.map((name) => `<d:${name}/>`).join('')}
${OC_PROPERTIES.map((name) => `<oc:${name}/>`).join('')}
</d:prop></d:propfind>`

export async function boundedFolderXml(response: Response, signal: AbortSignal): Promise<string> {
  if (response.status !== 207 || !response.body) {
    void response.body?.cancel().catch(() => undefined)
    throw new HttpStatusError(response.status)
  }
  const reader = response.body.getReader()
  const bytes = new Uint8Array(MAX_RESPONSE_BYTES)
  let length = 0
  let complete = false
  try {
    if (Number(response.headers.get('Content-Length')) > MAX_RESPONSE_BYTES)
      throw new FolderListingLimitError()
    while (true) {
      signal.throwIfAborted()
      const { done, value } = await reader.read()
      signal.throwIfAborted()
      if (done) {
        complete = true
        break
      }
      if (value.byteLength > bytes.byteLength - length) throw new FolderListingLimitError()
      bytes.set(value, length)
      length += value.byteLength
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, length))
  } finally {
    if (!complete) void reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}

function childElement(
  element: Element,
  name: string,
  namespace = DavNamespaces.d as string
): Element | undefined {
  return Array.from(element.children).find(
    (child) => child.localName === name && child.namespaceURI === namespace
  )
}

function readResource(element: Element, origin: string, davPath: string): Resource | undefined {
  if (element.localName !== 'response' || element.namespaceURI !== DavNamespaces.d) return
  const href = childElement(element, 'href')?.textContent
  if (!href || href.length > 4096) return
  const resolved = new URL(href, origin)
  if (resolved.origin !== origin || !resolved.pathname.startsWith(davPath)) return
  const props: Record<string, string> = {}
  let directory = false
  for (const status of element.children) {
    if (status.localName !== 'propstat' || status.namespaceURI !== DavNamespaces.d) continue
    if (!/^HTTP\/\d(?:\.\d)? 2\d\d(?:\s|$)/.test(childElement(status, 'status')?.textContent ?? ''))
      continue
    const properties = childElement(status, 'prop')
    if (!properties) continue
    for (const property of properties.children) {
      const { localName, namespaceURI } = property
      if (namespaceURI === DavNamespaces.d && localName === 'resourcetype')
        directory = !!childElement(property, 'collection')
      else if (
        (namespaceURI === DavNamespaces.d && DAV_PROPERTIES.includes(localName)) ||
        (namespaceURI === DavNamespaces.oc && OC_PROPERTIES.includes(localName))
      )
        props[localName] = property.textContent ?? ''
    }
  }
  if (!props.fileid) return
  const filename = decodeURIComponent(resolved.pathname.slice(davPath.length - 1))
  const basename = filename.replace(/\/$/, '').split('/').pop() ?? ''
  const stat = {
    filename,
    basename,
    lastmod: props.getlastmodified ?? '',
    size: 0,
    type: directory ? 'directory' : 'file',
    etag: null,
    props
  } as WebDavResponseResource
  return buildResource(stat, ['d:creationdate'])
}

function multistatus(xml: string): Element {
  if (/<!DOCTYPE/i.test(xml)) throw new Error('Invalid folder XML')
  const root = new DOMParser().parseFromString(xml, 'application/xml').documentElement
  if (root.localName !== 'multistatus' || root.namespaceURI !== DavNamespaces.d)
    throw new Error('Invalid folder response')
  return root
}

function folderResources(xml: string, origin: string, davPath: string) {
  const first = multistatus(xml).firstElementChild
  const resource = first && readResource(first, origin, davPath)
  if (!first || !resource) throw new HttpStatusError(404)
  const children: Resource[] = []
  let count = 0
  for (
    let row = first.nextElementSibling;
    row && count < FOLDER_ROW_LIMIT;
    row = row.nextElementSibling
  ) {
    count++
    if (row.localName !== 'response' || row.namespaceURI !== DavNamespaces.d) continue
    const item = readResource(row, origin, davPath)
    if (item) children.push(item)
  }
  return { resource, children }
}

/** Only the signed-in user's read-only folder listings use this bounded transport. */
export function boundedFolderList8(
  server: string,
  headers: () => HeadersInit,
  request: typeof fetch = fetch
): WebDAV['listFiles'] {
  return async (space, { fileId } = {}, { signal } = {}) => {
    const base = new URL(server)
    const davUrl = new URL(base)
    davUrl.pathname = `${base.pathname.replace(/\/$/, '')}/dav/`
    davUrl.hash = ''
    davUrl.search = ''
    const deadline = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    const lifetime = signal ? AbortSignal.any([signal, deadline]) : deadline

    async function propfind(url: URL, body: string, depth: string): Promise<string> {
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.origin !== base.origin ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        !url.pathname.startsWith(davUrl.pathname)
      )
        throw new HttpStatusError(404)
      const requestHeaders = new Headers(headers())
      requestHeaders.set('Content-Type', 'application/xml; charset=utf-8')
      requestHeaders.set('Depth', depth)
      const response = await request(url, {
        method: 'PROPFIND',
        headers: requestHeaders,
        body,
        signal: lifetime,
        redirect: 'error'
      })
      return boundedFolderXml(response, lifetime)
    }

    let path = '/'
    if (fileId) {
      const metadata = await propfind(
        new URL(`meta/${encodeURIComponent(fileId)}`, davUrl),
        `<d:propfind xmlns:d="${DavNamespaces.d}" xmlns:oc="${DavNamespaces.oc}"><d:prop><oc:meta-path-for-user/></d:prop></d:propfind>`,
        '0'
      )
      const root = multistatus(metadata)
      const row = root.firstElementChild
      const status = row && childElement(row, 'propstat')
      const prop = status && childElement(status, 'prop')
      const success =
        status &&
        /^HTTP\/\d(?:\.\d)? 2\d\d(?:\s|$)/.test(childElement(status, 'status')?.textContent ?? '')
      const returned =
        success && prop && childElement(prop, 'meta-path-for-user', DavNamespaces.oc)?.textContent
      if (
        !returned ||
        !returned.startsWith('/') ||
        returned.length > 4096 ||
        /[\\\u0000-\u001F\u007F]/.test(returned) ||
        returned.split('/').some((part) => part === '.' || part === '..')
      )
        throw new HttpStatusError(404)
      path = returned
    }
    const url = new URL(space.getWebDavUrl({ path: '/' }))
    const encoded = path.split('/').map(encodeURIComponent).join('/')
    url.pathname = `${url.pathname.replace(/\/$/, '')}${encoded}`
    return folderResources(await propfind(url, BODY, '1'), base.origin, davUrl.pathname)
  }
}
