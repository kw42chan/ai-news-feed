export function isSchemaMismatchError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('column') &&
    (lower.includes('does not exist') ||
      lower.includes('could not find') ||
      lower.includes('schema cache'))
  ) || lower.includes('weekly_recaps') && lower.includes('does not exist')
}
