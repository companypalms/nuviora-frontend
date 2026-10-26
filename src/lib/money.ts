export const fmtMoney = (
  value: number | string,
  currency: string = "USD",
  locale: string = "es-VE" // o "en-US" según tu preferencia
): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};