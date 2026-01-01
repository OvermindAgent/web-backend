import { ServerScriptService, ServerStorage, ReplicatedStorage, Players, Workspace, StarterPlayer, StarterGui, StarterPack, Lighting, SoundService, Chat, Teams, ReplicatedFirst, CollectionService } from "@rbxts/services"
import { SignalAction } from "./types"

const scriptEditor = game.GetService("ScriptEditorService") as ScriptEditorService

type ScriptKind = "server" | "client" | "module"

function determineScriptType(path: string): ScriptKind {
	if (string.find(path, ".server.")[0] !== undefined) return "server"
	if (string.find(path, ".client.")[0] !== undefined) return "client"
	return "module"
}

function createScriptInstance(scriptKind: ScriptKind): Script | LocalScript | ModuleScript {
	if (scriptKind === "server") return new Instance("Script")
	if (scriptKind === "client") return new Instance("LocalScript")
	return new Instance("ModuleScript")
}

function getParentFromPath(path: string): Instance | undefined {
	const parts = string.split(path, "/")
	const root = parts[0]

	if (root === "ServerScriptService") return ServerScriptService
	if (root === "ServerStorage") return ServerStorage
	if (root === "ReplicatedStorage") return ReplicatedStorage
	if (root === "ReplicatedFirst") return ReplicatedFirst
	if (root === "StarterPlayer") return StarterPlayer
	if (root === "StarterPlayerScripts") return StarterPlayer.FindFirstChild("StarterPlayerScripts") as Instance
	if (root === "StarterCharacterScripts") return StarterPlayer.FindFirstChild("StarterCharacterScripts") as Instance
	if (root === "StarterGui") return StarterGui
	if (root === "StarterPack") return StarterPack
	if (root === "Workspace") return Workspace
	if (root === "Lighting") return Lighting
	if (root === "SoundService") return SoundService
	if (root === "Chat") return Chat
	if (root === "Teams") return Teams
	if (root === "Players") return Players
	
	warn(`[Overmind] Unknown service: ${root}`)
	return undefined
}

function ensureFolderPath(parent: Instance, pathParts: string[]): Instance {
	let current = parent

	for (let i = 0; i < pathParts.size(); i++) {
		const part = pathParts[i]
		let child = current.FindFirstChild(part)
		if (!child) {
			child = new Instance("Folder")
			child.Name = part
			child.Parent = current
		}
		current = child
	}

	return current
}

function removeScriptSuffix(fileName: string): string {
	let result = fileName
	const suffixes = [".server.luau", ".client.luau", ".module.luau", ".server.lua", ".client.lua", ".module.lua", ".luau", ".lua"]
	
	for (const suffix of suffixes) {
		const [found] = string.find(result, suffix)
		if (found !== undefined) {
			result = string.sub(result, 1, found - 1)
			break
		}
	}
	
	return result
}

function globToRegex(pattern: string): string {
	let regex = pattern
	regex = string.gsub(regex, "%.", "\\.")[0] as string
	regex = string.gsub(regex, "%*", ".*")[0] as string
	regex = string.gsub(regex, "%?", ".")[0] as string
	return `^${regex}$`
}

function matchesPattern(text: string, pattern: string): boolean {
	const regexPattern = globToRegex(pattern)
	const [match] = string.find(text, regexPattern)
	return match !== undefined
}

function resolveParentInstance(path: string): Instance | undefined {
	const parts = string.split(path, "/")
	const root = getParentFromPath(path)
	if (!root) return undefined
	
	let current = root
	for (let i = 1; i < parts.size(); i++) {
		const child = current.FindFirstChild(parts[i])
		if (!child) return undefined
		current = child
	}
	return current
}

function findObjectByQuery(query: string, className?: string, parent?: Instance): Instance[] {
	const results: Instance[] = []
	const searchRoot = parent || game
	const maxResults = 50
	
	function searchRecursive(inst: Instance, depth: number) {
		if (depth > 20 || results.size() >= maxResults) return
		
		const matchesName = matchesPattern(inst.Name, query)
		const matchesClass = className === undefined || inst.ClassName === className
		
		if (matchesName && matchesClass) {
			results.push(inst)
		}
		
		for (const child of inst.GetChildren()) {
			searchRecursive(child, depth + 1)
		}
	}
	
	searchRecursive(searchRoot, 0)
	return results
}

