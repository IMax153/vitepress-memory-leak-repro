import { transformerTwoslash } from "@shikijs/vitepress-twoslash"
import { tabsMarkdownPlugin } from "vitepress-plugin-tabs"
import { npmCommandsMarkdownPlugin } from "vitepress-plugin-npm-commands"
import { defineConfig } from "vitepress"
import { generateSidebar } from "./utils/sidebar"

export default defineConfig({
  title: "Effect Documentation",
  description: "Effect is a powerful TypeScript library designed to help developers easily create complex, synchronous, and asynchronous programs.",
  cleanUrls: true,
  srcDir: "src",
  themeConfig: {
    editLink: {
      pattern: "https://github.com/Effect-TS/website/edit/main/docs/:path",
      text: "Edit this page on GitHub"
    },
    logo: {
      light: "/logo.svg",
      dark: "/logo-dark.svg",
      alt: "The Effect logo"
    },
    outline: {
      level: "deep"
    },
    sidebar: generateSidebar({
      collapseDepth: 2,
      documentRootPath: "src",
      sortMenusByFrontmatterOrder: true,
      useFolderTitleFromIndexFile: true,
      useTitleFromFrontmatter: true,
    }),
    siteTitle: false,
    socialLinks: [
      { icon: "github", link: "https://github.com/Effect-TS", ariaLabel: "GitHub" },
      { icon: "discord", link: "https://discord.gg/effect-ts", ariaLabel: "Discord" }
    ]
  },
  markdown: {
    theme: {
      light: "github-light",
      dark: "github-dark"
    },
    config(md) {
      md.use(tabsMarkdownPlugin)
      md.use(npmCommandsMarkdownPlugin)
    },
    codeTransformers: [
      transformerTwoslash({
        explicitTrigger: true,
      })
    ]
  },
})

