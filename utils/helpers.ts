/**
 * Represents an International System of Units (SI) prefix.
 * @interface ISOUnit
 * @property {number} threshold - The numeric value at which this unit is used (e.g., 1e12 for Tera)
 * @property {string} iso - The ISO/SI prefix symbol (e.g., 'T' for Tera, 'G' for Giga)
 */
export interface ISOUnit {
  threshold: number;
  iso: string;
}

// An array of all ISO units we support.
// Make sure you check for 0 if you use this.
const isoUnits: ISOUnit[] = [
  { threshold: 1e21, iso: 'Z' },
  { threshold: 1e18, iso: 'E' },
  { threshold: 1e15, iso: 'P' },
  { threshold: 1e12, iso: 'T' },
  { threshold: 1e9, iso: 'G' },
  { threshold: 1e6, iso: 'M' },
  { threshold: 1e3, iso: 'k' },
] as const;


/**
 * Formats a number with appropriate ISO unit prefix (Z, E, P, T, G, M, k).
 * @param {number | bigint | string} num - The number to format
 * @returns {string} The formatted number with unit prefix (e.g., "1.23 T") or locale string for small numbers
 */
export function formatNumber(num: number | bigint | string): string {
  const absNum = Math.abs(Number(num));

  for (const unit of isoUnits) {
    if (absNum >= unit.threshold) {
      return (Number(num) / unit.threshold).toFixed(2) + ' ' + unit.iso;
    }
  }

  return num.toLocaleString();
}

/**
 * Formats a hashrate value with appropriate ISO unit prefix and H/s suffix.
 * @param {string | bigint | number} num - The hashrate in H/s to format
 * @returns {string} The formatted hashrate with unit suffix (e.g., "1.23 TH/s")
 */
export function formatHashrate(num: string | bigint | number): string {
  const numberValue = Number(num);
  const absNum = Math.abs(numberValue);
  
  for (const unit of isoUnits) {
    if (absNum >= unit.threshold) {
      return (numberValue / unit.threshold).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' '+unit.iso+'H/s';
    }
  }

  return numberValue.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' H/s';
}

/**
 * Converts a hashrate string with ISO unit prefix to a bigint value in H/s.
 * Supports scientific notation (e.g., "1.5e2T" for 150 Tera).
 * @param {string} value - The hashrate string (e.g., "1.23T" or "1.5e2G")
 * @returns {bigint} The hashrate in H/s as a bigint
 */
export function convertHashrate(value: string): bigint {
  // Updated regex to handle scientific notation
  const match = value.match(/^(\d+(\.\d+)?(?:e[+-]\d+)?)([ZEPTGMK])$/i);
  if (match) {
    const [, num, , unit] = match;
    // Parse the number, which now handles scientific notation
    const parsedNum = parseFloat(num);
    const isoUnit = isoUnits.find((u) => u.iso.toUpperCase() === unit.toUpperCase()) || { threshold: 1, iso: '' };
    return BigInt(Math.round(parsedNum * isoUnit.threshold));
  }
  return BigInt(value);
};

/**
 * Finds the most appropriate ISO unit for a given number.
 * @param {number} num - The number to find the unit for
 * @returns {ISOUnit} The ISO unit with the highest threshold that the number meets
 */
export function findISOUnit(num: number): ISOUnit {
  const absNum = Math.abs(num);

  for (const unit of isoUnits) {
    if (absNum >= unit.threshold) {
      return(unit);
    }
  }

  return {threshold: 1, iso: ''};
}

/**
 * Formats a date/timestamp as a human-readable "time ago" string.
 * @param {Date | number | string} date - The date to format
 * @param {number} [minDiff=1] - The minimum difference in minutes before returning a relative time (defaults to 1)
 * @returns {string} The formatted time (e.g., "5 mins ago", "2 hours 30 mins ago", or "Recently")
 */
