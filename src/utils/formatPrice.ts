export function formatPrice(amount: number, currency = "NGN"): string {
  if (currency === "NGN") {
    return `₦${amount.toLocaleString("en-NG")}`;
  }
  return `${currency} ${amount.toLocaleString()}`;
}
