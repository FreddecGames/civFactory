<script setup lang="ts">

	import { computed } from 'vue'
	
	import { useGameStore } from '~/stores/game'

	const gameStore = useGameStore()

	const groupedStorages = computed(() => {

		return gameStore.storages.filter(storage => gameStore.unlockedStorageIds.includes(storage.id)).reduce((groups: Record<string, any[]>, storage: any) => {

			const group = storage.group

			const groupStorages = groups[group] || (groups[group] = [])
			groupStorages.push(storage)

			return groups
		}, {})
	})

	const isEmpty = computed(() => Object.keys(groupedStorages.value).length === 0)

</script>

<template>

	<!-- Item Groups -->
	<section v-for="(storages, group) in groupedStorages" :key="group" class="space-y-2">

		<h2 class="text-xs font-semibold text-neutral-400">{{ $t('groups.' + group) }}</h2>

		<div v-for="storage in storages" :key="storage.id" class="rounded-md ring ring-default px-2.5 py-1.5 text-xs">

			<div class="flex-1 flex items-center gap-2">

				<div class="flex-1 flex items-flex gap-1.5">
					<img :src="gameStore.itemImgs[storage.itemId]" :alt="$t(`items.${storage.itemId}`)" class="size-4" />
					<span :class="gameStore.itemMap[storage.itemId].count >= gameStore.maxCapacities[storage.itemId] ? 'text-error' : ''">{{ gameStore.itemMap[storage.itemId].count }} / {{ gameStore.maxCapacities[storage.itemId] }}</span>
				</div>

			</div>

			<div class="relative p-1 me-1">
				<img :src="gameStore.itemImgs[storage.storerId]" :alt="$t(`items.${storage.storerId}`)" class="size-4" />
				<UBadge size="xs" color="neutral" variant="subtle" class="absolute -bottom-1 -right-1 z-10">
					<span :class="gameStore.availableCounts[storage.storerId] > 0 ? 'text-success' : 'text-error'">{{ gameStore.availableCounts[storage.storerId] }}</span>
				</UBadge>
			</div>

			<div class="flex items-center gap-1">

				<UButton :color="gameStore.canUnassignStorageStorer(storage) === 0 ? 'error' : 'neutral'" variant="subtle" icon="i-lucide-minus" size="xs"
					:disabled="gameStore.canUnassignStorageStorer(storage) !== 0"
					@click="gameStore.unassignStorageStorer(storage)" />

				<span v-if="storage.assignedCount > 0" class="min-w-10 text-center text-xs">{{ storage.assignedCount }}</span>
				<span v-else class="min-w-10 text-center text-xs text-muted">{{ storage.assignedCount }}</span>

				<UButton :color="gameStore.canAssignStorageStorer(storage) === 0 ? 'primary' : 'neutral'" variant="subtle" icon="i-lucide-plus" size="xs"
					:disabled="gameStore.canAssignStorageStorer(storage) !== 0"
					@click="gameStore.assignStorageStorer(storage)" />

			</div>

		</div>

	</section>
	<section v-if="isEmpty" class="space-y-2">
		<div class="rounded-md ring ring-default p-1.5 text-center">
			<span class="text-xs text-muted italic">{{ $t('labels.noContent') }}</span>
		</div>
	</section>

</template>