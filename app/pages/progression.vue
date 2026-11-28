<script setup lang="ts">

	import { computed } from 'vue'
	
	import { useGameStore } from '~/stores/game'

	const gameStore = useGameStore()

	const groupedItems = computed(() => {

		return gameStore.items.filter(item => item.type === 'mission').reduce((groups: Record<string, any[]>, item: any) => {

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

			<div v-if="!gameStore.unlockedItemIds.includes(item.id)" class="flex items-center gap-1.5 text-muted">
				<UIcon name="i-lucide-lock" />
				<span>{{ $t('items.' + item.id) }}</span>
			</div>

			<div v-else-if="item.count > 0" class="flex items-center gap-1.5 text-success">
				<UIcon name="i-lucide-award" />
				<span>{{ $t('items.' + item.id) }}</span>
			</div>

			<div v-else class="space-y-2">

				<div class="flex items-center gap-1.5">
					<UIcon name="i-lucide-target" />
					<span>{{ $t('items.' + item.id) }}</span>
				</div>

				<div class="text-muted">{{ $t('desc.' + item.id) }}</div>

				<div v-if="item.costs" class="space-y-2">

					<h4 class="text-xs font-semibold text-neutral-400">{{ $t('labels.objectives') }}</h4>

					<div class="flex items-center gap-2">
						<div v-for="cost of item.costs" class="relative p-1">

							<img :src="gameStore.itemImgs[cost.id]" :alt="$t(`items.${cost.id}`)" class="size-4" />

							<UBadge size="xs" variant="subtle" class="absolute -bottom-1 -right-1 z-10" color="neutral">
								<span :class="gameStore.itemMap[cost.id].count < cost.count ? 'text-error' : ''">{{ cost.count }}</span>
							</UBadge>

						</div>
					</div>

				</div>

				<div class="flex item-center justify-end">
					<UButton variant="subtle" icon="i-lucide-award" size="xs" :label="$t('labels.complete')"
						:color="gameStore.canMissionComplete(item) !== 0 ? 'neutral' : 'primary'"
						:disabled="gameStore.canMissionComplete(item) !== 0"
						@click="gameStore.missionComplete(item)" />
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