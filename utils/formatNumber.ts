export function formatNumber(num: number | bigint): string {
  const absNum = Math.abs(Number(num));
  
  if (absNum >= 1e21) {
    return (Number(num) / 1e21).toFixed(2) + 'S';
  } else if (absNum >= 1e18) {
    return (Number(num) / 1e18).toFixed(2) + 'Qi';
  } else if (absNum >= 1e15) {
    return (Number(num) / 1e15).toFixed(2) + 'Q';
  } else if (absNum >= 1e12) {
    return (Number(num) / 1e12).toFixed(2) + 'T';
  } else if (absNum >= 1e9) {
    return (Number(num) / 1e9).toFixed(2) + 'B';
  } else if (absNum >= 1e6) {
    return (Number(num) / 1e6).toFixed(2) + 'M';
  } else if (absNum >= 1e3) {
    return (Number(num) / 1e3).toFixed(2) + 'K';
  } else {
    return num.toLocaleString();
  }
}