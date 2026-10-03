import type { SortOption, TrendingKeyword } from '../types'
import { PROFESSIONAL_ROLES, type ProfessionalRole } from '../lib/roles'
import { Clock, TrendingUp, ChevronDown } from 'lucide-react'

interface FilterBarProps {
  sort: SortOption
  selectedKeyword: string | null
  trendingKeywords: TrendingKeyword[]
  feedRoleFilter: ProfessionalRole | null
  onSortChange: (sort: SortOption) => void
  onKeywordSelect: (keyword: string | null) => void
  onFeedRoleFilterChange: (role: ProfessionalRole | null) => void
}

const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
  { value: 'latest', label: 'Latest', icon: <Clock className="w-4 h-4" /> },
  { value: 'popular', label: 'Popular', icon: <TrendingUp className="w-4 h-4" /> },
]

export function FilterBar({
  sort,
  selectedKeyword,
  trendingKeywords,
  feedRoleFilter,
  onSortChange,
  onKeywordSelect,
  onFeedRoleFilterChange,
}: FilterBarProps) {
  const showKeywords = trendingKeywords.length > 0
  const sectionTitle = sort === 'popular' ? 'Popular stories' : 'Latest stories'

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <h2 id="feed-title" className="text-[20px] font-semibold text-ink">
          {sectionTitle}
        </h2>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <label className="sr-only" htmlFor="feed-role-filter">For your role</label>
          <div className="relative">
            <select
              id="feed-role-filter"
              value={feedRoleFilter ?? ''}
              onChange={(e) => {
                const value = e.target.value
                onFeedRoleFilterChange(value ? (value as ProfessionalRole) : null)
              }}
              className="role-select appearance-none pl-3 pr-8 py-1.5 text-[13px] font-medium text-stone bg-paper border border-border rounded-[var(--radius-chip)] cursor-pointer hover:border-signal/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            >
              <option value="">Show all roles</option>
              {PROFESSIONAL_ROLES.map((role) => (
                <option key={role} value={role}>
                  For {role}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-meta"
              aria-hidden
            />
          </div>
          <div className="seg-control" role="group" aria-label="Sort">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onSortChange(option.value)}
                aria-pressed={sort === option.value}
                className={`seg-btn flex items-center gap-1.5 ${sort === option.value ? 'seg-btn-active' : ''}`}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showKeywords && (
        <div
          className="chip-row flex gap-2 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:pb-1 sm:flex-wrap"
          role="group"
          aria-label="Filter by keyword"
        >
          <button
            type="button"
            onClick={() => onKeywordSelect(null)}
            aria-pressed={selectedKeyword === null}
            className={`chip ${selectedKeyword === null ? 'chip-active' : ''}`}
          >
            All
          </button>
          {trendingKeywords.map(({ keyword }) => {
            const isActive = selectedKeyword === keyword
            return (
              <button
                key={keyword}
                type="button"
                onClick={() => onKeywordSelect(keyword)}
                aria-pressed={isActive}
                className={`chip ${isActive ? 'chip-active' : ''}`}
              >
                {keyword}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
