import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts'
import { AnalyticsCardProps } from '@/types'
import { formatCurrency, formatPercentage, formatNumber } from '@/utils/formatters'

// Reusable Analytics Mini Chart Component
const AnalyticsMiniChart = ({
  data,
  chartColor,
}: {
  data: number[]
  chartColor: string
}) => {
  const chartData = data.map((value, index) => ({
    name: `Day ${index + 1}`,
    value: value,
  }))

  const gradientId = `color_${chartColor.replace(/[^a-zA-Z0-9]/g, '')}`

  return (
    <div className='w-full h-[100px]'>
      <ResponsiveContainer width='100%' height='100%'>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={gradientId} x1='0' y1='0' x2='0' y2='1'>
              <stop offset='5%' stopColor={chartColor} stopOpacity={0.4} />
              <stop offset='95%' stopColor={chartColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            contentStyle={{
              backgroundColor: '#111827',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
            }}
            labelStyle={{ display: 'none' }}
            formatter={(value: any) => [`${value}`, '']}
          />
          <Area
            type='monotone'
            dataKey='value'
            stroke={chartColor}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// Reusable Analytics Card Component
const AnalyticsCard = ({
  title,
  value,
  changePercent,
  trendData,
  icon: Icon,
  chartColor,
  formatAsCurrency = false,
  formatAsPercent = false,
}: AnalyticsCardProps) => {
  let formattedValue: string
  if (formatAsCurrency) {
    formattedValue = formatCurrency(value)
  } else if (formatAsPercent) {
    formattedValue = formatPercentage(value)
  } else {
    formattedValue = formatNumber(value)
  }

  return (
    <div className='bg-primary p-4 rounded-lg flex flex-col justify-between h-[200px]'>
      <div className='flex justify-between items-start'>
        <div className='flex items-center gap-4'>
          <div
            className='flex items-center justify-center h-10 w-10 rounded-full'
            style={{ backgroundColor: `${chartColor}33` }}
          >
            <Icon className='h-5 w-5' style={{ color: chartColor }} />
          </div>
          <div>
            <p className='text-sm text-primary-foreground/50'>{title}</p>
            <p className='text-2xl font-bold text-primary-foreground'>
              {formattedValue}
            </p>
          </div>
        </div>

        {changePercent != null && (
          <div>
            <p className='text-sm text-primary-foreground/50 text-right'>
              Last 7 days
            </p>
            <div className={`flex items-center justify-end gap-1 font-semibold text-sm`}>
              {changePercent >= 0 ? (
                <TrendingUp className='h-4 w-4 text-green-500' />
              ) : (
                <TrendingDown className='h-4 w-4 text-red-500' />
              )}
              <span className='text-primary-foreground font-semibold'>
                {changePercent.toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>
      {trendData && chartColor && (
        <AnalyticsMiniChart data={trendData} chartColor={chartColor} />
      )}
    </div>
  )
}

export default AnalyticsCard 