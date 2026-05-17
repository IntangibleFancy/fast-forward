import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import './style.css'
import App from './App.vue'

const vuetify = createVuetify({
  components,
  directives,
  icons: { defaultSet: 'mdi' },
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          primary: '#42A5F5',
          secondary: '#26C6DA',
          background: '#0F0F17',
          surface: '#1A1A28',
          'surface-variant': '#252538',
          warning: '#FFB74D',
          success: '#66BB6A',
          error: '#EF5350',
        },
      },
    },
  },
})

createApp(App).use(vuetify).mount('#app')
