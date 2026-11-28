// ./app/stores/game.ts

import { defineStore } from 'pinia'

const LOCAL_DATA_NAME = 'civfactory_save'

const AVAILABLE_SCENARIOS = [

	{ id: 'satisfactory', name: 'scenarios.satisfactory' },
]

interface Victory {

	date: string
	scenarioId: string
	totalPlayTime: number
}

interface Item {

	id: string
	img: string
	name: string
	type: string
	reqs?: { id: string, count: number }[]
	group: string
	stack: number
	count: number
	prodCounts: number[]
	prodSelectedCount: number
	manualCounts: number[]
	manualSelectedCount: number
	storageCounts: number[]
	storageSelectedCount: number
}

interface Prod {

	id: string
	inputs?: { id: string, count: number }[]
	outputs: { id: string, count: number }[]
	machineId: string
	assignedCount: number
}

interface Manual {

	id: string
	inputs?: { id: string, count: number }[]
	outputs: { id: string, count: number }[]
	isProcessing: boolean
	processCount: number
	remainingSeconds: number
}

interface Storage {

	id: string
	slots: number
	itemId: string
	storerId: string
	assignedCount: number
}

export const useGameStore = defineStore('game', {

	state: () => ({

		isOptionsModalOpen: false,
		isVictoryModalOpen: false,
		isScenariosModalOpen: false,

		lastSaveDate: 0,
		saveIntervalId: null as ReturnType<typeof setInterval> | null,
		
		customGameName : null as string | null,

		victories: [] as Victory[],

		hasWon: false,
		isPaused: false,
		isRefreshing: false,
		totalPlayTime: 0,
		currentScenarioId: AVAILABLE_SCENARIOS[0]?.id as string | null,

		winConditions: null as Record<string, number> | null,

		items: [] as Item[],
		prods: [] as Prod[],
		manuals: [] as Manual[],
		storages: [] as Storage[],

		itemMap: {} as Record<string, Item>,

		prodRates: {} as Record<string, number>,
		maxCapacities: {} as Record<string, number>,
		availableCounts: {} as Record<string, number>,

		unlockedItemIds: [] as string[],
		unlockedProdIds: [] as string[],
		unlockedManualIds: [] as string[],
		unlockedStorageIds: [] as string[],
	}),

	getters: {

		scenarios: () => AVAILABLE_SCENARIOS,
	},

	actions: {

		// Local data

		encryptData(obj: any): string {

			const jsonString = JSON.stringify(obj)

			return btoa(encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g, (_, p1) => {
				return String.fromCharCode(parseInt(p1, 16))
			}))
		},

		decryptData(cipherText: string): any {

			try {

				const decodedString = decodeURIComponent(Array.prototype.map.call(atob(cipherText), (c: string) => {
					return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
				}).join(''))
	
				return JSON.parse(decodedString)
			}
			catch (e) {

				console.error("decrypt_failed", e)
				return null
			}
		},

		getEncryptedData(): string {
			const localData = {

				lastSaveDate: this.lastSaveDate,

				customGameName: this.customGameName,

				victories: this.victories.map(v => ({
					date: v.date,
					scenarioId: v.scenarioId,
					totalPlayTime: v.totalPlayTime,
				})),

				hasWon: this.hasWon,
				isPaused: this.isPaused,
				totalPlayTime: this.totalPlayTime,
				currentScenarioId: this.currentScenarioId,

				items: this.items.filter(i => i.count > 0).map(i => ({
					id: i.id,
					count: i.count,
					prodSelectedCount: i.prodSelectedCount,
					manualSelectedCount: i.manualSelectedCount,
					storageSelectedCount: i.storageSelectedCount,
				})),

				manuals: this.manuals.filter(m => m.isProcessing).map(m => ({
					id: m.id, 
					processCount: m.processCount || 0,
					remainingSeconds: m.remainingSeconds || 0,
				})),

				prods: this.prods.filter(p => p.assignedCount > 0).map(p => ({
					id: p.id, 
					assignedCount: p.assignedCount || 0,
				})),

				storages: this.storages.filter(s => s.assignedCount > 0).map(s => ({
					id: s.id, 
					assignedCount: s.assignedCount || 0,
				})),

				unlockedItemIds: this.unlockedItemIds,
			}

			return this.encryptData(localData)
		},

		saveLocalData() {

			if (!import.meta.client) return

			this.lastSaveDate = Date.now()

			const encryptedString = this.getEncryptedData()
			localStorage.setItem(LOCAL_DATA_NAME, encryptedString)
		},

		startAutoSave(intervalMs: number = 30000) {

			if (!import.meta.client) return

			this.stopAutoSave()

			this.saveIntervalId = setInterval(() => {
				this.saveLocalData()
			}, intervalMs)
		},

		stopAutoSave() {

			if (this.saveIntervalId) {

				clearInterval(this.saveIntervalId)
				this.saveIntervalId = null
			}
		},

		wipeLocalData() {

			if (!import.meta.client) return

			this.isRefreshing = true
			this.stopAutoSave()

			localStorage.removeItem(LOCAL_DATA_NAME)

			window.location.assign('/')
		},
		
		resetLocalData() {

			this.lastSaveDate = 0
			
			this.hasWon = false
			this.isPaused = false
			this.totalPlayTime = 0

			this.items = []
			this.prods = []
			this.manuals = []
			this.storages = []

			this.unlockedItemIds = []

			this.updateProdRates()
			this.updateMaxCapacities()
			this.updateAvailableCounts()

			this.checkForNewUnlocks()
		},

		async importLocalData(data: string): Promise<boolean> {

			if (!data || data.trim() === '') return false
			if (!import.meta.client) return false

			this.isRefreshing = true
			this.stopAutoSave()

			localStorage.setItem(LOCAL_DATA_NAME, data)

			window.location.assign('/')

			return true
		},

		async loadLocalData() {

			if (!import.meta.client) return

			let decryptedLocalData: any = null
			const rawLocalData = localStorage.getItem(LOCAL_DATA_NAME)
			if (rawLocalData) decryptedLocalData = this.decryptData(rawLocalData)
			
			// Scenario

			if (decryptedLocalData && decryptedLocalData.currentScenarioId !== undefined)
				this.currentScenarioId = decryptedLocalData.currentScenarioId

			if (!AVAILABLE_SCENARIOS.some(s => s.id === this.currentScenarioId))
				this.currentScenarioId = AVAILABLE_SCENARIOS[0]?.id
			
			const [scenarioData] = await Promise.all([
				fetch(`/civfactory/scenarios/${this.currentScenarioId}/data.json`).then(response => response.json())
			])

			// Win conditions

			this.winConditions = scenarioData && scenarioData.winConditions ? scenarioData.winConditions : null	
			
			// Items

			this.items = []
			this.storages = []

			scenarioData.items.forEach((itemData: any) => {

				let itemReqs: { id: string, count: number }[] | undefined = undefined
				if (itemData.reqs) itemReqs = Object.entries(itemData.reqs).map(([id, count]) => ({ id, count }))

				const newItem: Item = {

					id: itemData.id,
					img: `/civfactory/scenarios/${this.currentScenarioId}/img/${itemData.id}.png`,
					name: `items.${itemData.id}`,
					type: itemData.type,
					reqs: itemReqs,
					group: itemData.group,
					stack: itemData.stack || Infinity,
					count: itemData.initialCount || 0,
					prodCounts: [1, 5, 10],
					prodSelectedCount: 1,
					manualCounts: [1, 5, 10],
					manualSelectedCount: 1,
					storageCounts: [1, 5, 10],
					storageSelectedCount: 1,
				}

				this.items.push(newItem)

				if (itemData.storers && itemData.storers.length > 0) {
					itemData.storers.forEach((storerId: string) => {

						const storerData = scenarioData.items.find(candidate => candidate.id === storerId)

						const newStorage: Storage = {

							id: `${itemData.id}_${storerId}`,
							slots: storerData.slots,
							itemId: itemData.id,
							storerId: storerId,
							assignedCount: 0,
						}

						this.storages.push(newStorage)
					})
				}
			})

			this.itemMap = {}
			this.items.forEach(item => { this.itemMap[item.id] = item })

			// Recipes

			this.prods = []
			this.manuals = []

			scenarioData.recipes.forEach((recipeData: any) => {
				recipeData.machines.forEach((machineId: string) => {

					if (machineId === 'manual') {

						const manualOutputs = Object.entries(recipeData.outputs).map(([id, count]) => ({ id, count }))

						let manualInputs: { id: string, count: number }[] | undefined = undefined
						if (recipeData.inputs) manualInputs = Object.entries(recipeData.inputs).map(([id, count]) => ({ id, count }))

						const newManual: Manual = {

							id: `${recipeData.id}_manual`,
							inputs: manualInputs,
							outputs: manualOutputs,
							isProcessing: false,
							processCount: 0,
							remainingSeconds: 0,
						}

						this.manuals.push(newManual)
					}
					else {

						const machineData = scenarioData.items.find(candidate => candidate.id === machineId)

						const prodOutputs = Object.entries(recipeData.outputs).map(([id, count]) => ({ id, count }))

						const prodInputs = [
							...(recipeData.inputs ? Object.entries(recipeData.inputs).map(([id, count]) => ({ id, count:count * machineData.coeff / recipeData.seconds })) : []),
							...(machineData.energy ? Object.entries(machineData.energy).map(([id, count]) => ({ id, count })) : []),
						]

						const newProd: Prod = {

							id: `${recipeData.id}_${machineId}`,
							inputs: prodInputs.length > 0 ? prodInputs : null,
							outputs: prodOutputs,
							machineId: machineId,
							assignedCount: 0,
						}

						this.prods.push(newProd)
					}
				})
			})

			// Saved data

			if (decryptedLocalData) {
			
				if (decryptedLocalData.lastSaveDate !== undefined) this.lastSaveDate = decryptedLocalData.lastSaveDate
				if (decryptedLocalData.customGameName !== undefined) this.customGameName = decryptedLocalData.customGameName

				if (decryptedLocalData.victories && decryptedLocalData.victories.length > 0) {
					decryptedLocalData.victories.forEach(victory => {
						this.victories.push({
							date: victory.date,
							scenarioId: victory.scenarioId,
							totalPlayTime: victory.totalPlayTime,
						})
					})
				}

				if (decryptedLocalData.hasWon !== undefined) this.hasWon = decryptedLocalData.hasWon
				if (decryptedLocalData.isPaused !== undefined) this.isPaused = decryptedLocalData.isPaused
				if (decryptedLocalData.totalPlayTime !== undefined) this.totalPlayTime = decryptedLocalData.totalPlayTime

				if (decryptedLocalData.items) {
					decryptedLocalData.items.forEach((savedItem: any) => {
						const item = this.items.find(i => i.id === savedItem.id)
						if (item) {
							item.count = savedItem.count ?? 0
							item.prodSelectedCount = savedItem.prodSelectedCount ?? 1
							item.manualSelectedCount = savedItem.manualSelectedCount ?? 1
							item.storageSelectedCount = savedItem.storageSelectedCount ?? 1
						}
					})
				}

				if (decryptedLocalData.prods) {
					decryptedLocalData.prods.forEach((savedProd: any) => {
						const prod = this.prods.find(s => s.id === savedProd.id)
						if (prod) {							
							prod.assignedCount = savedProd.assignedCount ?? 0
						}
					})
				}

				if (decryptedLocalData.manuals) {
					decryptedLocalData.manuals.forEach((savedManual: any) => {
						const manual = this.manuals.find(s => s.id === savedManual.id)
						if (manual) {							
							manual.isProcessing = true
							manual.processCount = savedManual.processCount || 0
							manual.remainingSeconds = savedManual.remainingSeconds || 0
						}
					})
				}

				if (decryptedLocalData.storages) {
					decryptedLocalData.storages.forEach((savedStorage: any) => {
						const storage = this.storages.find(s => s.id === savedStorage.id)
						if (storage) {
							storage.assignedCount = savedStorage.assignedCount ?? 0
						}
					})
				}

				if (Array.isArray(decryptedLocalData.unlockedItemIds)) {
					this.unlockedItemIds = decryptedLocalData.unlockedItemIds.filter((id: unknown): id is string =>
						typeof id === 'string' && Boolean(this.itemMap[id]))
				}
			}

			// Update state

			this.updateProdRates()
			this.updateMaxCapacities()
			this.updateAvailableCounts()

			this.checkForNewUnlocks()

			// Offline gains

			if (this.lastSaveDate > 0) this.processOfflineProgress()
		},

		// Game tick

		togglePause() { this.isPaused = !this.isPaused },

		processOfflineProgress() {

			const now = Date.now()
			let offlineSeconds = Math.max(0, (now - this.lastSaveDate) / 1000)
			offlineSeconds = Math.min(offlineSeconds, 43200)

			if (offlineSeconds <= 0) return

			const tickSeconds = 2
			while (offlineSeconds > 0) {

				const currentTick = Math.min(offlineSeconds, tickSeconds)
				this.processGameTick(currentTick)
				offlineSeconds -= currentTick
			}
		},

		processGameTick(deltaSeconds: number) {

			if (this.isPaused) return

			if (!this.hasWon) this.totalPlayTime += deltaSeconds

			// Manuals

			this.manuals.filter(candidate => candidate.isProcessing).forEach(manual => {

				manual.remainingSeconds -= deltaSeconds
				if (manual.remainingSeconds <= 0) {

					for (const output of manual.outputs) {

						const outputItem = this.itemMap[output.id]
						outputItem.count += output.count * manual.processCount
						if (outputItem.count > outputItem.max) outputItem.count = outputItem.max
					}

					manual.isProcessing = false
					manual.processCount = 0
					manual.remainingSeconds = 0

					this.checkForNewUnlocks()
					this.updateAvailableCounts()
				}
			})

			// Prods

			this.items.filter(candidate => this.prodRates[candidate.id] > 0 && candidate.count < this.maxCapacities[candidate.id]).forEach(item => {

				item.count += this.prodRates[item.id] * deltaSeconds
				if (item.count > this.maxCapacities[item.id]) item.count = this.maxCapacities[item.id]
			})

			// Victory

			this.checkForVictory()
		},

		// Scenario actions
		
		resetCurrentScenario() {

			if (!import.meta.client) return

			this.isRefreshing = true
			this.stopAutoSave()

			this.resetLocalData()

			const data = this.getEncryptedData()
			localStorage.setItem(LOCAL_DATA_NAME, data)

			window.location.assign('/')
		},

		async switchScenario(newScenarioId: string) {

			if (!import.meta.client) return

			this.isRefreshing = true
			this.stopAutoSave()

			this.resetLocalData()
			
			this.currentScenarioId = newScenarioId

			const encryptedString = this.getEncryptedData()
			localStorage.setItem(LOCAL_DATA_NAME, encryptedString)

			window.location.assign('/')
		},

		// State actions

		checkForVictory() {

			if (!this.winConditions || this.hasWon) return

			let isVictorious = true
			
			for (const [id, condition] of Object.entries(this.winConditions))
				if (this.itemMap[id] && this.itemMap[id].count < condition) {
					isVictorious = false
					break
				}

			if (isVictorious && !this.hasWon) {

				this.hasWon = true

				this.victories.push({

					date: new Date().toLocaleString(),
					scenarioId: this.currentScenarioId,
					totalPlayTime: this.totalPlayTime,
				})
			}
		},

		updateProdRates(): void {

			const rates: Record<string, number> = {}

			for (const prod of this.prods) {

				if (prod.assignedCount < 1)
					continue

				if (prod.inputs) {
					for (const input of prod.inputs) {
						if (!rates[input.id]) rates[input.id] = -input.count * prod.assignedCount
						rates[input.id] -= input.count * prod.assignedCount
					}
				}

				for (const output of prod.outputs) {
					if (!rates[output.id]) rates[output.id] = output.count * prod.assignedCount
					rates[output.id] += output.count * prod.assignedCount
				}
			}

			this.prodRates = rates
		},

		updateMaxCapacities(): void {

			const maxs: Record<string, number> = {}

			for (const item of this.items)
				maxs[item.id] = item.stack

			for (const storage of this.storages) {

				if (storage.assignedCount < 1)
					continue

				maxs[storage.itemId] += storage.max * storage.assignedCount
			}

			this.maxCapacities = maxs
		},

		updateAvailableCounts(): void {

			const counts: Record<string, number> = {}

			for (const prod of this.prods) {

				if (prod.assignedCount < 1)
					continue

				if (!counts[prod.machineId]) counts[prod.machineId] = this.itemMap[prod.machineId].count
				counts[prod.machineId] -= prod.assignedCount
			}

			for (const storage of this.storages) {

				if (storage.assignedCount < 1)
					continue

				if (!counts[storage.storerId]) counts[storage.storerId] = this.itemMap[storage.storerId].count
				counts[storage.storerId] -= storage.assignedCount
			}

			this.availableCounts = counts
		},

		checkForNewUnlocks(): void {

			// Items

			let hasNewUnlock = false

			const unlockedItemIds = new Set(this.unlockedItemIds)

			for (const item of this.items) {

				let requirementsMet = true

				if (item.reqs) {
					item.reqs.forEach(req => {
						if (this.itemMap[req.id].count < req.count) {
							requirementsMet = false
							return
						}
					})
				}

				if (requirementsMet && !unlockedItemIds.has(item.id)) {
					unlockedItemIds.add(item.id)
					hasNewUnlock = true
				}
			}

			if (hasNewUnlock) this.unlockedItemIds = [...unlockedItemIds]

			// Prods

			hasNewUnlock = false

			const unlockedProdIds = new Set(this.unlockedProdIds)

			for (const prod of this.prods) {

				let requirementsMet = true

				if (!this.unlockedItemIds.includes(prod.machineId)) requirementsMet = false

				if (prod.inputs) {
					prod.inputs.forEach(input => {
						if (!this.unlockedItemIds.includes(input.id)) {
							requirementsMet = false
							return
						}
					})
				}

				prod.outputs.forEach(output => {
					if (!this.unlockedItemIds.includes(output.id)) {
						requirementsMet = false
						return
					}
				})

				if (requirementsMet && !unlockedProdIds.has(prod.id)) {
					unlockedProdIds.add(prod.id)
					hasNewUnlock = true
				}
			}

			if (hasNewUnlock) this.unlockedProdIds = [...unlockedProdIds]

			// Manuals

			hasNewUnlock = false

			const unlockedManualIds = new Set(this.unlockedManualIds)

			for (const manual of this.manuals) {

				let requirementsMet = true

				if (manual.inputs) {
					manual.inputs.forEach(input => {
						if (!this.unlockedItemIds.includes(input.id)) {
							requirementsMet = false
							return
						}
					})
				}

				manual.outputs.forEach(output => {
					if (!this.unlockedItemIds.includes(output.id)) {
						requirementsMet = false
						return
					}
				})

				if (requirementsMet && !unlockedManualIds.has(manual.id)) {
					unlockedManualIds.add(manual.id)
					hasNewUnlock = true
				}
			}

			if (hasNewUnlock) this.unlockedManualIds = [...unlockedManualIds]

			// Storages

			hasNewUnlock = false

			const unlockedStorageIds = new Set(this.unlockedStorageIds)

			for (const storage of this.storages) {

				let requirementsMet = true

				if (!this.unlockedItemIds.includes(storage.storerId)) requirementsMet = false

				if (!this.unlockedItemIds.includes(storage.itemId)) requirementsMet = false

				if (requirementsMet && !unlockedStorageIds.has(storage.id)) {
					unlockedStorageIds.add(storage.id)
					hasNewUnlock = true
				}
			}

			if (hasNewUnlock) this.unlockedStorageIds = [...unlockedStorageIds]
		},
		
		// Victory actions

		victoryDelete(index: number) { this.victories.splice(index, 1) },

		// Prod actions

		canAssignProdMachine(prod: Prod, count: number): number {

			if (this.availableCounts[prod.machineId] < count) return -1

			if (prod.inputs) {
				for (const input of prod.inputs) {
					if (this.prodRates[input.id] < input.count * count)
						return -2
				}
			}

			return 0
		},

		assignProdMachine(prod: Prod, count: number): void {

			if (this.canAssignProdMachine(prod, count) !== 0) return

			prod.assignedCount += count

			this.updateAvailableCounts()
			this.updateProdRates()
		},

		canUnassignProdMachine(prod: Prod, count: number): number {

			if (prod.assignedCount < count) return -1

			for (const output of prod.outputs) {
				if (this.prodRates[output.id] < output.count * count)
					return -2
			}

			return 0
		},

		unassignProdMachine(prod: Prod, count: number): void {

			if (this.canUnassignProdMachine(prod, count) !== 0) return

			prod.assignedCount -= count

			this.updateAvailableCounts()
			this.updateProdRates()
		},

		// Manual actions

		canManualStart(manual: Manual, count: number): number {

			for (const output of manual.outputs) {
				if (this.itemMap[output.id].count + (output.count * count) > this.maxCapacities[output.id]) return -1
			}

			if (manual.inputs) {
				for (const input of manual.inputs) {
					if (this.itemMap[input.id].count < input.count * count) return -2
				}
			}

			return 0
		},

		manualStart(manual: Manual, count: number) {

			if (this.canManualStart(manual, count) !== 0) return

			if (manual.inputs) {
				for (const input of manual.inputs) {
					this.itemMap[input.id].count -= input.count * count
				}
			}

			manual.isProcessing = true
			manual.processCount = count
			manual.remainingSeconds = manual.seconds * count
		},

		canManualCancel(manual: Manual): number {

			if (!manual.isProcessing) return -1

			return 0
		},

		manualCancel(manual: Manual) {

			if (this.canManualCancel(manual) !== 0) return

			if (manual.inputs) {
				for (const input of manual.inputs) {
					this.itemMap[input.id].count += input.count * manual.processCount
				}
			}

			manual.isProcessing = false
			manual.processCount = 0
			manual.remainingSeconds = 0
		},

		// Storage actions

		canAssignStorageStorer(storage: Storage, count: number): number {

			if (this.availableCounts[storage.storerId] < 1) return -1

			return 0
		},

		assignStorageStorer(storage: Storage, count: number): void {

			if (this.canAssignStorageStorer(storage, count) !== 0) return

			storage.assignedCount += count
			
			this.updateAvailableCounts()
			this.updateMaxCapacities()
		},

		canUnassignStorageStorer(storage: Storage, count: number): number {

			if (storage.assignedCount < count) return -1

			if (this.maxCapacities[storage.itemId] - storage.max < this.itemMap[storage.itemId].count * count)
				return -2

			return 0
		},

		unassignStorageStorer(storage: Storage, count: number): void {

			if (this.canUnassignStorageStorer(storage, count) !== 0) return

			storage.assignedCount -= count

			this.updateAvailableCounts()
			this.updateMaxCapacities()
		},
	}
})