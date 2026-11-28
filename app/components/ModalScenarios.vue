<script setup lang="ts">

	import { useGameStore } from '~/stores/game'

	const gameStore = useGameStore()

</script>

<template>

	<UModal scrollable :ui="{ content: 'w-[calc(100vw-1.5rem)] min-w-0', body: 'min-w-0' }">
		
		<!-- Modal Header -->
		<template #header>

			<div class="flex items-center gap-3">
				<UIcon name="i-lucide-settings-2" class="text-primary size-5" />
				<h3 class="text-lg font-bold text-white">{{ $t('scenarios.title') }}</h3>
			</div>

			<UButton color="neutral" variant="ghost" icon="i-lucide-x"
				@click="gameStore.isScenariosModalOpen = false" />

		</template>

		<!-- Modal Body -->
		<template #body>

			<!-- Current scenario -->
			<div class="space-y-2">

				<h4 class="text-xs font-semibold text-neutral-400">{{ $t('scenarios.current') }}</h4>

				<div class="space-y-0 text-center">
					<div class="text-lg font-bold text-primary">{{ $t('scenario_' + gameStore.currentScenarioId) }}</div>
					<div class="text-sm font-bold font-mono">{{ formatTime(gameStore.totalPlayTime) }}</div>
				</div>

				<div class="grid grid-cols-2 gap-2">

					<UPopover>

						<UButton color="error" variant="subtle" icon="i-lucide-rotate-ccw" block size="sm" :label="$t('scenarios.reset')" />

						<template #content>
							<UCard :ui="{ 'body': 'p-3 sm:p-3' }">
								<div class="flex flex-col items-center gap-4">

									<span class="w-48 text-center text-xs font-semibold text-error">{{ $t('scenarios.reset_confirm') }}</span>

									<UButton color="error" variant="subtle" size="sm"
										@click="gameStore.resetCurrentScenario()">
										{{ $t('scenarios.confirm') }}
									</UButton>

								</div>
							</UCard>
						</template>

					</UPopover>

					<UButton variant="subtle" block size="sm" :label="gameStore.isPaused ? $t('scenarios.resume') : $t('scenarios.pause')"
						:color="gameStore.isPaused ? 'success' : 'primary'"                                
						:icon="gameStore.isPaused ? 'i-lucide-play-circle' : 'i-lucide-pause-circle'"
						@click="gameStore.togglePause()" />

				</div>

				<UAlert v-if="gameStore.hasWon" variant="subtle" color="success" class="text-center" icon="i-lucide-award"
					:description="$t('victory.message')" />

			</div>

			<!-- Available scenarios -->
			<div class="flex flex-col space-y-2">

				<h4 class="text-xs font-semibold text-neutral-400">{{ $t('scenarios.available') }}</h4>
				
				<div class="grid grid-cols-2 gap-2">
					
					<UButton v-for="scenario in gameStore.scenarios" :key="scenario.id" block size="sm"
						variant="subtle" :color="gameStore.currentScenarioId !== scenario.id ? 'primary' : 'neutral'"
						:disabled="gameStore.currentScenarioId === scenario.id"
						@click="gameStore.switchScenario(scenario.id)">
						<span>{{ $t('scenario_' + scenario.id) }}</span>
					</UButton>

				</div>

			</div>

			<!-- Victories -->
			<div class="flex flex-col space-y-2">

				<h4 class="text-xs font-semibold text-neutral-400">{{ $t('scenarios.victories') }}</h4>

				<div v-if="gameStore.victories && gameStore.victories.length > 0" class="flex flex-col space-y-2">
					<div v-for="(victory, index) in gameStore.victories" :key="index"
						class="rounded-md bg-neutral-800 p-2 flex justify-between items-center text-xs">

						<div class="flex flex-col gap-1">
							<span>{{ $t('scenario_' + victory.scenarioId) }}</span>
							<span class="text-muted text-xs">{{ victory.date }}</span>
						</div>

						<div class="flex items-center gap-2">
							<span>{{ formatTime(victory.totalPlayTime) }}</span>
							<UButton color="error" variant="subtle" icon="i-lucide-trash" size="sm"
								@click="gameStore.victoryDelete(index)" />
						</div>

					</div>
				</div>
				<span v-else class="text-xs italic text-muted">{{ $t('scenarios.no_victory') }}</span>

			</div>

		</template>
	
	</UModal>

</template>