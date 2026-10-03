import type { SortOption, TrendingKeyword } from '../types'
import { PROFESSIONAL_ROLES, type ProfessionalRole } from '../lib/roles'
import { lookupGlossary } from '../lib/glossary'
import type { GlossaryEntry } from '../lib/glossary'
import { GlossaryChip } from './GlossaryChip'
import { ChipSelect } from './ChipSelect'

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
    { value: '', label: 'All roles' },
    ...PROFESSIONAL_ROLES.map((role) => ({ value: role, label: role })),
  ]

  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between gap-4 mb-4 flex-wrap">
        <h2 id="feed-title" className="text-[20px] font-semibold text-ink">
          {sort === 'popular' ? 'Popular stories' : 'Latest stories'}
        </h2>
        <div className="sort-text-toggle text-[14px] font-medium" role="group" aria-label="Sort">
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

      <div
        className="chip-row flex gap-2 items-center max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:pb-1 sm:flex-wrap"
        role="group"
        aria-label="Filters"
      >
        <ChipSelect
          id="feed-role-filter"
          value={feedRoleFilter ?? ''}
          options={roleOptions}
          prefix="For"
          aria-label="Filter stories for your role"
          onChange={(value) =>
            onFeedRoleFilterChange(value ? (value as ProfessionalRole) : null)
          }
        />
        <button
          type="button"
          onClick={() => onKeywordSelect(null)}
          aria-pressed={selectedKeyword === null}
          className={`chip ${selectedKeyword === null ? 'chip-active' : ''}`}
        >
          All topics
        </button>
        {trendingKeywords.map(({ keyword }) => (
          <GlossaryChip
            key={keyword}
            label={keyword}
            entry={lookupGlossary(glossary, keyword)}
            active={selectedKeyword === keyword}
            onSelect={() => onKeywordSelect(keyword)}
          />
        ))}
      </div>
    </div>
  )
}
