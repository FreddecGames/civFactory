<script setup lang="ts">

	import { computed } from 'vue'
	
	import { useGameStore } from '~/stores/game'

	const gameStore = useGameStore()

	const groupedItems = computed(() => {

		return gameStore.items.filter(item => gameStore.unlockedItemIds.includes(item.id) && item.type !== 'mission').reduce((groups: Record<string, any[]>, item: any) => {

			const group = item.group

			const groupItems = groups[group] || (groups[group] = [])
			groupItems.push(item)

			return groups
		}, {})
	})

	const isEmpty = computed(() => Object.keys(groupedItems.value).length === 0)

</script>

<template>

	<!-- Item Groups -->
	<section v-for="(items, group) in groupedItems" :key="group" class="space-y-2">

		<h2 class="text-xs font-semibold text-neutral-400">{{ $t('groups.' + group) }}</h2>

		<div v-for="item in items" :key="item.id" class="rounded-md ring ring-default px-2.5 py-1.5 text-xs">
			<div v-if="item.type === 'energy'" class="grid grid-cols-2 items-center gap-2">

				<div class="flex-1 flex items-flex gap-1.5">
					<img :src="gameStore.itemImgs[item.id]" :alt="$t(`items.${item.id}`)" class="size-4" />
					<span class="truncate">{{ $t(`items.${item.id}`) }}</span>
				</div>

				<span v-if="gameStore.prodRates[item.id] > 0" class="text-end text-success">+{{ gameStore.prodRates[item.id] }} /s</span>
				<span v-else class="text-end text-muted">{{ gameStore.prodRates[item.id] }}<small>/s</small></span>

			</div>
			<div v-else-if="item.type === 'item'" class="grid grid-cols-3 items-center gap-2">

				<div class="flex-1 flex items-flex gap-1.5">
					<img :src="gameStore.itemImgs[item.id]" :alt="$t(`items.${item.id}`)" class="size-4" />
					<span class="truncate">{{ $t(`items.${item.id}`) }}</span>
				</div>

				<span v-if="gameStore.prodRates[item.id] > 0" class="text-end text-success">+{{ gameStore.prodRates[item.id] }} /s</span>
				<span v-else class="text-end text-muted">{{ gameStore.prodRates[item.id] }}<small>/s</small></span>

				<span class="text-end" :class="item.count >= gameStore.maxCapacities[item.id] ? 'text-error' : ''">{{ item.count }} / {{ gameStore.maxCapacities[item.id] }}</span>

			</div>
			<div v-else-if="item.type === 'machine'" class="grid grid-cols-2 items-center gap-2">

				<div class="flex-1 flex items-flex gap-1.5">
					<img :src="gameStore.itemImgs[item.id]" :alt="$t(`items.${item.id}`)" class="size-4" />
					<span class="truncate">{{ $t(`items.${item.id}`) }}</span>
				</div>

				<div class="flex items-center justify-end gap-2">

					<UBadge size="xs" variant="subtle" color="neutral">
						<span :class="gameStore.availableCounts[item.id] > 0 ? 'text-success' : ''">{{ gameStore.availableCounts[item.id] }}</span>
					</UBadge>

					<span class="text-end">{{ item.count }}</span>

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
