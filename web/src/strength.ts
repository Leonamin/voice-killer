// Slider u in [-1, 1]: left = reduce, middle = unchanged, right = boost. Server strength: 1 .. 0 .. -4.
export const strengthOf = (u: number) => (u <= 0 ? -u : -4 * u);

// Measured on a controlled mix (wiki gain-sweep): reduce 1 -> -25 dB, boost 1 -> +5.8 dB, boost 4 -> +13.6 dB.
export function describe(u: number) {
  const k = strengthOf(u);
  if (k === 0) return "그대로";
  if (k > 0) return k >= 1 ? "최대로 줄임 (약 −25 dB)" : `줄이기 ${Math.round(k * 100)}%`;
  return `키우기 약 +${(20 * Math.log10(1 - k)).toFixed(1)} dB`;
}
