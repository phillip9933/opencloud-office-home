import { defineConfig } from '@opencloud-eu/extension-sdk'

// DEV-LIMIT(DL-001): the native integration is under acceptance testing; full releases remain blocked.
// An unset flag must never produce a release-shaped package containing this placeholder.
if (process.env.OFFICE_SPIKE_BUILD !== '1' && process.env.OFFICE_NATIVE_TEST_BUILD !== '1') {
  throw new Error(
    'Release blocked: DL-001 requires a verified OpenCloud adapter. Use build:spike for local inspection only.'
  )
}
export default defineConfig({
  name: 'web-app-office',
  build: {
    outDir: process.env.OFFICE_NATIVE_TEST_BUILD === '1' ? 'dist-native-test' : 'dist-spike'
  }
})
