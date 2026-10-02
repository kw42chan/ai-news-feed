import type { SortOption } from '../types'
import { Clock, TrendingUp } from 'lucide-react'

interface FilterBarProps {
  sort: SortOption
  selectedTags: string[]
  availableTags: string[]
  onSortChange: (sort: SortOption) => void
  onTagToggle: (tag: string) => void
}

const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
  { value: 'latest', label: 'Latest', icon: <Clock className="w-4 h-4" /> },
  { value: 'popular', label: 'Popular', icon: <TrendingUp className="w-4 h-4" /> },
]

export function FilterBar({
  sort,
  selectedTags,
  availableTags,
  onSortChange,
  onTagToggle,
}: FilterBarProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <h2 id="feed-title" className="text-[20px] font-semibold text-ink">
          Latest stories
        </h2>
        <div className="seg-control" role="group" aria-label="Sort">
          {sortOptions.map((option) => (
            <button
              key={option.value}
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

      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by topic">
          {availableTags.map((tag) => {
            const isActive = selectedTags.includes(tag)
            return (
              <button
                key={tag}
                onClick={() => onTagToggle(tag)}
                aria-pressed={isActive}
                className={`chip ${isActive ? 'chip-active' : ''}`}
              >
                {tag}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
