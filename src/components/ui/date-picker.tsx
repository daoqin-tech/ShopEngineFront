import React from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "选择日期",
  className
}: DatePickerProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value) {
      onDateChange?.(new Date(value))
    } else {
      onDateChange?.(undefined)
    }
  }

  const formatDateForInput = (date?: Date) => {
    if (!date) return ''
    return format(date, 'yyyy-MM-dd')
  }

  return (
    <div className={cn("relative", className)}>
      <input
        type="date"
        value={formatDateForInput(date)}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          "w-full px-3 py-2 pl-10 border border-gray-300 rounded-md text-sm",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          "bg-white"
        )}
      />
      <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  )
}

interface DateTimePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
}

export function DateTimePicker({
  date,
  onDateChange,
  placeholder = "选择日期时间",
  className
}: DateTimePickerProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value) {
      onDateChange?.(new Date(value))
    } else {
      onDateChange?.(undefined)
    }
  }

  const formatDateTimeForInput = (date?: Date) => {
    if (!date) return ''
    return format(date, "yyyy-MM-dd'T'HH:mm")
  }

  return (
    <div className={cn("relative", className)}>
      <input
        type="datetime-local"
        value={formatDateTimeForInput(date)}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          "w-full px-3 py-2 pl-10 border border-gray-300 rounded-md text-sm",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          "bg-white"
        )}
      />
      <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  )
}