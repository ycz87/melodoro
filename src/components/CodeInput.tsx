/**
 * CodeInput — 6-digit verification code input with individual boxes
 */
import { useRef, useState, useCallback } from 'react'
import type { KeyboardEvent, ClipboardEvent } from 'react'
import { useTheme } from '../hooks/useTheme'

interface CodeInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function CodeInput({ value, onChange, disabled }: CodeInputProps) {
  const theme = useTheme()
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const digits = value.padEnd(6, '').slice(0, 6).split('')

  const focusInput = useCallback((index: number) => {
    if (index >= 0 && index < 6) {
      inputRefs.current[index]?.focus()
    }
  }, [])

  const handleInput = useCallback((index: number, char: string) => {
    if (!/^\d$/.test(char)) return
    const next = digits.slice()
    next[index] = char
    onChange(next.join('').replace(/ /g, ''))
    if (index < 5) focusInput(index + 1)
  }, [digits, onChange, focusInput])

  const handleKeyDown = useCallback((index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const next = digits.slice()
      if (digits[index] && digits[index] !== ' ') {
        next[index] = ' '
        onChange(next.join('').replace(/ /g, ''))
      } else if (index > 0) {
        next[index - 1] = ' '
        onChange(next.join('').replace(/ /g, ''))
        focusInput(index - 1)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1)
    } else if (e.key === 'ArrowRight' && index < 5) {
      focusInput(index + 1)
    }
  }, [digits, onChange, focusInput])

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length > 0) {
      onChange(pasted)
      focusInput(Math.min(pasted.length, 5))
    }
  }, [onChange, focusInput])

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i]?.trim() || ''}
          disabled={disabled}
          className="w-11 h-13 rounded-xl text-center text-xl font-semibold outline-none transition-all duration-200 border-2"
          style={{
            backgroundColor: theme.inputBg,
            color: theme.text,
            borderColor: digits[i]?.trim() ? theme.accent : theme.border,
            boxShadow: focusedIndex === i
              ? `0 0 0 2px ${theme.accent}40`
              : 'none',
          }}
          onFocus={(e) => {
            setFocusedIndex(i)
            e.target.select()
          }}
          onBlur={() => setFocusedIndex((current) => (current === i ? null : current))}
          onInput={(e) => {
            const val = (e.target as HTMLInputElement).value
            if (val) handleInput(i, val.slice(-1))
          }}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  )
}
