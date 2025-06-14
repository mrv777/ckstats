import {
  formatNumber,
  formatHashrate,
  convertHashrate,
  formatTimeAgo,
  formatDuration,
  calculatePercentageChange,
  getPercentageChangeColor,
  calculateAverageTimeToBlock,
  calculateBlockChances
} from '../../utils/helpers';

describe('Helper Functions', () => {
  describe('formatNumber', () => {
    it('formats numbers correctly', () => {
      expect(formatNumber(1000)).toBe('1.00 k');
      expect(formatNumber(1000000)).toBe('1.00 M');
      expect(formatNumber(1000000000)).toBe('1.00 G');
      expect(formatNumber(1000000000000)).toBe('1.00 T');
      expect(formatNumber(1000000000000000)).toBe('1.00 P');
      expect(formatNumber(1000000000000000000)).toBe('1.00 E');
      expect(formatNumber(1000000000000000000000)).toBe('1.00 Z');
      expect(formatNumber(999)).toBe('999');
    });
  });

  describe('formatHashrate', () => {
    it('formats hashrates correctly', () => {
      expect(formatHashrate('1000')).toBe('1 KH/s');
      expect(formatHashrate('1000000')).toBe('1 MH/s');
      expect(formatHashrate('1000000000')).toBe('1 GH/s');
      expect(formatHashrate('1000000000000')).toBe('1 TH/s');
      expect(formatHashrate('1000000000000000')).toBe('1 PH/s');
      expect(formatHashrate('999')).toBe('999 H/s');
      expect(formatHashrate('1010000000000')).toBe('1.01 TH/s');
      expect(formatHashrate('1100000000000')).toBe('1.1 TH/s');
    });
  });

  describe('convertHashrate', () => {
    it('converts hashrates correctly', () => {
      expect(convertHashrate('1K')).toBe(BigInt(1000));
      expect(convertHashrate('1M')).toBe(BigInt(1000000));
      expect(convertHashrate('1G')).toBe(BigInt(1000000000));
      expect(convertHashrate('1T')).toBe(BigInt(1000000000000));
      expect(convertHashrate('1P')).toBe(BigInt(1000000000000000));
      expect(convertHashrate('1')).toBe(BigInt(1));
    });
  });

  describe('formatTimeAgo', () => {
    it('formats time ago correctly', () => {
      const now = new Date();
      expect(formatTimeAgo(now, 2)).toBe('Recently');
      expect(formatTimeAgo(new Date(now.getTime() - 1 * 60000))).toBe('1 min ago');
      expect(formatTimeAgo(new Date(now.getTime() - 5 * 60000))).toBe('5 mins ago');
      expect(formatTimeAgo(new Date(now.getTime() - 65 * 60000))).toBe('1 hour 5 mins ago');
      expect(formatTimeAgo(new Date(now.getTime() - 25 * 60 * 60000))).toBe('1 day 1 hour 0 min ago');
    });
  });

  describe('formatDuration', () => {
    it('formats duration correctly', () => {
      expect(formatDuration(60)).toBe('1m');
      expect(formatDuration(3600)).toBe('1h');
      expect(formatDuration(86400)).toBe('1d');
      expect(formatDuration(31536000)).toBe('1y');
      expect(formatDuration(31622400)).toBe('1y 1d');
      expect(formatDuration(9000000000000)).toBe('~∞');
    });
  });

  describe('calculatePercentageChange', () => {
    it('calculates percentage change correctly', () => {
      expect(calculatePercentageChange(110, 100)).toBe(10);
      expect(calculatePercentageChange(90, 100)).toBe(-10);
      expect(calculatePercentageChange(100, 100)).toBe(0);
      expect(calculatePercentageChange(100, 0)).toBe('N/A');
    });
  });

  describe('getPercentageChangeColor', () => {
    it('returns correct color for percentage change', () => {
      expect(getPercentageChangeColor(10)).toBe('text-success');
      expect(getPercentageChangeColor(-10)).toBe('text-error');
      expect(getPercentageChangeColor(0)).toBe('text-base-content');
      expect(getPercentageChangeColor('N/A')).toBe('text-base-content');
    });
  });

  describe('calculateAverageTimeToBlock', () => {
    it('calculates average time to block correctly', () => {
      expect(calculateAverageTimeToBlock(BigInt(1000000000000), 1, 'T')).toBeCloseTo(4294967296);
      expect(calculateAverageTimeToBlock(BigInt(2000000000000), 1, 'T')).toBeCloseTo(2147483648);
    });
  });

  describe('calculateBlockChances', () => {
    it('calculates block chances correctly', () => {
      const chances = calculateBlockChances(BigInt(1000000000000), 1, BigInt(100000000000000));
      expect(chances['1h']).toBe('<0.001%');
      expect(chances['1d']).toMatch(/\d+\.\d+%|<0\.001%/);
      expect(chances['1w']).toMatch(/\d+\.\d+%|<0\.001%/);
      expect(chances['1m']).toMatch(/\d+\.\d+%|<0\.001%/);
      expect(chances['1y']).toMatch(/\d+\.\d+%|<0\.001%/);
    });
  });
});