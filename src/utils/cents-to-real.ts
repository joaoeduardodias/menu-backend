export function centsToReal(value: string | number): string {
  if (value === null || value === undefined) return ''

  const cents =
    typeof value === 'number'
      ? Math.trunc(value)
      : Number(value.replace(/\D/g, ''))

  if (!cents) return ''

  const numberValue = (cents / 100).toFixed(2)
  const [integer, decimal] = numberValue.split('.')

  const withThousands = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  return `R$ ${withThousands},${decimal}`
}