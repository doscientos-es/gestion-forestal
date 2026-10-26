import { createFeatureLayersConfig } from '@doscientos/configs/architecture'
import { reactViteConfig } from '@doscientos/configs/oxlint/react-vite'

export default {
  // Skills copied by the Doscientos agent tooling are not part of the application.
  ignorePatterns: ['.agents/**', '.augment/**', 'dist/**'],
  extends: [reactViteConfig, createFeatureLayersConfig()],
  rules: {
    // Route modules intentionally compose the app shell and feature public APIs.
    'react/only-export-components': 'off',
  },
}