function applyProperties(inst: Instance, properties: Record<string, unknown>): void {
	for (const [key, value] of pairs(properties)) {
		try {
			if (key === "Size" && typeIs(value, "string")) {
				const parts = string.split(value as string, ",")
				if (parts.size() === 3) {
					const x = tonumber(parts[0]) || 0
					const y = tonumber(parts[1]) || 0
					const z = tonumber(parts[2]) || 0
					;(inst as BasePart).Size = new Vector3(x, y, z)
				}
			} else if (key === "Position" && typeIs(value, "string")) {
				const parts = string.split(value as string, ",")
				if (parts.size() === 3) {
					const x = tonumber(parts[0]) || 0
					const y = tonumber(parts[1]) || 0
					const z = tonumber(parts[2]) || 0
					;(inst as BasePart).Position = new Vector3(x, y, z)
				}
			} else if (key === "Color" && typeIs(value, "string")) {
				const parts = string.split(value as string, ",")
				if (parts.size() === 3) {
					const r = tonumber(parts[0]) || 0
					const g = tonumber(parts[1]) || 0
					const b = tonumber(parts[2]) || 0
					;(inst as BasePart).Color = new Color3(r, g, b)
				}
			} else {
				(inst as unknown as Record<string, unknown>)[key] = value
			}
		} catch (e) {
			warn(`[Overmind] Failed to set property ${key}: ${e}`)
		}
	}
}

function applyTags(inst: Instance, tags: string): void {
	const tagList = string.split(tags, ",")
	for (const tag of tagList) {
		const trimmed = string.gsub(tag, "^%s*(.-)%s*$", "%1")[0] as string
		if (string.sub(trimmed, 1, 1) === "+") {
			const tagName = string.sub(trimmed, 2)
			CollectionService.AddTag(inst, tagName)
		} else if (string.sub(trimmed, 1, 1) === "-") {
			const tagName = string.sub(trimmed, 2)
			CollectionService.RemoveTag(inst, tagName)
		} else {
			CollectionService.AddTag(inst, trimmed)
		}
	}
}


export function handleSignal(action: SignalAction, data?: Record<string, unknown>): void {
	if (action === "create_file" || action === "create_script") {
		handleCreateScript(data as { path: string; content: string })
	} else if (action === "update_file" || action === "update_script") {
		handleUpdateScript(data as { path: string; content: string })
	} else if (action === "delete_file") {
		handleDeleteScript(data as { path: string })
	} else if (action === "notify") {
		handleNotify(data as { message: string; msgType?: "info" | "warn" | "error" })
	} else if (action === "create_object") {
		handleCreateObject(data as { className: string; parent: string; name?: string; properties?: Record<string, unknown>; tags?: string })
	} else if (action === "update_object") {
		handleUpdateObject(data as { query: string; className?: string; properties?: Record<string, unknown>; newParent?: string; tags?: string })
	} else if (action === "delete_object") {
		handleDeleteObject(data as { query: string; className?: string; recursive?: boolean })
	} else if (action === "move_object") {
		handleMoveObject(data as { query: string; newParent: string; newIndex?: number })
	} else if (action === "run_script") {
		handleRunScript(data as { code: string; scriptType: string; confirmation?: string })
	} else if (action === "query_search") {
		handleQuerySearch(data as { name?: string; className?: string; parent?: string; tags?: string; maxResults?: number })
	} else if (action === "grep_search") {
		handleGrepSearch(data as { pattern: string; scriptType?: string; parent?: string; caseSensitive?: boolean; maxResults?: number })
	} else if (action === "clone_object") {
		handleCloneObject(data as { query: string; newParent?: string; newName?: string; properties?: Record<string, unknown>; tags?: string })
	} else if (action === "search") {
		handleSearch(data as { query: string; mode?: string; searchIn?: string; parent?: string; className?: string; caseSensitive?: boolean; maxResults?: number })
	}
}

function handleCreateScript(data: { path: string; content: string }): void {
	const { path, content } = data
	if (!path || content === undefined) {
		warn("[Overmind] Invalid create_script data")
		return
	}

	const pathParts = string.split(path, "/")
	const fileName = pathParts[pathParts.size() - 1]
	const folderParts: string[] = []
	
	for (let i = 1; i < pathParts.size() - 1; i++) {
		folderParts.push(pathParts[i])
	}

	const scriptKind = determineScriptType(fileName)
	const parent = getParentFromPath(path)
	if (!parent) return
	const folder = ensureFolderPath(parent, folderParts)
	const baseName = removeScriptSuffix(fileName)

	const newScript = createScriptInstance(scriptKind)
	newScript.Name = baseName
	newScript.Parent = folder

	task.spawn(() => {
		const success = pcall(() => {
			scriptEditor.UpdateSourceAsync(newScript as LuaSourceContainer, () => content)
		})

		if (success[0]) {
			print(`[Overmind] Created script: ${path}`)
			pcall(() => {
				scriptEditor.OpenScriptDocumentAsync(newScript as LuaSourceContainer)
			})
		} else {
			;(newScript as ModuleScript).Source = content
			print(`[Overmind] Created script (fallback): ${path}`)
		}
	})
}

