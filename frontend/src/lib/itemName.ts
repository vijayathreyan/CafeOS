/**
 * Returns the correct display name for an item based on the active language.
 * Accepts items from item_master (name_en/name_ta) or snack arrays (item_name/name_ta).
 * Falls back to the English name if Tamil is not available.
 */
export function getItemName(
  item: { name_en?: string; item_name?: string; name_ta?: string | null },
  language: string
): string {
  const english = item.name_en ?? item.item_name ?? ''
  if (language === 'ta' && item.name_ta) return item.name_ta
  return english
}
