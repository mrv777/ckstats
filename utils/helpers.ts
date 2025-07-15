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


export function formatNumber(num: number | bigint | string): string {
  const absNum = Math.abs(Number(num));

  for (const unit of isoUnits) {
    if (absNum >= unit.threshold) {
      return (Number(num) / unit.threshold).toFixed(2) + ' ' + unit.iso;
    }
  }

  return num.toLocaleString();
}

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

export function findISOUnit(num: number): ISOUnit {
  const absNum = Math.abs(num);

  for (const unit of isoUnits) {
    if (absNum >= unit.threshold) {
      return(unit);
    }
  }

  return {threshold: 1, iso: ''};
}

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

export function calculatePercentageChange(currentValue: number, pastValue: number): number | 'N/A' {
  if (pastValue === 0) return 'N/A';

  const percentageChange = ((currentValue - pastValue) / pastValue) * 100;
  return Number(percentageChange.toFixed(2));
}

export function getPercentageChangeColor(change: number | 'N/A'): string {
  if (change === 'N/A') return 'text-base-content';
  return change > 0 ? 'text-success' : change < 0 ? 'text-error' : 'text-base-content';
}

// Difficulty is assumed to be in T, hashrate in H/s
export function calculateAverageTimeToBlock(hashRate: bigint, difficulty: number | bigint, units?: string): number {
  const hashesPerDifficulty = BigInt(2 ** 32);
  let convertedDifficulty: bigint;
  if (typeof difficulty === 'number') {
  if (units === 'T') {
      convertedDifficulty = BigInt(Math.round(difficulty * 1e12)); // Convert T
    } else {
      convertedDifficulty = BigInt(Math.round(difficulty)); // No units
    }
  } else {
    convertedDifficulty = difficulty;
  }
  return Number((BigInt(convertedDifficulty) * BigInt(hashesPerDifficulty)) / BigInt(hashRate));
}

// Difficulty is assumed to be a % of network, hashrate in H/s
export function calculateBlockChances(hashRate: bigint, difficulty: number, accepted: bigint): { [key: string]: string } {
  const networkDiff = (BigInt(accepted) / BigInt(Math.round(Number(difficulty) * 100))) * BigInt(10000);
  const hashesPerDifficulty = BigInt(2 ** 32);
  // const convertedDifficulty = BigInt(Math.round(Number(networkDiff) * 1e12));
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

export function serializeData(data: any) {
  return JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}