function handleUpdateScript(data: { path: string; content: string }): void {
	const { path, content } = data
	if (!path || content === undefined) {
		warn("[Overmind] Invalid update_script data")
		return
	}

	const pathParts = string.split(path, "/")
	const fileName = pathParts[pathParts.size() - 1]
	const parent = getParentFromPath(path)
	if (!parent) return
	const baseName = removeScriptSuffix(fileName)

	let current: Instance = parent
	for (let i = 1; i < pathParts.size() - 1; i++) {
		const child = current.FindFirstChild(pathParts[i])
		if (!child) {
			warn(`[Overmind] Path not found: ${path}`)
			return
		}
		current = child
	}

	const existingScript = current.FindFirstChild(baseName)
	if (!existingScript || !existingScript.IsA("LuaSourceContainer")) {
		warn(`[Overmind] Script not found: ${path}`)
		return
	}

	task.spawn(() => {
		const success = pcall(() => {
			scriptEditor.UpdateSourceAsync(existingScript as LuaSourceContainer, () => content)
		})

		if (success[0]) {
			print(`[Overmind] Updated script: ${path}`)
		} else {
			;(existingScript as ModuleScript).Source = content
			print(`[Overmind] Updated script (fallback): ${path}`)
		}
	})
}

function handleDeleteScript(data: { path: string }): void {
	const { path } = data
	if (!path) {
		warn("[Overmind] Invalid delete_script data")
		return
	}

	const pathParts = string.split(path, "/")
	const fileName = pathParts[pathParts.size() - 1]
	const parent = getParentFromPath(path)
	if (!parent) return
	const baseName = removeScriptSuffix(fileName)

	let current: Instance = parent
	for (let i = 1; i < pathParts.size() - 1; i++) {
		const child = current.FindFirstChild(pathParts[i])
		if (!child) {
			warn(`[Overmind] Path not found: ${path}`)
			return
		}
		current = child
	}

	const targetScript = current.FindFirstChild(baseName)
	if (targetScript) {
		targetScript.Destroy()
		print(`[Overmind] Deleted script: ${path}`)
	}
}

function handleNotify(data: { message: string; msgType?: "info" | "warn" | "error" }): void {
	const { message, msgType } = data
	const notifyType = msgType || "info"

	if (notifyType === "warn") {
		warn(`[Overmind] ${message}`)
	} else if (notifyType === "error") {
		warn(`[Overmind ERROR] ${message}`)
	} else {
		print(`[Overmind] ${message}`)
	}
}

function handleCreateObject(data: { className: string; parent: string; name?: string; properties?: Record<string, unknown>; tags?: string }): void {
	const { className, parent, name, properties, tags } = data
	if (!className || !parent) {
		warn("[Overmind] Invalid create_object data")
		return
	}

	try {
		const parentInstance = resolveParentInstance(parent)
		if (!parentInstance) {
			warn(`[Overmind] Parent not found: ${parent}`)
			return
		}

		const newObject = new Instance(className as "Part")
		if (name) newObject.Name = name
		if (properties) applyProperties(newObject, properties)
		if (tags) applyTags(newObject, tags)
		newObject.Parent = parentInstance

		print(`[Overmind] Created ${className}: ${newObject.Name}`)
	} catch (e) {
		warn(`[Overmind] Failed to create object: ${e}`)
	}
}

function handleUpdateObject(data: { query: string; className?: string; properties?: Record<string, unknown>; newParent?: string; tags?: string }): void {
	const { query, className, properties, newParent, tags } = data
	if (!query) {
		warn("[Overmind] Invalid update_object data")
		return
	}

	const objects = findObjectByQuery(query, className)
	if (objects.size() === 0) {
		warn(`[Overmind] No objects found matching: ${query}`)
		return
	}

	for (const obj of objects) {
		if (obj.IsA("LuaSourceContainer")) {
			warn(`[Overmind] Cannot update scripts with update_object: ${obj.Name}`)
			continue
		}

		if (properties) applyProperties(obj, properties)
		if (tags) applyTags(obj, tags)
		if (newParent) {
			const parentInstance = resolveParentInstance(newParent)
			if (parentInstance) {
				obj.Parent = parentInstance
			}
		}

		print(`[Overmind] Updated object: ${obj.Name}`)
	}
}

