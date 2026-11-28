<script setup lang="ts">

	import { computed, ref, onMounted, onBeforeUnmount } from 'vue'

	import { useGameStore } from '~/stores/game'

	const gameStore = useGameStore()

	// Game tick

	const fixedTickSeconds = 0.05

	let lastTimestamp = 0
	let tickAccumulator = 0
	let animationFrameId: number | null = null

	const scheduleNextTick = () => {

		if (animationFrameId !== null || document.hidden || gameStore.isPaused)
			return

		animationFrameId = requestAnimationFrame(runGameLoop)
	}

	const runGameLoop = (timestamp: number) => {

		animationFrameId = null

		if (document.hidden || gameStore.isPaused) {

			lastTimestamp = 0
			tickAccumulator = 0
			
			return
		}

		if (!lastTimestamp) lastTimestamp = timestamp

		let deltaSeconds = (timestamp - lastTimestamp) / 1000
		lastTimestamp = timestamp

		tickAccumulator += deltaSeconds

		while (tickAccumulator >= fixedTickSeconds) {

			gameStore.processGameTick(fixedTickSeconds)
			tickAccumulator -= fixedTickSeconds
		}

		scheduleNextTick()
	}

	watch(() => gameStore.isPaused, (isPaused) => {

		if (!isPaused && animationFrameId === null) {

			lastTimestamp = 0
			tickAccumulator = 0
			
			scheduleNextTick()
		}
	})
	
    watch(() => gameStore.hasWon, (newHasWon) => {

        if (hasLoadedGame && newHasWon) {

			gameStore.isOptionsModalOpen = false
			gameStore.isScenariosModalOpen = false

			gameStore.isVictoryModalOpen = true
		}
    })

	// Navigation

	const route = useRoute()

	const activeTab = computed(() => {

		const pathSegments = route.path.split('/').filter(Boolean)
		const currentPage = pathSegments[pathSegments.length - 1]

		return currentPage === 'progression' || currentPage === 'inventory' || currentPage === 'building' || currentPage === 'production' || currentPage === 'storage'
			? currentPage
			: 'progression'
	})

	const tabs = [

		{ label:$t('tabs.progression'), value:'progression', icon:'i-lucide-target' },
		{ label:$t('tabs.inventory'), value:'inventory', icon:'i-lucide-list' },
		{ label:$t('tabs.building'), value:'building', icon:'i-lucide-hand' },
		{ label:$t('tabs.production'), value:'production', icon:'i-lucide-trending-up' },
		{ label:$t('tabs.storage'), value:'storage', icon:'i-lucide-package' },
	]

	const localePath = useLocalePath()

	const navigateToTab = (tab: string) => {

		const path = tab === 'progression' ? '/' : `/${tab}`
		return navigateTo(localePath(path))
	}

	// Translations

	const { locale, getLocaleMessage, setLocaleMessage } = useI18n()

	type LocaleMessages = Record<string, unknown>

	const baseLocaleMessages = new Map<string, LocaleMessages>()

	let isScenarioLocalizationReady = false
	let scenarioLocaleRequestId = 0

	const mergeLocaleMessages = (base: LocaleMessages, scenario: LocaleMessages): LocaleMessages => {

		const merged = { ...base }

		for (const [key, scenarioValue] of Object.entries(scenario)) {

			const baseValue = merged[key]

			const canMergeNestedObjects =
				baseValue !== null &&
				typeof baseValue === 'object' &&
				!Array.isArray(baseValue) &&
				scenarioValue !== null &&
				typeof scenarioValue === 'object' &&
				!Array.isArray(scenarioValue)

			merged[key] = canMergeNestedObjects
				? mergeLocaleMessages(baseValue as LocaleMessages, scenarioValue as LocaleMessages)
				: scenarioValue
		}

		return merged
	}

	const loadScenarioTranslations = async (scenarioId: string, localeCode: string) => {

		const requestId = ++scenarioLocaleRequestId
		let baseMessages = baseLocaleMessages.get(localeCode)

		if (!baseMessages) {

			baseMessages = getLocaleMessage(localeCode) as LocaleMessages
			baseLocaleMessages.set(localeCode, baseMessages)
		}

		const response = await fetch(`/civfactory/scenarios/${scenarioId}/locales/${localeCode}.json`)
		if (requestId !== scenarioLocaleRequestId) return

		if (response.status === 404) {

			setLocaleMessage(localeCode, baseMessages)
			return
		}

		if (!response.ok) {
			throw new Error(`Failed to load scenario translations: ${response.status} ${response.statusText}`)
		}

		const scenarioMessages: unknown = await response.json()
		if (!scenarioMessages || typeof scenarioMessages !== 'object' || Array.isArray(scenarioMessages))
			throw new Error(`Invalid scenario translation file for locale "${localeCode}"`)

		if (requestId !== scenarioLocaleRequestId) return

		setLocaleMessage(localeCode, mergeLocaleMessages(baseMessages, scenarioMessages as LocaleMessages))
	}

	watch([() => gameStore.currentScenarioId, locale], async ([scenarioId, localeCode]) => {

		if (!isScenarioLocalizationReady) return

		try {

			await loadScenarioTranslations(scenarioId, localeCode)
		}
		catch (err: any) {

			loadingError.value = err.message
			console.error(err)
		}
	})

	// Page loading

	const isLoading = ref<boolean>(true)
	const loadingError = ref<string | null>(null)
		
	let hasLoadedGame = false

	const saveOnPageHide = () => {

		if (hasLoadedGame && !gameStore.isRefreshing) gameStore.saveLocalData()
	}

	const handleVisibilityChange = () => {

		if (document.hidden) {

			if (animationFrameId !== null)
				cancelAnimationFrame(animationFrameId)

			lastTimestamp = 0
			tickAccumulator = 0
			animationFrameId = null

			return
		}

		if (hasLoadedGame) {

			gameStore.processOfflineProgress()

			scheduleNextTick()
		}
	}

	onMounted(async () => {

		isLoading.value = true
		loadingError.value = null

		window.addEventListener('pagehide', saveOnPageHide)
		document.addEventListener('visibilitychange', handleVisibilityChange)

		try {

			await gameStore.loadLocalData()

			await loadScenarioTranslations(gameStore.currentScenarioId, locale.value)
			isScenarioLocalizationReady = true

			hasLoadedGame = true
		
			scheduleNextTick()

			gameStore.startAutoSave(30000)
		}
		catch (err: any) {

			loadingError.value = err.message
			console.error(err)
		}
		finally {

			isLoading.value = false
		}
	})

	onBeforeUnmount(() => {

		window.removeEventListener('pagehide', saveOnPageHide)
		document.removeEventListener('visibilitychange', handleVisibilityChange)

		saveOnPageHide()

		gameStore.stopAutoSave()

		if (animationFrameId !== null)
			cancelAnimationFrame(animationFrameId)

		lastTimestamp = 0
		tickAccumulator = 0
		animationFrameId = null
	})

