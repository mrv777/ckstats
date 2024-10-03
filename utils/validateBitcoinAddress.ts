export function validateBitcoinAddress(address: string): boolean {
  // Basic regex for Bitcoin addresses
  const regex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[ac-hj-np-z02-9]{39,59}$/;
  return regex.test(address);
}