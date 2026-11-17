// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },
  devServer: { port: 3001 },
  runtimeConfig: {
    public: {
      graphqlUrl:
        process.env.NUXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:3000/graphql",
    },
  },
  modules: ["vuetify-nuxt-module", "@pinia/nuxt"],
  css: [
    "@mdi/font/css/materialdesignicons.css",
    "~/assets/css/data-table.scss",
    "~/assets/css/admin-dialog.scss",
  ],
  vuetify: {
    moduleOptions: {
      prefixComposables: true,
    },
    vuetifyOptions: {
      defaults: {
        VTextField: {
          variant: "outlined",
          color: "primary",
        },
        VDataTable: {
          noDataText: "No hay datos registrados",
        },
        VDataTableServer: {
          noDataText: "No hay datos registrados",
        },
      },
      theme: {
        defaultTheme: "lightTheme",
        themes: {
          darkTheme: {
            dark: true,
            colors: {
              primary: "#0086BF",
              secondary: "#005578",
              autocomplete: "#FFFFFF",
              darkLight5: "#333333",
              darkLight3: "#242424",
            },
          },
          lightTheme: {
            dark: false,
            colors: {
              primary: "#0086BF",
              secondary: "#d9edf6",
              autocomplete: "#000000",
              darkLight5: "#e6e6e6",
              darkLight3: "#f8f8f8",
            },
          },
        },
      },
      icons: {
        defaultSet: "mdi",
        sets: ["mdi"],
      },
    },
  },
});
