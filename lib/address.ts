const CLASSIC_ADDRESS_REGEX = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;

export function isLikelyClassicAddress(address: string): boolean {
  return CLASSIC_ADDRESS_REGEX.test(address.trim());
}

