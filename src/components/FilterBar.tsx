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
  { value: 'latest', label: 'Latest', icon: <Clock className="w-[15px] h-[15px]" /> },
  { value: 'popular', label: 'Popular', icon: <TrendingUp className="w-[15px] h-[15px]" /> },
]

export function FilterBar({
  sort,
  selectedTags,
  availableTags,
  onSortChange,
  onTagToggle,
}: FilterBarProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-[--space-6] flex-wrap mb-[--space-6]">
        <h2 id="feed-title" className="m-0 text-[--text-2xl] leading-[1.33] font-semibold tracking-tight">
          Latest stories
        </h2>
        <div
          className="inline-flex p-1 gap-1 bg-[--color-surface-muted] border border-[--color-border] rounded-[--radius-md]"
          role="group"
          aria-label="Sort"
        >
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onSortChange(option.value)}
              aria-pressed={sort === option.value}
              className={`inline-flex items-center gap-[--space-2] h-8 px-[--space-3] border-0 rounded-[--radius-sm] text-[--text-sm] font-medium cursor-pointer transition-all duration-[--dur] ${
                sort === option.value
                  ? 'bg-[--color-surface] text-[--color-text] shadow-[--shadow-sm]'
                  : 'bg-transparent text-[--color-text-secondary] hover:text-[--color-text]'
              }`}
            >
              <span className={sort === option.value ? 'text-[--color-accent]' : ''}>
                {option.icon}
              </span>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-[--space-2] mb-[--space-8]" role="group" aria-label="Filter by topic">
          {availableTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagToggle(tag)}
              aria-pressed={selectedTags.includes(tag)}
              className={`h-8 px-[--space-4] rounded-[--radius-pill] border text-[--text-sm] font-medium cursor-pointer transition-all duration-[--dur] focus-visible:rounded-[--radius-pill] ${
                selectedTags.includes(tag)
                  ? 'bg-[--color-accent-soft] border-[--color-accent-border] text-[--color-accent-hover]'
                  : 'bg-[--color-surface] border-[--color-border] text-[--color-text-secondary] hover:border-[--color-accent-border] hover:text-[--color-accent]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
