export function formatNumber(num: number | bigint): string {
  const absNum = Math.abs(Number(num));
  
  if (absNum >= 1e21) {
    return (Number(num) / 1e21).toFixed(2) + ' S';
  } else if (absNum >= 1e18) {
    return (Number(num) / 1e18).toFixed(2) + ' Qi';
  } else if (absNum >= 1e15) {
    return (Number(num) / 1e15).toFixed(2) + ' Q';
  } else if (absNum >= 1e12) {
    return (Number(num) / 1e12).toFixed(2) + ' T';
  } else if (absNum >= 1e9) {
    return (Number(num) / 1e9).toFixed(2) + ' B';
  } else if (absNum >= 1e6) {
    return (Number(num) / 1e6).toFixed(2) + ' M';
  } else if (absNum >= 1e3) {
    return (Number(num) / 1e3).toFixed(2) + ' K';
  } else {
    return num.toLocaleString();
  }
}

export function formatHashrate(num: string | bigint | number): string {
  const numberValue = Number(num);
  const absNum = Math.abs(numberValue);
  
  const units: { threshold: number; suffix: string }[] = [
    { threshold: 1e15, suffix: ' PH/s' },
    { threshold: 1e12, suffix: ' TH/s' },
    { threshold: 1e9, suffix: ' GH/s' },
    { threshold: 1e6, suffix: ' MH/s' },
    { threshold: 1e3, suffix: ' KH/s' }
  ];

  for (const unit of units) {
    if (absNum >= unit.threshold) {
      return (numberValue / unit.threshold).toLocaleString(undefined, { maximumFractionDigits: 2 }) + unit.suffix;
    }
  }

  return numberValue.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' H/s';
}

export function convertHashrate(value: string): bigint {
  const units = { P: 1e15, T: 1e12, G: 1e9, M: 1e6, K: 1e3 };
  // Updated regex to handle scientific notation
  const match = value.match(/^(\d+(\.\d+)?(?:e[+-]\d+)?)([PTGMK])$/i);
  if (match) {
    const [, num, , unit] = match;
    // Parse the number, which now handles scientific notation
    const parsedNum = parseFloat(num);
    return BigInt(Math.round(parsedNum * units[unit.toUpperCase()]));
  }
  return BigInt(value);
};

export function formatTimeAgo(date: Date | number | string): string {
  const now = new Date();
  const lastUpdate = new Date(date);
  const diffMs = now.getTime() - lastUpdate.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  
  if (diffMinutes < 1) {
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

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(' ');
}

export function calculatePercentageChange(currentValue: number, pastValue: number): number | 'N/A' {
  if (pastValue === 0) return 'N/A';

  const percentageChange = ((currentValue - pastValue) / pastValue) * 100;
  return Number(percentageChange.toFixed(2));
}

export function getPercentageChangeColor(change: number | 'N/A'): string {
  if (change === 'N/A') return 'text-base-content';
  return change > 0 ? 'text-success' : 'text-error';
}
