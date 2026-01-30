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

export const getRecentMonths = (count: number, baseDate = new Date()) => {
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    months.push(key);
  }
  return months;
};

export const calcStabilityScore = (values: number[]) => {
  if (!values.length) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (!mean) return 0;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);
  const cv = std / mean;
  const normalized = Math.max(0, Math.min(1, 1 - cv));
  return Math.round(normalized * 100);
};

export const calcRiskScore = ({
  vacancyFinancial,
  vacancyPhysical,
  debtRatio,
  liquidityDaily
}: {
  vacancyFinancial?: number | null;
  vacancyPhysical?: number | null;
  debtRatio?: number | null;
  liquidityDaily?: number | null;
}) => {
  const weights = {
    vacancy: 0.4,
    debt: 0.3,
    liquidity: 0.3
  };

  const vacancyAvg =
    vacancyFinancial !== null && vacancyFinancial !== undefined
      ? vacancyFinancial
      : vacancyPhysical !== null && vacancyPhysical !== undefined
      ? vacancyPhysical
      : null;
  const vacancyScore = vacancyAvg !== null ? Math.max(0, 1 - vacancyAvg) : null;

  const debtScore = debtRatio !== null && debtRatio !== undefined ? Math.max(0, 1 - debtRatio) : null;

  const liquidityScore =
    liquidityDaily !== null && liquidityDaily !== undefined
      ? Math.min(1, Math.max(0, liquidityDaily / 1_000_000))
      : null;

  const weightedParts: Array<[number, number]> = [];
  if (vacancyScore !== null) weightedParts.push([vacancyScore, weights.vacancy]);
  if (debtScore !== null) weightedParts.push([debtScore, weights.debt]);
  if (liquidityScore !== null) weightedParts.push([liquidityScore, weights.liquidity]);

  if (!weightedParts.length) return null;
  const totalWeight = weightedParts.reduce((sum, [, weight]) => sum + weight, 0);
  const score = weightedParts.reduce((sum, [value, weight]) => sum + value * weight, 0) / totalWeight;
  return Math.round(score * 100);
};

export const calcCompositeScore = ({
  renda,
  estabilidade,
  risco
}: {
  renda: number | null;
  estabilidade: number | null;
  risco: number | null;
}) => {
  const parts: Array<[number, number]> = [];
  if (renda !== null) parts.push([renda, 0.4]);
  if (estabilidade !== null) parts.push([estabilidade, 0.3]);
  if (risco !== null) parts.push([risco, 0.3]);
  if (!parts.length) return null;
  const totalWeight = parts.reduce((sum, [, weight]) => sum + weight, 0);
  const score = parts.reduce((sum, [value, weight]) => sum + value * weight, 0) / totalWeight;
  return Math.round(score);
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
