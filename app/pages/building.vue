<script setup lang="ts">

	import { computed } from 'vue'
	
	import { useGameStore } from '~/stores/game'

	const gameStore = useGameStore()

	const groupedItems = computed(() => {

		return gameStore.items.filter(item => item.gain && gameStore.unlockedItemIds.includes(item.id)).reduce((groups: Record<string, any[]>, item: any) => {

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

		<div v-for="item in items" :key="item.id" class="rounded-md ring ring-default p-1.5 flex items-center gap-1.5 text-xs">

			<div class="flex-1 flex items-center gap-1.5">

				<div v-if="item.costs" class="flex items-center gap-2">
					<div v-for="cost of item.costs" class="relative p-1">

						<img :src="gameStore.itemImgs[cost.id]" :alt="$t(`items.${cost.id}`)" class="size-4" />

						<UBadge size="xs" variant="subtle" class="absolute -bottom-1 -right-1 z-10" color="neutral">
							<span :class="gameStore.itemMap[cost.id].count < cost.count ? 'text-error' : ''">{{ cost.count }}</span>
						</UBadge>

					</div>
				</div>
				<span v-else class="text-muted text-xs italic">{{ $t('labels.noCost') }}</span>

				<UIcon name="i-lucide-move-right" class="text-muted text-xs" />

				<div class="relative p-1">

					<img :src="gameStore.itemImgs[item.id]" :alt="$t(`items.${item.id}`)" class="size-4" />

					<UBadge size="xs" color="neutral" variant="subtle" class="absolute -bottom-1 -right-1 z-10"
						:color="item.count + 1 > gameStore.maxCapacities[item.id] ? 'error' : 'neutral'">
						1
					</UBadge>

				</div>

			</div>

			<span v-if="item.type === 'item'">{{ item.count }} / {{ gameStore.maxCapacities[item.id] }}</span>
			<div v-else-if="item.type === 'machine'" class="flex items-center justify-end gap-2">

				<UBadge size="xs" variant="subtle"
					:color="gameStore.availableCounts[item.id] > 0 ? 'success' : 'neutral'">
					{{ gameStore.availableCounts[item.id] }}
				</UBadge>

				<span class="text-end">{{ item.count }}</span>

			</div>

			<UButton variant="subtle" icon="i-lucide-plus" size="xs"
				:color="gameStore.canItemGain(item) !== 0 ? 'neutral' : 'primary'"
				:disabled="gameStore.canItemGain(item) !== 0"
				@click="gameStore.itemGain(item)" />

		</div>

	</section>
	<section v-if="isEmpty" class="space-y-2">
		<div class="rounded-md ring ring-default p-1.5 text-center">
			<span class="text-xs text-muted italic">{{ $t('labels.noContent') }}</span>
		</div>
	</section>

</template>
