export default defineAppConfig({
	ui: {
		colors: {
      		primary: 'amber',
      		neutral: 'neutral',
		},
		tabs: {
			slots: {
				list: 'relative flex p-0 group',
				trigger: [
          			'group relative flex-1 inline-flex flex-col items-center min-w-0 data-[state=inactive]:text-muted hover:data-[state=inactive]:not-disabled:text-default font-medium rounded-md disabled:cursor-not-allowed disabled:opacity-75',
          			'transition-colors'
        		],
			},
			variants: {
				size: {
					sm: {
						trigger: 'px-0 py-1.5 text-xs gap-1',
					},
				},
			},
		},
		modal: {
			slots: {
				header: 'px-3 py-2 sm:p-3 flex items-center justify-between gap-2',
				body: 'flex-1 p-3 sm:p-3 flex flex-col space-y-6',
			},
			variants: {
				fullscreen: {
					false: {
						content: 'w-full max-w-lg rounded-lg shadow-lg ring ring-default',
					},
				},
			},
			compoundVariants: [
				{ class: { overlay: 'grid place-items-center p-3 sm:py-3' }, },
			],
		},
		input: {
			variants: {
				size: {
					sm: {
						base: 'px-2.5 py-1.5 text-xs gap-1.5',
					},
				},
			},
		},
		textarea: {
			variants: {
				size: {
					sm: {
						base: 'px-2.5 py-1.5 text-xs gap-1.5',
					},
				},
			},
		},
	}
})