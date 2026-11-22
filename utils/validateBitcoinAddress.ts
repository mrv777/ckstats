import { bech32, bech32m } from 'bech32';
import bs58check from 'bs58check';

// base58check version bytes (P2PKH / P2SH).
// Mainnet: 0x00 (1...) / 0x05 (3...); Testnet / Testnet4 / Regtest / Signet share 0x6f (m/n...) / 0xc4 (2...).
const BASE58_VERSIONS: Record<number, boolean> = {
  0x00: true,
  0x05: true,
  0x6f: true,
  0xc4: true,
};

// Bech32 human-readable parts. bc = mainnet, tb = testnet (covers testnet4 as well).
const BECH32_HRP: Record<string, boolean> = { bc: true, tb: true };

/**
 * Tests if the address is a valid Bitcoin address.
 *
 * Validates legacy (base58check) and SegWit (bech32 / bech32m) addresses,
 * including taproot. Verifies checksums and network prefixes without
 * pulling in a full crypto library.
 *
 * @param {string} address - The Bitcoin address to validate.
 * @returns {boolean} True if a valid Bitcoin address.
 */
export function validateBitcoinAddress(address: string): boolean {
  if (typeof address !== 'string' || address.length === 0) return false;
  // Reject non-ASCII input (unicode, emoji, control chars) before any decode work.
  if (/[^\x21-\x7e]/.test(address)) return false;

  // Base58Check (P2PKH / P2SH): decode enforces charset + checksum, then check version.
  try {
    const payload = bs58check.decode(address);
    if (payload.length === 21 && BASE58_VERSIONS[payload[0]] === true) {
      return true;
    }
  } catch {
    // Not a valid base58check address; fall through to bech32.
  }

  // Bech32 (v0) / Bech32m (v1+). Try both variants; the witness version must
  // match the checksum variant (v0 -> bech32, v1+ -> bech32m).
  const decodedBech32 = bech32.decodeUnsafe(address);
  const decodedBech32m = bech32m.decodeUnsafe(address);
  const decoded = decodedBech32 ?? decodedBech32m;
  if (!decoded || !BECH32_HRP[decoded.prefix]) return false;

  const witnessVersion = decoded.words[0];
  if (witnessVersion < 0 || witnessVersion > 16) return false;
  const usesBech32 = decodedBech32 !== undefined;
  if (
    (witnessVersion === 0 && !usesBech32) ||
    (witnessVersion > 0 && usesBech32)
  ) {
    return false;
  }

  const program = bech32.fromWords(decoded.words.slice(1));
  if (witnessVersion === 0) {
    return program.length === 20 || program.length === 32;
  }
  if (witnessVersion === 1) {
    return program.length === 32;
  }
  return program.length >= 2 && program.length <= 40;
}
