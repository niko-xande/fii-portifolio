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

export const calcOpportunityScore = ({
  dy12m,
  pvp,
  position52
}: {
  dy12m: number;
  pvp?: number | null;
  position52?: number | null;
}) => {
  let totalWeight = 0;
  let score = 0;

  if (!Number.isNaN(dy12m)) {
    const weight = 0.4;
    const target = 0.12;
    const normalized = Math.min(Math.max(dy12m / target, 0), 1);
    score += normalized * weight;
    totalWeight += weight;
  }

  if (pvp) {
    const weight = 0.3;
    const normalized = pvp <= 1 ? 1 : Math.max(0, 1 - (pvp - 1) / 0.5);
    score += normalized * weight;
    totalWeight += weight;
  }

  if (position52 !== null && position52 !== undefined && !Number.isNaN(position52)) {
    const weight = 0.3;
    const normalized = Math.min(Math.max(1 - position52, 0), 1);
    score += normalized * weight;
    totalWeight += weight;
  }

  if (!totalWeight) return null;
  return Math.round((score / totalWeight) * 100);
};
