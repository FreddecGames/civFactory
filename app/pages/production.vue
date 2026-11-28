<script setup lang="ts">

	import { computed } from 'vue'
	
	import { useGameStore } from '~/stores/game'

	const gameStore = useGameStore()

	const groupedProds = computed(() => {

		return gameStore.prods.filter(prod => gameStore.unlockedProdIds.includes(prod.id)).reduce((groups: Record<string, any[]>, prod: any) => {

			const group = prod.group

			const groupProds = groups[group] || (groups[group] = [])
			groupProds.push(prod)

			return groups
		}, {})
	})

	const isEmpty = computed(() => Object.keys(groupedProds.value).length === 0)

</script>

<template>

	<!-- Prod Groups -->
	<section v-for="(prods, group) in groupedProds" :key="group" class="space-y-2">

		<h2 class="text-xs font-semibold text-neutral-400">{{ $t('groups.' + group) }}</h2>

		<div v-for="prod in prods" :key="prod.id" class="bg-muted rounded-md ring ring-default p-1.5 flex items-center gap-2 text-xs">

			<div class="flex items-center gap-1">

				<UButton :color="gameStore.canUnassignProdMachine(prod) === 0 ? 'error' : 'neutral'" variant="subtle" icon="i-lucide-minus" size="xs"
					:disabled="gameStore.canUnassignProdMachine(prod) !== 0"
					@click="gameStore.unassignProdMachine(prod)" />

				<span v-if="prod.assignedCount > 0" class="min-w-10 text-center text-xs">{{ prod.assignedCount }}</span>
				<span v-else class="min-w-10 text-center text-xs text-muted">{{ prod.assignedCount }}</span>

				<UButton :color="gameStore.canAssignProdMachine(prod) === 0 ? 'primary' : 'neutral'" variant="subtle" icon="i-lucide-plus" size="xs"
					:disabled="gameStore.canAssignProdMachine(prod) !== 0"
					@click="gameStore.assignProdMachine(prod)" />

			</div>

			<div class="flex flex-col items-center gap-1">
				<img :src="gameStore.itemImgs[prod.machineId]" :alt="$t(`items.${prod.machineId}`)" class="size-4" />
				<span class="text-xs leading-none" :class="gameStore.availableCounts[prod.machineId] > 0 ? 'text-success' : 'text-error'">{{ gameStore.availableCounts[prod.machineId] }}</span>
			</div>

			<div class="flex-1 flex items-center justify-end gap-2">

				<div v-if="prod.inputs" class="flex items-center gap-2">

					<div v-for="input of prod.inputs" class="flex flex-col items-center gap-1">
						<img :src="gameStore.itemImgs[input.id]" :alt="$t(`items.${input.id}`)" class="size-4" />
						<span class="text-xs leading-none" :class="gameStore.prodRates[input.id] < input.count ? 'text-error' : 'text-success'">{{ input.count }}<small>/s</small></span>
					</div>

					<UIcon name="i-lucide-move-right" class="text-muted text-xs" />

				</div>

				<div class="flex items-center gap-2">
					<div v-for="output of prod.outputs" class="flex flex-col items-center gap-1">
						<img :src="gameStore.itemImgs[output.id]" :alt="$t(`items.${output.id}`)" class="size-4" />
						<span class="text-xs leading-none">{{ output.count }}<small>/s</small></span>
					</div>
				</div>

			</div>

		</div>

	</section>
	<section v-if="isEmpty" class="space-y-2">
		<div class="rounded-md ring ring-default p-1.5 text-center">
			<span class="text-xs text-muted italic">{{ $t('labels.noContent') }}</span>
		</div>
	</section>

</template>