function handleDeleteObject(data: { query: string; className?: string; recursive?: boolean }): void {
	const { query, className, recursive } = data
	if (!query) {
		warn("[Overmind] Invalid delete_object data")
		return
	}

	const objects = findObjectByQuery(query, className)
	if (objects.size() === 0) {
		warn(`[Overmind] No objects found matching: ${query}`)
		return
	}

	for (const obj of objects) {
		if (obj.IsA("LuaSourceContainer")) {
			warn(`[Overmind] Cannot delete scripts with delete_object: ${obj.Name}`)
			continue
		}

		const objName = obj.Name
		if (recursive) {
			obj.Destroy()
		} else {
			for (const child of obj.GetChildren()) {
				child.Parent = obj.Parent
			}
			obj.Destroy()
		}

		print(`[Overmind] Deleted object: ${objName}`)
	}
}

function handleMoveObject(data: { query: string; newParent: string; newIndex?: number }): void {
	const { query, newParent } = data
	if (!query || !newParent) {
		warn("[Overmind] Invalid move_object data")
		return
	}

	const objects = findObjectByQuery(query)
	if (objects.size() === 0) {
		warn(`[Overmind] No objects found matching: ${query}`)
		return
	}

	const parentInstance = resolveParentInstance(newParent)
	if (!parentInstance) {
		warn(`[Overmind] Parent not found: ${newParent}`)
		return
	}

	for (const obj of objects) {
		obj.Parent = parentInstance
		print(`[Overmind] Moved object: ${obj.Name} to ${newParent}`)
	}
}

function handleRunScript(data: { code: string; scriptType: string; confirmation?: string }): void {
	const { code, scriptType } = data
	if (!code || !scriptType) {
		warn("[Overmind] Invalid run_script data")
		return
	}

	warn("[Overmind] run_script requires user confirmation - not yet implemented")
}

function handleQuerySearch(data: { name?: string; className?: string; parent?: string; tags?: string; maxResults?: number }): void {
	const { name, className, parent, tags } = data
	
	let searchParent: Instance | undefined = undefined
	if (parent) {
		searchParent = resolveParentInstance(parent)
		if (!searchParent) {
			warn(`[Overmind] Parent not found: ${parent}`)
			return
		}
	}

	const query = name || "*"
	const objects = findObjectByQuery(query, className, searchParent)

	let filtered = objects
	if (tags) {
		const tagList = string.split(tags, ",")
		filtered = objects.filter((obj) => {
			for (const tag of tagList) {
				const trimmed = string.gsub(tag, "^%s*(.-)%s*$", "%1")[0] as string
				if (!CollectionService.HasTag(obj, trimmed)) {
					return false
				}
			}
			return true
		})
	}

	print(`[Overmind] Found ${filtered.size()} objects`)
	for (const obj of filtered) {
		print(`  - ${obj.Name} (${obj.ClassName})`)
	}
}

function handleGrepSearch(data: { pattern: string; scriptType?: string; parent?: string; caseSensitive?: boolean; maxResults?: number }): void {
	const { pattern, scriptType, parent, caseSensitive } = data
	if (!pattern) {
		warn("[Overmind] Invalid grep_search data")
		return
	}

	let searchParent: Instance = game
	if (parent) {
		const resolved = resolveParentInstance(parent)
		if (resolved) searchParent = resolved
	}

	const results: { scriptName: string; lineNum: number; lineContent: string }[] = []
	const maxResults = data.maxResults || 100

	function searchScripts(inst: Instance, depth: number) {
		if (depth > 20 || results.size() >= maxResults) return

		if (inst.IsA("ModuleScript") || inst.IsA("Script") || inst.IsA("LocalScript")) {
			const matchesType = scriptType === undefined ||
				(scriptType === "server" && inst.IsA("Script")) ||
				(scriptType === "client" && inst.IsA("LocalScript")) ||
				(scriptType === "module" && inst.IsA("ModuleScript"))

			if (matchesType) {
				const source = (inst as ModuleScript).Source
				const lines = string.split(source, "\n")

				for (let i = 0; i < lines.size(); i++) {
					const lineText = lines[i]
					const searchLine = caseSensitive ? lineText : string.lower(lineText)
					const searchPattern = caseSensitive ? pattern : string.lower(pattern)

					if (string.find(searchLine, searchPattern, 1, true)[0] !== undefined) {
						results.push({ scriptName: inst.Name, lineNum: i + 1, lineContent: lineText })
						if (results.size() >= maxResults) return
					}
				}
			}
		}

		for (const child of inst.GetChildren()) {
			searchScripts(child, depth + 1)
		}
	}

	searchScripts(searchParent, 0)

	print(`[Overmind] Found ${results.size()} matches`)
	for (const result of results) {
		print(`  ${result.scriptName}:${result.lineNum} - ${result.lineContent}`)
	}
}

