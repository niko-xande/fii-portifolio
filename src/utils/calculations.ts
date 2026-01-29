import type { Income, Position } from "@/types";

export const calcInvestedValue = (positions: Position[]) => {
  return positions.reduce((sum, pos) => {
    const costs = Number(pos.costs ?? 0);
    return sum + Number(pos.quantity) * Number(pos.avg_price) + costs;
  }, 0);
};

export const calcMonthlyIncomeTotal = (incomes: Income[], month: string) => {
  return incomes
    .filter((income) => income.month === month)
    .reduce((sum, income) => sum + Number(income.amount ?? 0), 0);
};

export const calcAvgIncome = (incomes: Income[], months: number) => {
  const grouped = groupIncomesByMonth(incomes);
  const ordered = Object.keys(grouped).sort();
  if (!ordered.length) return 0;
  const slice = ordered.slice(-months);
  const total = slice.reduce((sum, month) => sum + grouped[month], 0);
  return total / slice.length;
};

export const groupIncomesByMonth = (incomes: Income[]) => {
  return incomes.reduce<Record<string, number>>((acc, income) => {
    const key = income.month;
    acc[key] = (acc[key] || 0) + Number(income.amount ?? 0);
    return acc;
  }, {});
};

export const groupIncomeByAsset = (incomes: Income[]) => {
  return incomes.reduce<Record<string, number>>((acc, income) => {
    const key = income.asset_id;
    acc[key] = (acc[key] || 0) + Number(income.amount ?? 0);
    return acc;
  }, {});
};

export const calcConcentrationByAsset = (positions: Position[]) => {
  const total = calcInvestedValue(positions);
  if (!total) return {} as Record<string, number>;
  return positions.reduce<Record<string, number>>((acc, pos) => {
    const invested = Number(pos.quantity) * Number(pos.avg_price) + Number(pos.costs ?? 0);
    acc[pos.asset_id] = invested / total;
    return acc;
  }, {});
};

export const calcIncomeDrop = (incomes: Income[], months: number) => {
  const grouped = groupIncomesByMonth(incomes);
  const ordered = Object.keys(grouped).sort();
  if (ordered.length < months + 1) return 0;
  const last = grouped[ordered[ordered.length - 1]];
  const avgPrev = ordered
    .slice(-(months + 1), -1)
    .reduce((sum, month) => sum + grouped[month], 0) / months;
  if (!avgPrev) return 0;
  return (avgPrev - last) / avgPrev;
};
