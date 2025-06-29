import React from 'react'
import { TodaySummaryCardProps } from '@/types'
import { formatCurrency, formatNumber } from '@/utils/formatters'

const TodaySummaryCard = ({
  title,
  value,
  icon: Icon,
  color,
  formatAsCurrency = false,
}: TodaySummaryCardProps) => {
  const formattedValue = formatAsCurrency
    ? formatCurrency(value)
    : formatNumber(value)

  return (
    <div
      className='p-4 rounded-lg relative overflow-hidden'
      style={{
        background: `linear-gradient(135deg, ${color} 0%, #1E293B 100%)`,
      }}
    >
      <Icon className='absolute -right-4 -bottom-4 h-24 w-24 text-primary-foreground/20' />
      <p className='text-foreground/80'>{title}</p>
      <p className='text-3xl font-bold text-foreground mt-2'>
        {formattedValue}
      </p>
    </div>
  )
}

export default TodaySummaryCard 