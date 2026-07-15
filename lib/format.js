export function formatTRY(n) {
  const sign = n < 0 ? "-" : "";
  return sign + Math.abs(n).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";
}

export function formatUSD(n) {
  const sign = n < 0 ? "-" : "";
  return "(" + sign + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " $)";
}

export function formatDateTR(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}
