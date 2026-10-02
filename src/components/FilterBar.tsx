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
      <div className="flex items-center justify-between gap-6 flex-wrap mb-6">
        <h2 
          id="feed-title" 
          className="m-0 text-2xl font-semibold"
          style={{ lineHeight: 1.33, letterSpacing: '-0.02em', color: '#0F172A' }}
        >
          Latest stories
        </h2>
        <div
          className="inline-flex p-1 gap-1 rounded-xl"
          style={{ 
            background: '#F1F5F9', 
            border: '1px solid #E2E8F0',
          }}
          role="group"
          aria-label="Sort"
        >
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onSortChange(option.value)}
              aria-pressed={sort === option.value}
              className={`seg-btn inline-flex items-center gap-2 h-8 px-3 border-0 rounded-lg text-sm font-medium cursor-pointer ${
                sort === option.value ? 'seg-btn-active' : ''
              }`}
              style={{ 
                background: sort === option.value ? '#FFFFFF' : 'transparent',
                color: sort === option.value ? '#0F172A' : '#475569',
                boxShadow: sort === option.value ? '0 1px 2px rgba(15, 23, 42, 0.04), 0 2px 6px rgba(15, 23, 42, 0.04)' : 'none',
              }}
            >
              <span style={{ color: sort === option.value ? '#4F46E5' : 'inherit' }}>
                {option.icon}
              </span>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8" role="group" aria-label="Filter by topic">
          {availableTags.map((tag) => {
            const isActive = selectedTags.includes(tag)
            return (
              <button
                key={tag}
                onClick={() => onTagToggle(tag)}
                aria-pressed={isActive}
                className={`chip h-8 px-4 rounded-full text-sm font-medium cursor-pointer ${isActive ? 'chip-active' : ''}`}
                style={{ 
                  background: isActive ? '#EEF2FF' : '#FFFFFF',
                  border: `1px solid ${isActive ? '#C7D2FE' : '#E2E8F0'}`,
                  color: isActive ? '#4338CA' : '#475569',
                }}
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
