import { config } from '@vue/test-utils'

// Happy DOM has no icon asset server. Test component behavior without SVG HTTP requests;
// real OpenCloud icons and their loading are exercised by the browser journeys.
config.global.stubs = { OcIcon: true }
