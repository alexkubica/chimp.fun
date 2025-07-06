import { cn } from '@/lib/utils'

describe('cn utility function', () => {
  it('merges class names correctly', () => {
    const result = cn('class1', 'class2', 'class3')
    expect(result).toBe('class1 class2 class3')
  })

  it('handles undefined and null values', () => {
    const result = cn('class1', undefined, 'class2', null, 'class3')
    expect(result).toBe('class1 class2 class3')
  })

  it('handles conditional classes', () => {
    const condition = true
    const result = cn('base-class', condition && 'conditional-class')
    expect(result).toBe('base-class conditional-class')
  })

  it('handles false conditional classes', () => {
    const condition = false
    const result = cn('base-class', condition && 'conditional-class')
    expect(result).toBe('base-class')
  })

  it('handles empty input', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('handles object with boolean values', () => {
    const result = cn({
      'class1': true,
      'class2': false,
      'class3': true
    })
    expect(result).toBe('class1 class3')
  })
})