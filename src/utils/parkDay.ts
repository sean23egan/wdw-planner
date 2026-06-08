import type { ParkDay } from '../types';

const PARK_ABBR: Record<string, string> = {
  'Magic Kingdom': 'MK',
  'EPCOT': 'EP',
  'Hollywood Studios': 'HS',
  'Animal Kingdom': 'AK',
};

const PARK_COLORS: Record<string, string> = {
  'Magic Kingdom': 'bg-purple-100 text-purple-800',
  'EPCOT': 'bg-blue-100 text-blue-800',
  'Hollywood Studios': 'bg-red-100 text-red-800',
  'Animal Kingdom': 'bg-green-100 text-green-800',
};

/** Display info for a park day, tolerating non-park (rest) days. */
export function parkDayDisplay(day: Pick<ParkDay, 'park' | 'noPark'>) {
  if (day.noPark) {
    return { label: 'No Park', abbr: 'Rest', colorClass: 'bg-gray-100 text-gray-600', isPark: false };
  }
  return {
    label: day.park,
    abbr: PARK_ABBR[day.park] ?? day.park,
    colorClass: PARK_COLORS[day.park] ?? 'bg-gray-100 text-gray-700',
    isPark: true,
  };
}

/** Short label for the arrival/departure travel tag, or null. */
export function travelTagLabel(tag?: 'arrival' | 'departure'): string | null {
  if (tag === 'arrival') return '✈️ Arrival';
  if (tag === 'departure') return '✈️ Departure';
  return null;
}
