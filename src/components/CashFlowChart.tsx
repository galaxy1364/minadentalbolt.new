// CashFlowChart.tsx - Monthly Cash Flow Chart Component
import React from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { toJalaliStringPretty, formatCurrency } from '../lib/persianDate'
import type { Payment } from '../types'

interface CashFlowData {
  date: string
  income: number
  expense: number
  net: number
}

interface CashFlowChartProps {
  payments: Payment[]
  expenses: any[]
  startDate?: string
  endDate?: string
}

export function CashFlowChart({ payments, expenses, startDate, endDate }: CashFlowChartProps) {
  // Group data by month
  const monthlyData = React.useMemo(() => {
    const dataMap: Record<string, { income: number; expense: number }> = {}

    // Process payments (income)
    payments.forEach((payment) => {
      if (payment.status !== 'cancelled') {
        const monthKey = payment.payment_date?.slice(0, 7) || '' // YYYY-MM
        if (monthKey) {
          dataMap[monthKey] = dataMap[monthKey] || { income: 0, expense: 0 }
          dataMap[monthKey].income += Number(payment.amount) || 0
        }
      }
    })

    // Process expenses
    expenses?.forEach((expense: any) => {
      if (expense.status !== 'cancelled') {
        const monthKey = expense.date?.slice(0, 7) || ''
        if (monthKey) {
          dataMap[monthKey] = dataMap[monthKey] || { income: 0, expense: 0 }
          dataMap[monthKey].expense += Number(expense.amount) || 0
        }
      }
    })

    // Convert to array and sort by date
    const result: CashFlowData[] = []
    for (const [monthKey, values] of Object.entries(dataMap)) {
      result.push({
        date: monthKey,
        income: values.income,
        expense: values.expense,
        net: values.income - values.expense
      })
    }

    return result.sort((a, b) => a.date.localeCompare(b.date))
  }, [payments, expenses])

  // Filter by date range if provided
  const filteredData = React.useMemo(() => {
    if (!startDate && !endDate) return monthlyData
    
    return monthlyData.filter((d) => {
      if (startDate && d.date < startDate.slice(0, 7)) return false
      if (endDate && d.date > endDate.slice(0, 7)) return false
      return true
    })
  }, [monthlyData, startDate, endDate])

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const date = toJalaliStringPretty(label)
      const income = payload.find((p: any) => p.dataKey === 'income')?.value || 0
      const expense = payload.find((p: any) => p.dataKey === 'expense')?.value || 0
      const net = income - expense

      return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-4">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-2">{date}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            درآمد: <span className="text-success-600 dark:text-success-400 font-medium">{formatCurrency(income)}</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            هزینه: <span className="text-error-600 dark:text-error-400 font-medium">{formatCurrency(expense)}</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            خالص: <span className={`font-medium ${net >= 0 ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400'}`}>
              {formatCurrency(net)}
            </span>
          </p>
        </div>
      )
    }
    return null
  }

  if (filteredData.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 dark:text-slate-500">
        داده‌ای برای نمایش وجود ندارد
      </div>
    )
  }

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#e2e8f0" 
            vertical={false}
          />
          <XAxis 
            dataKey="date" 
            tickFormatter={(value) => toJalaliStringPretty(value).slice(0, 7)}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            tickFormatter={(value) => formatCurrency(value)}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Area 
            type="monotone" 
            dataKey="income" 
            stroke="#10b981" 
            strokeWidth={2}
            fill="url(#incomeGradient)" 
            name="درآمد"
          />
          <Area 
            type="monotone" 
            dataKey="expense" 
            stroke="#ef4444" 
            strokeWidth={2}
            fill="url(#expenseGradient)" 
            name="هزینه"
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Summary */}
      <div className="mt-4 flex items-center justify-between text-xs">
        <div className="text-center">
          <p className="text-slate-500 dark:text-slate-400">کل درآمد</p>
          <p className="text-success-600 dark:text-success-400 font-medium">
            {formatCurrency(filteredData.reduce((sum, d) => sum + d.income, 0))}
          </p>
        </div>
        <div className="text-center">
          <p className="text-slate-500 dark:text-slate-400">کل هزینه</p>
          <p className="text-error-600 dark:text-error-400 font-medium">
            {formatCurrency(filteredData.reduce((sum, d) => sum + d.expense, 0))}
          </p>
        </div>
        <div className="text-center">
          <p className="text-slate-500 dark:text-slate-400">خالص</p>
          <p className={`font-medium ${
            filteredData.reduce((sum, d) => sum + d.net, 0) >= 0 
              ? 'text-success-600 dark:text-success-400' 
              : 'text-error-600 dark:text-error-400'
          }`}>
            {formatCurrency(filteredData.reduce((sum, d) => sum + d.net, 0))}
          </p>
        </div>
      </div>
    </div>
  )
}

export default CashFlowChart
