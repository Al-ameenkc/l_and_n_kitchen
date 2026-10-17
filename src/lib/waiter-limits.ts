export const OFFER_SECONDS = 20;
export const MAX_ACTIVE_TABLES = 5;

export function serviceNote(order: {
  assignment_state?: string;
  waiter_name?: string;
  table_label?: string;
}): string {
  const table = order.table_label ? ` ${order.table_label}` : " your table";
  if (order.assignment_state === "seeking") return `Finding a waiter for${table}…`;
  if (order.assignment_state === "offered") return `Notifying the next waiter for${table}…`;
  if (order.assignment_state === "accepted") {
    return `${order.waiter_name || "Your waiter"} is on the way to${table}.`;
  }
  if (order.assignment_state === "confirmed") {
    return `${order.waiter_name || "Your waiter"} confirmed${table}.`;
  }
  return "";
}

