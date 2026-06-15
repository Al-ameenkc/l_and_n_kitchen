export function triggerHaptic(pattern: number | number[] = 12): void {
  if (typeof window === "undefined") return;
  if (!("vibrate" in navigator)) return;

  try {
    navigator.vibrate(pattern);
  } catch {
    // iOS Safari and some browsers block vibration APIs.
  }
}

export function hapticCategorySnap(): void {
  triggerHaptic(8);
}

export function hapticCardSwipe(): void {
  triggerHaptic([10, 30, 10]);
}
