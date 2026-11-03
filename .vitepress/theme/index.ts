import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import PdfViewer from './components/PdfViewer.vue'
import ApiSpec from './components/ApiSpec.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('PdfViewer', PdfViewer)
    app.component('ApiSpec', ApiSpec)
  },
} satisfies Theme
