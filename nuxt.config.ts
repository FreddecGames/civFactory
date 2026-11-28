export default defineNuxtConfig({

	modules: ['@pinia/nuxt', '@nuxtjs/i18n', '@nuxt/ui' ],

	compatibilityDate: '2025-07-15',

	devtools: { enabled: false },

	ssr: false,

    css: ['~/assets/css/main.css'],

    app: {
		baseURL: '/civfactory/',		
        head: {
            link: [
                { rel: 'icon', type: 'image/png', href: '/civfactory/favicon.png' }
            ]
        }
    },

	nitro: {
		preset: 'github-pages'
	},

	routeRules: {
		'/': { redirect: { to: '/mission', statusCode: 301 } }
	},

	i18n: {
		locales: [
			{ code: 'en', file: 'en.json' }
		],
		defaultLocale: 'en'
	}
})
