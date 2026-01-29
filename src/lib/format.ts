export const formatCurrency = (value: number | null | undefined) => {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(number);
};

export const formatPercent = (value: number | null | undefined) => {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
};

export const formatMonth = (month: string) => {
  if (!month) return "";
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(date);
};