export function formatTimeAgo(date: Date | number | string, minDiff: number = 1): string {
  const now = new Date();
  const lastUpdate = new Date(date);
  const diffMs = now.getTime() - lastUpdate.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  
  if (diffMinutes < minDiff) {
    return "Recently";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} min${diffMinutes > 1 ? 's' : ''} ago`;
  } else if (diffMinutes < 1440) { // Less than 24 hours
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} min${minutes > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffMinutes / 1440);
    const hours = Math.floor((diffMinutes % 1440) / 60);
    const minutes = diffMinutes % 60;
    return `${days} day${days > 1 ? 's' : ''} ${hours} hour${hours > 1 ? 's' : ''} ${minutes} min${minutes > 1 ? 's' : ''} ago`;
  }
}

/**
 * Formats a duration in seconds as a human-readable string.
 * Shows years, days, hours, and minutes as applicable.
 * @param {number} seconds - The duration in seconds
 * @returns {string} The formatted duration (e.g., "2d 3h 45m", "~∞" for very large values)
 */
export function formatDuration(seconds: number): string {
  if (seconds > 8000000000000) {
    return '~∞';
  }

  const years = Math.floor(seconds / 31536000); // 365 days in a year
  const days = Math.floor((seconds % 31536000) / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (years > 0) parts.push(`${years}y`);
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 && years === 0) parts.push(`${minutes}m`);

  return parts.length > 0 ? parts.join(' ') : '0m';
}

/**
 * Calculates the percentage change between two values.
 * @param {number} currentValue - The current value
 * @param {number} pastValue - The past/previous value for comparison
 * @returns {number | 'N/A'} The percentage change, or 'N/A' if pastValue is zero (to avoid division by zero)
 */
export function calculatePercentageChange(currentValue: number, pastValue: number): number | 'N/A' {
  if (pastValue === 0) return 'N/A';

  const percentageChange = ((currentValue - pastValue) / pastValue) * 100;
  return Number(percentageChange.toFixed(2));
}

/**
 * Returns a Tailwind CSS color class for displaying a percentage change.
 * @param {number | 'N/A'} change - The percentage change value
 * @returns {string} Tailwind color class: 'text-success' for positive, 'text-error' for negative, or 'text-base-content' for N/A or zero
 */
export function getPercentageChangeColor(change: number | 'N/A'): string {
  if (change === 'N/A') return 'text-base-content';
  return change > 0 ? 'text-success' : change < 0 ? 'text-error' : 'text-base-content';
}

/**
 * Calculates the average time to find a block given hashrate and difficulty.
 * Returns 0 if hashrate or difficulty is zero to avoid division by zero.
 * @param {bigint | number | string} hashRate - The hashrate in H/s
 * @param {number | bigint} difficulty - The difficulty value
 * @param {string} [units] - Optional ISO unit prefix for the difficulty (e.g., 'T' for terahash). If not provided, difficulty is assumed to be already in base units.
 * @returns {number} The average time to block in seconds
 */
export function calculateAverageTimeToBlock(hashRate: bigint | number | string, difficulty: number | bigint, units?: string): number {
  const hashesPerDifficulty = BigInt(2 ** 32);
  const hashRateBigInt =
    typeof hashRate === 'bigint'
      ? hashRate
      : BigInt(Math.round(Number(hashRate)));

  if (hashRateBigInt === BigInt(0)) {
    return 0;
  }

  let convertedDifficulty: bigint;
  if (typeof difficulty === 'number') {
    const isoUnit = isoUnits.find((u) => u.iso.toUpperCase() === units?.toUpperCase()) || { threshold: 1, iso: '' };
    convertedDifficulty = BigInt(Math.round(difficulty * isoUnit.threshold));
  } else {
    convertedDifficulty = difficulty;
  }

  if (convertedDifficulty === BigInt(0)) {
    return 0;
  }

  return Number((convertedDifficulty * BigInt(hashesPerDifficulty)) / hashRateBigInt);
}

/**
 * Calculates the probability of finding a block within various time periods.
 * Returns early with minimal probabilities if inputs are zero.
 * @param {bigint} hashRate - The hashrate in H/s
 * @param {number} difficulty - The difficulty as a percentage of network difficulty
 * @param {bigint} accepted - The number of accepted shares
 * @returns {object} An object with keys '1h', '1d', '1w', '1m', '1y' mapping to probability strings (e.g., "0.123%", "<0.001%")
 */
export function calculateBlockChances(hashRate: bigint, difficulty: number, accepted: bigint): { [key: string]: string} {
  const difficultyFactor = Math.round(Number(difficulty) * 100);
  const acceptedBigInt = typeof accepted === 'bigint' ? accepted : BigInt(accepted);
  
  if (!Number.isFinite(difficultyFactor) || difficultyFactor <= 0 || acceptedBigInt <= 0n) {
    return {
      '1h': '<0.001%',
      '1d': '<0.001%',
      '1w': '<0.001%',
      '1m': '<0.001%',
      '1y': '<0.001%',
    };
  }

  const networkDiff = (acceptedBigInt * BigInt(10000)) / BigInt(difficultyFactor);
  const hashesPerDifficulty = BigInt(2 ** 32);
  if (networkDiff === BigInt(0)) {
    return {
      '1h': '<0.001%',
      '1d': '<0.001%',
      '1w': '<0.001%',
      '1m': '<0.001%',
      '1y': '<0.001%',
    };
  }
  const probabilityPerHash = 1 / Number(networkDiff * hashesPerDifficulty);
  const hashesPerSecond = Number(hashRate);

  const periodsInSeconds = {
    '1h': 3600,
    '1d': 86400,
    '1w': 604800,
    '1m': 2592000,  // 30 days
    '1y': 31536000  // 365 days
  };

  return Object.entries(periodsInSeconds).reduce((chances, [period, seconds]) => {
    const lambda = hashesPerSecond * seconds * probabilityPerHash;
    const probability = 1 - Math.exp(-lambda);
    if (probability * 100 > 0.001) {
      chances[period] = `${(probability * 100).toFixed(3)}%`;
    } else {
      chances[period] = `<0.001%`;
    }
    return chances;
  }, {} as { [key: string]: string });
}

/**
 * Serializes data to JSON, converting all bigint values to strings.
 * Useful for preparing TypeORM entity data for JSON serialization (e.g., for API responses).
 * @param {any} data - The data object containing bigint values
 * @returns {any} The serialized data with bigints converted to strings
 */
export function serializeData(data: any) {
  return JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

