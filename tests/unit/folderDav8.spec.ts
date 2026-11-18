import { expect, it, vi } from 'vitest'
import type { SpaceResource } from '@opencloud-eu/web-client'
import { FOLDER_ROW_LIMIT } from '../../src/contracts/office'
import { boundedFolderList8, boundedFolderXml } from '../../src/adapters/opencloud/folderDav8'
import { nativeAccess8 } from '../../src/adapters/opencloud/access8'
import { FolderListingLimitError } from '../../src/adapters/opencloud/errors8'

const base = 'https://cloud.example'
const signal = new AbortController().signal
const spaces = '/dav/spaces/team'
function envelope(body: string) {
  return new Response(
    `<d:multistatus xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">${body}</d:multistatus>`,
    { status: 207 }
  )
}
function row(href: string, props: string) {
  return `<d:response><d:href>${href}</d:href><d:propstat><d:prop>${props}</d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>`
}

it('checks stream bytes even when no content length is available and cancels at the limit', async () => {
  const cancel = vi.fn()
  let reads = 0
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      reads++
      controller.enqueue(new Uint8Array(1024 * 1024))
    },
    cancel
  })
  await expect(
    boundedFolderXml(new Response(stream, { status: 207 }), signal)
  ).rejects.toBeInstanceOf(FolderListingLimitError)
  expect(reads).toBeLessThanOrEqual(4)
  expect(cancel).toHaveBeenCalledOnce()
})

it('resolves a folder identity and maps a bounded number of direct DAV rows through the SDK', async () => {
  const space = {
    id: 'team',
    getWebDavUrl: ({ path }: { path: string }) => `${base}${spaces}${path}`
  } as SpaceResource
  const folder = `${spaces}/Policies%20%25%23%3F%20%E6%97%A5`
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      envelope(
        row('/dav/meta/folder', '<oc:meta-path-for-user>/Policies %#? 日</oc:meta-path-for-user>')
      )
    )
    .mockResolvedValueOnce(
      envelope(
        row(
          folder,
          '<d:resourcetype><d:collection/></d:resourcetype><oc:fileid>folder</oc:fileid><oc:permissions>R</oc:permissions>'
        ) +
          Array.from({ length: FOLDER_ROW_LIMIT + 2 }, (_, index) =>
            row(
              `${folder}/Policy%20${index}.odt`,
              `<oc:fileid>policy-${index}</oc:fileid><oc:permissions>R</oc:permissions><d:getcontenttype>application/vnd.oasis.opendocument.text</d:getcontenttype>`
            )
          ).join('')
      )
    )
  const list = boundedFolderList8(base, () => ({}), request)
  const result = await list(space, { fileId: 'folder' }, { signal })
  expect(
    request.mock.calls.map(([url, options]) => [
      String(url),
      new Headers(options?.headers).get('Depth')
    ])
  ).toEqual([
    [`${base}/dav/meta/folder`, '0'],
    [`${base}${folder}`, '1']
  ])
  expect(result.resource).toMatchObject({
    fileId: 'folder',
    isFolder: true,
    path: '/Policies %#? 日'
  })
  expect(result.children).toHaveLength(FOLDER_ROW_LIMIT)
  expect(result.children?.[0]).toMatchObject({ name: 'Policy 0.odt', fileId: 'policy-0' })
  expect(result.children?.[0] && nativeAccess8(result.children[0]).read).toBe(true)
})
