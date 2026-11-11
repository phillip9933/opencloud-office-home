import { expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory, RouterView } from 'vue-router'
import { fixtureServices } from '../../src/fixtures/services'
import { createOfficeContext } from '../../src/app/context'
import { fail } from '../../src/contracts/office'
vi.mock('@opencloud-eu/web-pkg', async () => {
  const { useRouter } = await import('vue-router')
  return { useRouter }
})
import OfficeHome from '../../src/views/OfficeHome.vue'

async function setup(remembered: boolean) {
  const services = fixtureServices()
  const context = createOfficeContext(services)
  if (remembered)
    context.preferences.lastFolder.docs = { spaceId: 'fixture-personal', itemId: 'reports' }
  vi.spyOn(services.catalog, 'listSpaces').mockResolvedValueOnce(fail('network'))
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/office/docs',
        name: 'office-docs',
        component: OfficeHome,
        props: { kind: 'docs', context }
      },
      { path: '/office/sheets', name: 'office-sheets', component: { template: '<div />' } },
      { path: '/office/slides', name: 'office-slides', component: { template: '<div />' } },
      { path: '/office/settings', name: 'office-settings', component: { template: '<div />' } }
    ]
  })
  await router.push('/office/docs')
  await router.isReady()
  const wrapper = mount(RouterView, { global: { plugins: [router] } })
  await flushPromises()
  return { context, wrapper }
}
it('shows a load failure with accurate retry advice', async () => {
  const { context, wrapper } = await setup(false)
  expect(context.model('docs').state.error).toBe(
    'The service could not be reached. Try loading again.'
  )
  expect(wrapper.text()).toContain('The service could not be reached')
  expect(wrapper.text()).not.toContain('Sign in again through OpenCloud')
  expect(wrapper.text()).not.toContain('No templates are available')
  expect(wrapper.findAll('button').some((button) => button.text() === 'Retry loading')).toBe(true)
  wrapper.unmount()
  context.dispose()
})
it('preserves the remembered creation folder through transient discovery failures', async () => {
  const { context, wrapper } = await setup(true)
  expect(context.preferences.lastFolder.docs?.itemId).toBe('reports')
  expect(context.model('docs').state.location.folder?.itemId).toBe('reports')
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Retry loading')!
    .trigger('click')
  await flushPromises()
  expect(context.model('docs').state.error).toBe('')
  expect(context.model('docs').state.location.folder?.itemId).toBe('reports')
  expect(context.preferences.lastFolder.docs?.itemId).toBe('reports')
  wrapper.unmount()
  context.dispose()
})