function handleCloneObject(data: { query: string; newParent?: string; newName?: string; properties?: Record<string, unknown>; tags?: string }): void {
	const { query, newParent, newName, properties, tags } = data
	if (!query) {
		warn("[Overmind] Invalid clone_object data")
		return
	}

	const objects = findObjectByQuery(query)
	if (objects.size() === 0) {
		warn(`[Overmind] No objects found matching: ${query}`)
		return
	}

	const sourceObject = objects[0]
	const cloned = sourceObject.Clone()

	if (newName) cloned.Name = newName
	if (properties) applyProperties(cloned, properties)
	if (tags) applyTags(cloned, tags)

	if (newParent) {
		const parentInstance = resolveParentInstance(newParent)
		if (parentInstance) {
			cloned.Parent = parentInstance
		} else {
			cloned.Parent = sourceObject.Parent
		}
	} else {
		cloned.Parent = sourceObject.Parent
	}

	print(`[Overmind] Cloned object: ${sourceObject.Name} -> ${cloned.Name}`)
}

function handleSearch(data: { query: string; mode?: string; searchIn?: string; parent?: string; className?: string; caseSensitive?: boolean; maxResults?: number }): void {
	const { query, mode = "text", searchIn = "all", parent, className, caseSensitive = false, maxResults = 100 } = data
	if (!query) {
		warn("[Overmind] Invalid search data")
		return
	}

	print(`[Overmind] Searching for: ${query} (mode: ${mode}, in: ${searchIn})`)

	let searchParent: Instance = game
	if (parent) {
		const resolved = resolveParentInstance(parent)
		if (resolved) searchParent = resolved
	}

	interface SearchResult {
		type: "instance" | "script" | "property"
		path: string
		name: string
		className: string
		details?: string
	}

	const results: SearchResult[] = []

	function matchesQuery(text: string): boolean {
		const searchText = caseSensitive ? text : string.lower(text)
		const searchQuery = caseSensitive ? query : string.lower(query)

		if (mode === "regex") {
			const [match] = string.find(searchText, searchQuery)
			return match !== undefined
		} else if (mode === "glob") {
			const pattern = string.gsub(searchQuery, "%*", ".*")[0]
			const regexPattern = "^" + pattern + "$"
			const [match] = string.find(searchText, regexPattern)
			return match !== undefined
		} else {
			return string.find(searchText, searchQuery, 1, true)[0] !== undefined
		}
	}

	function getFullPath(inst: Instance): string {
		const parts: string[] = []
		let current: Instance | undefined = inst
		while (current && current !== game) {
			parts.insert(0, current.Name)
			current = current.Parent as Instance | undefined
		}
		return parts.join("/")
	}

	function searchInstances(inst: Instance, depth: number) {
		if (depth > 20 || results.size() >= maxResults) return

		if (searchIn === "all" || searchIn === "instances") {
			if (matchesQuery(inst.Name)) {
				if (!className || inst.IsA(className as keyof Instances)) {
					results.push({
						type: "instance",
						path: getFullPath(inst),
						name: inst.Name,
						className: inst.ClassName,
					})
				}
			}
		}

		if ((searchIn === "all" || searchIn === "scripts") && (inst.IsA("ModuleScript") || inst.IsA("Script") || inst.IsA("LocalScript"))) {
			if (!className || inst.IsA(className as keyof Instances)) {
				const source = (inst as ModuleScript).Source
				const lines = string.split(source, "\n")

				for (let i = 0; i < lines.size(); i++) {
					if (results.size() >= maxResults) return
					if (matchesQuery(lines[i])) {
						results.push({
							type: "script",
							path: getFullPath(inst),
							name: inst.Name,
							className: inst.ClassName,
							details: `Line ${i + 1}: ${lines[i].sub(1, 100)}`,
						})
					}
				}
			}
		}

		for (const child of inst.GetChildren()) {
			searchInstances(child, depth + 1)
		}
	}

	searchInstances(searchParent, 0)

	print(`[Overmind] Found ${results.size()} search results`)
	for (const result of results) {
		if (result.details) {
			print(`  [${result.type}] ${result.path} - ${result.details}`)
		} else {
			print(`  [${result.type}] ${result.path} (${result.className})`)
		}
	}
}
