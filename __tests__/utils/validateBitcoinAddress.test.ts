import { validateBitcoinAddress } from '../../utils/validateBitcoinAddress';

describe('validateBitcoinAddress', () => {
  test('validates legacy address', () => {
    expect(validateBitcoinAddress('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2')).toBe(true);
  });

  test('validates P2SH address', () => {
    expect(validateBitcoinAddress('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy')).toBe(true);
  });

  test('validates bech32 address (bc1q)', () => {
    expect(validateBitcoinAddress('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq')).toBe(true);
  });

  test('validates bech32m address (bc1p)', () => {
    expect(validateBitcoinAddress('bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0')).toBe(true);
  });

  test('validates bech32 testnet4 address (tb1q)', () => {
    expect(validateBitcoinAddress('tb1qn9quw86c6gv3642enrxaglvrqxt032kej9ydjh')).toBe(true);
  });

  test('rejects invalid address', () => {
    expect(validateBitcoinAddress('invalid_address')).toBe(false);
  });

  // Additional tests
  test('rejects empty string', () => {
    expect(validateBitcoinAddress('')).toBe(false);
  });

  test('rejects null', () => {
    expect(validateBitcoinAddress(null as any)).toBe(false);
  });

  test('rejects undefined', () => {
    expect(validateBitcoinAddress(undefined as any)).toBe(false);
  });

  test('rejects address with invalid characters', () => {
    expect(validateBitcoinAddress('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2!')).toBe(false);
  });

  test('rejects address with incorrect length', () => {
    expect(validateBitcoinAddress('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN')).toBe(false);
  });

  test('rejects address with incorrect prefix', () => {
    expect(validateBitcoinAddress('4BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2')).toBe(false);
  });

  test('rejects bech32 address with incorrect hrp', () => {
    expect(validateBitcoinAddress('bb1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq')).toBe(false);
  });

  test('rejects address with mixed case', () => {
    expect(validateBitcoinAddress('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2a')).toBe(false);
  });

  test('rejects address with spaces', () => {
    expect(validateBitcoinAddress(' 1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2 ')).toBe(false);
  });

  test('rejects valid Ethereum address', () => {
    expect(validateBitcoinAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(false);
  });

  test('rejects address with Unicode characters', () => {
    expect(validateBitcoinAddress('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2🚀')).toBe(false);
  });

  test('rejects valid format with corrupted checksum', () => {
    expect(validateBitcoinAddress('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN3')).toBe(false);
  });

  test('rejects bech32 address with mixed case', () => {
    expect(validateBitcoinAddress('BC1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq')).toBe(false);
  });

  test('rejects malformed bech32 - invalid separator placement', () => {
    expect(validateBitcoinAddress('bc1qar0srrr7xf1kvy5l643lydnw9re59gtzzwf5mdq')).toBe(false);
  });

  test('rejects malformed bech32 - missing separator', () => {
    expect(validateBitcoinAddress('bcqar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq')).toBe(false);
  });

  test('rejects malformed bech32 - wrong padding', () => {
    expect(validateBitcoinAddress('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5md')).toBe(false);
  });

  test('validates taproot testnet address (tb1p)', () => {
    expect(validateBitcoinAddress('tb1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqp3mvzv')).toBe(true);
  });

  test('rejects taproot address with invalid length', () => {
    expect(validateBitcoinAddress('bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vq')).toBe(false);
  });

  test('rejects taproot data with wrong witness version (bc1q)', () => {
    expect(validateBitcoinAddress('bc1q0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0')).toBe(false);
  });

  test('rejects taproot address with mixed case', () => {
    expect(validateBitcoinAddress('BC1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0')).toBe(false);
  });
  test.each([
    ['path separators', '../../etc/passwd'],
    ['symbols embedded in a valid address', 'bc1qfpwl5zfe4ep8zuc4ntn2xe4vcm0srqhpk3lwm6/'],
    ['whitespace', ' bc1qfpwl5zfe4ep8zuc4ntn2xe4vcm0srqhpk3lwm6'],
    ['percent-encoding', 'bc1qfpwl5zfe4ep8zuc4ntn2xe4vcm0srqhpk3lwm6%00'],
    ['SQL', "' OR 1=1 --"],
    ['unicode', 'bc1qfpwl5zfe4ep8zuc4ntn2xe4vcm0srqhpk3lwm\u00e9'],
  ])('rejects non-alphanumeric input: %s', (_name, input) => {
    expect(validateBitcoinAddress(input)).toBe(false);
  });
});
