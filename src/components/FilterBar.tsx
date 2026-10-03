import type { SortOption, TrendingKeyword } from '../types'
import { PROFESSIONAL_ROLES, type ProfessionalRole } from '../lib/roles'
import { lookupGlossary } from '../lib/glossary'
import type { GlossaryEntry } from '../lib/glossary'
import { TextSelect } from './TextSelect'

interface FilterBarProps {
  sort: SortOption
  selectedKeyword: string | null
  trendingKeywords: TrendingKeyword[]
  feedRoleFilter: ProfessionalRole | null
  glossary: Map<string, GlossaryEntry>
  onSortChange: (sort: SortOption) => void
  onKeywordSelect: (keyword: string | null) => void
  onFeedRoleFilterChange: (role: ProfessionalRole | null) => void
}

export function FilterBar({
  sort,
  selectedKeyword,
  trendingKeywords,
  feedRoleFilter,
  glossary,
  onSortChange,
  onKeywordSelect,
  onFeedRoleFilterChange,
}: FilterBarProps) {
  const roleOptions = [
    { value: '', label: 'everyone' },
    ...PROFESSIONAL_ROLES.map((role) => ({ value: role, label: role })),
  ]

  const selectedGlossary =
    selectedKeyword ? lookupGlossary(glossary, selectedKeyword) : undefined

  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
        <h2 id="feed-title" className="text-[20px] font-semibold text-ink">
          {sort === 'popular' ? 'Popular stories' : 'Latest stories'}
        </h2>
        <div className="flex items-center gap-3 text-[14px] font-medium flex-wrap justify-end">
          <TextSelect
            id="feed-role-filter"
            value={feedRoleFilter ?? ''}
            prefix="For"
            aria-label="Filter stories for your role"
            options={roleOptions}
            onChange={(value) =>
              onFeedRoleFilterChange(value ? (value as ProfessionalRole) : null)
            }
          />
          <div className="sort-text-toggle whitespace-nowrap" role="group" aria-label="Sort">
            <button
              type="button"
              className={sort === 'latest' ? 'sort-text-active' : ''}
              aria-pressed={sort === 'latest'}
              onClick={() => onSortChange('latest')}
            >
              Latest
            </button>
            <span className="text-meta mx-1.5" aria-hidden="true">|</span>
            <button
              type="button"
              className={sort === 'popular' ? 'sort-text-active' : ''}
              aria-pressed={sort === 'popular'}
              onClick={() => onSortChange('popular')}
            >
              Popular
            </button>
          </div>
        </div>
      </div>

      <div
        className="chip-row flex gap-2 items-center max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:pb-1 sm:flex-wrap"
        role="group"
        aria-label="Filter by topic"
      >
        <button
          type="button"
          onClick={() => onKeywordSelect(null)}
          aria-pressed={selectedKeyword === null}
          className={`chip ${selectedKeyword === null ? 'chip-active' : ''}`}
        >
          All topics
        </button>
        {trendingKeywords.map(({ keyword }) => (
          <button
            key={keyword}
            type="button"
            onClick={() => onKeywordSelect(keyword)}
            aria-pressed={selectedKeyword === keyword}
            className={`chip ${selectedKeyword === keyword ? 'chip-active' : ''}`}
          >
            {keyword}
          </button>
        ))}
      </div>

      {selectedKeyword && selectedGlossary && (
        <p className="glossary-hint mt-3 text-[14px] leading-relaxed text-stone" aria-live="polite">
          <span className="font-display font-semibold text-ink">{selectedGlossary.term}</span>
          {' — '}
          {selectedGlossary.definition}
        </p>
      )}
    </div>
  )
}
