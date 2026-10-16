export const RESTAURANT = {
  name: "L&N Kitchen",
  address: "Plot 55 Audu Bako way, off state road, Nasarawa, Kano state",
  logoPath: "/images/ChatGPT_Image_Jun_15__2026__08_20_55_PM-removebg-preview.png",
  receiptThanks: "Thank you for dining with us. We hope to see you again soon!",
} as const;

export function formatOrderNumber(value: number | null | undefined): string {
  if (!value || value < 1) return "—";
  return String(value).padStart(7, "0");
}
