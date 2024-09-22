import TwoslashFloatingVue from '@shikijs/vitepress-twoslash/client'
import { h } from "vue"
import type { Theme } from "vitepress"
import DefaultTheme from "vitepress/theme"
import { enhanceAppWithTabs } from "vitepress-plugin-tabs/client"

import "@shikijs/vitepress-twoslash/style.css"
import "./style.css"

const theme: Theme = {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
    })
  },
  enhanceApp({ app }) {
    enhanceAppWithTabs(app)
    app.use(TwoslashFloatingVue)
  }
}

export default theme
