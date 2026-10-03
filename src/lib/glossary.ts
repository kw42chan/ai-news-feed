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
    map.set(normalizeTermKey(row.term), entry)
    for (const alias of entry.aliases) {
      map.set(normalizeTermKey(alias), entry)
    }
  }
  cache = map
  return map
}

export function normalizeTermKey(term: string): string {
  return term.trim().toLowerCase()
}

export function lookupGlossary(
  map: Map<string, GlossaryEntry>,
  label: string
): GlossaryEntry | undefined {
  return map.get(normalizeTermKey(label))
}
