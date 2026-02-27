import type { QuantityTypeIdentifier } from '@kingstinct/react-native-healthkit';
import type { HealthKitStatus, HealthKitDailyData } from '@/types';

// Lazy-load the native HealthKit module to prevent app crash at import time
// if HealthKit entitlements are ever misconfigured. The NitroModules-based library
// calls HKHealthStore.init() at module load, which causes a native SIGABRT
// without the com.apple.developer.healthkit entitlement.
async function getHK() {
  return await import('@kingstinct/react-native-healthkit');
}

const STEP_COUNT: QuantityTypeIdentifier = 'HKQuantityTypeIdentifierStepCount';
const ACTIVE_ENERGY: QuantityTypeIdentifier = 'HKQuantityTypeIdentifierActiveEnergyBurned';
const DISTANCE: QuantityTypeIdentifier = 'HKQuantityTypeIdentifierDistanceWalkingRunning';
const EXERCISE_TIME: QuantityTypeIdentifier = 'HKQuantityTypeIdentifierAppleExerciseTime';

const READ_PERMISSIONS = [STEP_COUNT, ACTIVE_ENERGY, DISTANCE, EXERCISE_TIME] as const;

const METERS_PER_MILE = 1609.344;

export async function getHealthKitAvailability(): Promise<boolean> {
  try {
    const { isHealthDataAvailable } = await getHK();
    return await isHealthDataAvailable();
  } catch {
    return false;
  }
}

export async function requestHealthKitPermissions(): Promise<HealthKitStatus> {
  try {
    const { isHealthDataAvailable, requestAuthorization } = await getHK();
    const available = await isHealthDataAvailable();
    if (!available) return 'unavailable';

    const authorized = await requestAuthorization({
      toRead: READ_PERMISSIONS,
    });

    return authorized ? 'authorized' : 'denied';
  } catch {
    return 'denied';
  }
}

export async function enableStepBackgroundDelivery(): Promise<void> {
  try {
    const { enableBackgroundDelivery } = await getHK();
    // UpdateFrequency.daily = 3
    await enableBackgroundDelivery(STEP_COUNT, 3);
  } catch {
    // Background delivery is optional — don't block connect flow
  }
}

export async function disableHealthKitBackground(): Promise<void> {
  try {
    const { disableAllBackgroundDelivery } = await getHK();
    await disableAllBackgroundDelivery();
  } catch {
    // Ignore — disconnect should still proceed
  }
}

function dayStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayEnd(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function queryDayStat(
  type: QuantityTypeIdentifier,
  start: Date,
  end: Date,
): Promise<number> {
  try {
    const { queryStatisticsForQuantity } = await getHK();
    const stats = await queryStatisticsForQuantity(type, ['cumulativeSum'], {
      filter: { date: { startDate: start, endDate: end } },
    });
    return stats?.sumQuantity?.quantity ?? 0;
  } catch {
    return 0;
  }
}

export async function queryDailyTotals(
  startDate: Date,
  endDate: Date,
): Promise<HealthKitDailyData[]> {
  const results: HealthKitDailyData[] = [];
  const current = dayStart(startDate);
  const last = dayStart(endDate);

  while (current <= last) {
    const start = dayStart(current);
    const end = dayEnd(current);

    const [steps, calories, distanceMeters, activeMinutes] = await Promise.all([
      queryDayStat(STEP_COUNT, start, end),
      queryDayStat(ACTIVE_ENERGY, start, end),
      queryDayStat(DISTANCE, start, end),
      queryDayStat(EXERCISE_TIME, start, end),
    ]);

    results.push({
      date: formatDate(current),
      steps: Math.round(steps),
      calories: Math.round(calories),
      distanceMiles: Math.round((distanceMeters / METERS_PER_MILE) * 100) / 100,
      activeMinutes: Math.round(activeMinutes),
    });

    current.setDate(current.getDate() + 1);
  }

  return results;
}
