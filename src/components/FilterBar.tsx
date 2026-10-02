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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 p-1 bg-[--color-bg-card] rounded-xl">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onSortChange(option.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                sort === option.value
                  ? 'bg-[--color-accent] text-white'
                  : 'text-[--color-text-secondary] hover:text-[--color-text-primary] hover:bg-[--color-bg-card-hover]'
              }`}
            >
              {option.icon}
              <span className="hidden sm:inline">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagToggle(tag)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedTags.includes(tag)
                  ? 'bg-[--color-accent] text-white'
                  : 'bg-[--color-bg-card] text-[--color-text-secondary] hover:bg-[--color-bg-card-hover] hover:text-[--color-text-primary]'
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