</script>

<template>

	<div class="min-h-screen text-neutral-100 flex flex-col">

		<!-- Loading Card -->
		<div v-if="isLoading" class="flex flex-col items-center justify-center min-h-screen py-12 px-4 text-center">
			<UCard :ui="{ 'body': 'p-3 sm:p-3 max-w-md' }">
				<div class="space-y-2">

					<h1 class="text-xl font-bold text-white flex items-center justify-center gap-2">
						<img src="/favicon.png" :alt="$t('gameName')" class="size-6 object-contain" />
						{{ $t('gameName') }}
					</h1>

					<div class="flex flex-col space-y-1 items-center">
						<span class="text-primary text-xs">{{ $t('loading.text') }}</span>
						<UProgress size="xs" animation="carousel" class="w-64" />
					</div>

				</div>
			</UCard>
		</div>

		<!-- Error Screen -->
		<div v-else-if="loadingError" class="flex flex-col items-center justify-center min-h-screen py-12 px-4 text-center">
			<UCard :ui="{ 'body': 'p-3 sm:p-3 max-w-md' }">
				<div class="space-y-2 items-center">

					<div class="flex flex-col space-y-1">
						<UIcon name="i-lucide-alert-triangle" class="w-12 h-12 text-error mx-auto" />
						<h2 class="text-lg font-semibold text-white">{{ $t('loading.error') }}</h2>
						<p class="text-sm text-error italic">"{{ loadingError }}"</p>
					</div>

					<UButton color="error" variant="subtle" block @click="gameStore.wipeLocalData()">
						{{ $t('loading.error_button') }}
					</UButton>

				</div>
			</UCard>
		</div>

		<!-- Main Screen -->
		<main v-else class="flex-1 flex flex-col">

			<!-- Page Header -->
			<div class="fixed top-0 z-50 w-full">
				<UContainer class="px-0 sm:px-0 lg:px-0 backdrop-blur max-w-sm mx-auto bg-neutral-900/70 space-y-1.5">

					<header class="px-3 pt-2 flex justify-between gap-3">

						<h1 class="text-lg font-bold text-neutral-900 dark:text-white flex items-center justify-center gap-2">
							<img src="/favicon.png" :alt="$t('gameName')" class="size-5" />
							{{ gameStore.customGameName || $t('gameName') }}
						</h1>

						<div class="flex items-center gap-3">

							<UTooltip :text="$t('options.title')">
								<UButton color="primary" variant="ghost" icon="i-lucide-settings" square size="md"
									@click="gameStore.isOptionsModalOpen = true" />
							</UTooltip>

							<UTooltip :text="$t('scenarios.title')">
								<UButton color="primary" variant="ghost" icon="i-lucide-settings-2" square size="md"
									@click="gameStore.isScenariosModalOpen = true" />
							</UTooltip>

						</div>

					</header>

					<UTabs :model-value="activeTab" :items="tabs" size="sm"
						@update:model-value="navigateToTab"
						variant="link" :ui="{ list: 'justify-center' }" />

				</UContainer>
			</div>

			<!-- Page Content -->
			<div class="flex-1 flex flex-col">
				<UContainer class="pt-[108px] pb-[48px] flex-1 sm:px-3 lg:px-3 max-w-sm mx-auto bg-neutral-900/70 px-3 flex flex-col space-y-6">
					<slot />
				</UContainer>
			</div>

		</main>

	</div>

	<!-- Options Modal -->
	<ModalOptions v-model:open="gameStore.isOptionsModalOpen" />

	<!-- Scenarios Modal -->
	<ModalScenarios v-model:open="gameStore.isScenariosModalOpen" />

	<!-- Victory Modal -->
	<ModalVictory v-model:open="gameStore.isVictoryModalOpen" />

</template>
