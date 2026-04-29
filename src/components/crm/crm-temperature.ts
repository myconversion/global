export type CrmTemperature = 'hot' | 'warm' | 'cold';

export interface CadenceSettings {
  warm_after_days: number;
  cold_after_days: number;
}

export const DEFAULT_CADENCE: CadenceSettings = {
  warm_after_days: 3,
  cold_after_days: 7,
};

/**
 * Compute dynamic temperature based on last interaction / creation date
 * and company cadence settings.
 *
 * - Created today (or last interaction today) → hot
 * - Days since last contact < warm_after_days → hot
 * - Days between warm_after_days and cold_after_days → warm
 * - Days >= cold_after_days → cold
 */
export function computeTemperature(
  createdAt: string | null | undefined,
  lastInteractionAt: string | null | undefined,
  settings: CadenceSettings = DEFAULT_CADENCE
): CrmTemperature {
  const referenceDate = lastInteractionAt || createdAt;
  if (!referenceDate) return 'cold';

  const now = new Date();
  const ref = new Date(referenceDate);
  const diffMs = now.getTime() - ref.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < settings.warm_after_days) return 'hot';
  if (diffDays < settings.cold_after_days) return 'warm';
  return 'cold';
}
