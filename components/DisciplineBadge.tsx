import { DISCIPLINE_LABELS, DISCIPLINE_COLORS, type Discipline } from '@/types'

interface DisciplineBadgeProps {
  discipline: Discipline
  size?: 'sm' | 'md'
  showLabel?: boolean
}

export function DisciplineBadge({ discipline, size = 'sm', showLabel = true }: DisciplineBadgeProps) {
  const label = DISCIPLINE_LABELS[discipline]
  const colors = DISCIPLINE_COLORS[discipline]
  
  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2 py-0.5' 
    : 'text-sm px-2.5 py-1'

  return (
    <span className={`inline-flex items-center rounded-full border ${colors} ${sizeClasses} font-medium`}>
      {showLabel ? label : discipline}
    </span>
  )
}
