export type ResortTypeId =
  | 'beach'
  | 'mountain'
  | 'nature'
  | 'city'
  | 'countryside'
  | 'staycation'
  | 'private'
  | 'villa'
  | 'glamping'
  | 'farmstay'
  | 'spa'

export const RESORT_TYPES: { id: ResortTypeId; label: string }[] = [
  { id: 'beach', label: 'Beach Resort' },
  { id: 'mountain', label: 'Mountain Resort' },
  { id: 'nature', label: 'Nature Retreat' },
  { id: 'city', label: 'City Resort' },
  { id: 'countryside', label: 'Countryside' },
  { id: 'staycation', label: 'Staycation' },
  { id: 'private', label: 'Private Resort' },
  { id: 'villa', label: 'Villa' },
  { id: 'glamping', label: 'Glamping' },
  { id: 'farmstay', label: 'Farmstay' },
  { id: 'spa', label: 'Spa' },
]

export function getResortTypeLabel(id?: string | null): string {
  if (!id) return '—'
  const found = RESORT_TYPES.find((t) => t.id === id)
  return found ? found.label : String(id)
}
