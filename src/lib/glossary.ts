import { supabase } from './supabase'

export interface GlossaryEntry {
  term: string
  definition: string
  aliases: string[]
}

let cache: Map<string, GlossaryEntry> | null = null

export async function loadGlossary(): Promise<Map<string, GlossaryEntry>> {
  if (cache) return cache

  const { data, error } = await supabase.from('glossary').select('term, definition, aliases')
  if (error) throw new Error(error.message)

  const map = new Map<string, GlossaryEntry>()
  for (const row of data ?? []) {
    const entry: GlossaryEntry = {
      term: row.term,
      definition: row.definition,
      aliases: row.aliases ?? [],
    }
    registerGlossaryKeys(map, entry)
  }
  cache = map
  return map
}

function registerGlossaryKeys(map: Map<string, GlossaryEntry>, entry: GlossaryEntry): void {
  for (const key of expandLookupKeys(entry.term)) {
    map.set(key, entry)
  }
  for (const alias of entry.aliases) {
    for (const key of expandLookupKeys(alias)) {
      map.set(key, entry)
    }
  }
}

export function normalizeTermKey(term: string): string {
  return term.trim().toLowerCase()
}

function singularize(term: string): string {
  if (term.endsWith('ies') && term.length > 4) {
    return `${term.slice(0, -3)}y`
  }
  if (term.endsWith('s') && !term.endsWith('ss') && term.length > 3) {
    return term.slice(0, -1)
  }
  return term
}

function expandLookupKeys(label: string): string[] {
  const base = normalizeTermKey(label)
  const sing = singularize(base)
  return base === sing ? [base] : [base, sing]
}

export function lookupGlossary(
  map: Map<string, GlossaryEntry>,
  label: string
): GlossaryEntry | undefined {
  for (const key of expandLookupKeys(label)) {
    const hit = map.get(key)
    if (hit) return hit
  }
  const target = singularize(normalizeTermKey(label))
  for (const [key, entry] of map) {
    if (singularize(key) === target) return entry
  }
  return undefined
}
