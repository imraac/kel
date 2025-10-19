/**
 * Break-Even Analysis Utilities
 * Provides expense categorization and financial calculations for break-even analysis
 */

export type CostType = 'variable' | 'fixed';

/**
 * Maps expense categories to cost types (variable or fixed)
 * 
 * Variable Costs: Costs that vary directly with production volume
 * - feed: Directly proportional to number of birds and production
 * - medication: Varies with flock health and size
 * 
 * Fixed Costs: Costs that remain relatively constant regardless of production
 * - labor: Salaries and wages are typically fixed monthly costs
 * - utilities: Electricity, water generally remain constant
 * - equipment: Depreciation and maintenance are fixed periodic costs
 * - other: Default to fixed for miscellaneous expenses
 */
export const EXPENSE_CATEGORY_TO_COST_TYPE: Record<string, CostType> = {
  feed: 'variable',
  medication: 'variable',
  labor: 'fixed',
  utilities: 'fixed',
  equipment: 'fixed',
  other: 'fixed',
};

/**
 * Determines whether an expense category is a variable or fixed cost
 */
export function getCostType(category: string): CostType {
  return EXPENSE_CATEGORY_TO_COST_TYPE[category] || 'fixed';
}

/**
 * Filters expenses by cost type
 */
export function filterExpensesByType(
  expenses: Array<{ category: string; amount: string | number }>,
  costType: CostType
): Array<{ category: string; amount: string | number }> {
  return expenses.filter(expense => getCostType(expense.category) === costType);
}

/**
 * Calculates total amount for a list of expenses
 */
export function calculateTotalAmount(
  expenses: Array<{ amount: string | number }>
): number {
  return expenses.reduce((total, expense) => {
    const amount = typeof expense.amount === 'string' 
      ? parseFloat(expense.amount) 
      : expense.amount;
    return total + (isNaN(amount) ? 0 : amount);
  }, 0);
}

/**
 * Splits expenses into variable and fixed costs with totals
 */
export function splitExpensesByType(
  expenses: Array<{ category: string; amount: string | number }>
): { variable: number; fixed: number; total: number } {
  const variableExpenses = filterExpensesByType(expenses, 'variable');
  const fixedExpenses = filterExpensesByType(expenses, 'fixed');
  
  const variable = calculateTotalAmount(variableExpenses);
  const fixed = calculateTotalAmount(fixedExpenses);
  
  return {
    variable,
    fixed,
    total: variable + fixed,
  };
}

/**
 * Monthly aggregation interface for revenue and expenses
 */
export interface MonthlyData {
  month: string; // Format: YYYY-MM
  revenue: number;
  variableCosts: number;
  fixedCosts: number;
  totalCosts: number;
  profit: number;
  unitsSold: number;
}

/**
 * Aggregates financial data by month
 */
export function aggregateByMonth(
  sales: Array<{ saleDate: string; totalAmount: string | number; cratesSold: number }>,
  expenses: Array<{ expenseDate: string; category: string; amount: string | number }>
): MonthlyData[] {
  const monthlyMap = new Map<string, MonthlyData>();

  // Process sales
  sales.forEach(sale => {
    const month = sale.saleDate.substring(0, 7); // Extract YYYY-MM
    const amount = typeof sale.totalAmount === 'string' 
      ? parseFloat(sale.totalAmount) 
      : sale.totalAmount;
    
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, {
        month,
        revenue: 0,
        variableCosts: 0,
        fixedCosts: 0,
        totalCosts: 0,
        profit: 0,
        unitsSold: 0,
      });
    }
    
    const data = monthlyMap.get(month)!;
    data.revenue += isNaN(amount) ? 0 : amount;
    data.unitsSold += sale.cratesSold;
  });

  // Process expenses
  expenses.forEach(expense => {
    const month = expense.expenseDate.substring(0, 7); // Extract YYYY-MM
    const amount = typeof expense.amount === 'string' 
      ? parseFloat(expense.amount) 
      : expense.amount;
    
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, {
        month,
        revenue: 0,
        variableCosts: 0,
        fixedCosts: 0,
        totalCosts: 0,
        profit: 0,
        unitsSold: 0,
      });
    }
    
    const data = monthlyMap.get(month)!;
    const costType = getCostType(expense.category);
    
    if (costType === 'variable') {
      data.variableCosts += isNaN(amount) ? 0 : amount;
    } else {
      data.fixedCosts += isNaN(amount) ? 0 : amount;
    }
  });

  // Calculate totals and profit for each month
  monthlyMap.forEach(data => {
    data.totalCosts = data.variableCosts + data.fixedCosts;
    data.profit = data.revenue - data.totalCosts;
  });

  // Convert to array and sort by month
  return Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Break-even calculation results
 */
export interface BreakEvenResults {
  contributionMargin: number;
  contributionMarginRatio: number;
  breakEvenUnits: number;
  breakEvenRevenue: number;
  breakEvenMonth: number | null; // Month index (0-based) when break-even is reached, null if not reachable
  breakEvenDate: string | null; // Actual date when break-even is reached
  paybackPeriod: number | null; // Number of months to recover initial investment
  cumulativeProfits: number[]; // Cumulative profit for each month
  monthlyProjections: Array<{
    month: number;
    units: number;
    revenue: number;
    variableCosts: number;
    fixedCosts: number;
    totalCosts: number;
    profit: number;
    cumulativeProfit: number;
  }>;
}

/**
 * Calculates break-even analysis based on assumptions and historical data
 */
export function calculateBreakEven(params: {
  price: number;
  unitVariableCost: number;
  fixedCostsPerMonth: number;
  initialUnits: number;
  growthRate: number;
  projectionMonths?: number;
  seasonalityFactors?: number[];
}): BreakEvenResults {
  const {
    price,
    unitVariableCost,
    fixedCostsPerMonth,
    initialUnits,
    growthRate,
    projectionMonths = 12,
    seasonalityFactors = [],
  } = params;

  // Calculate contribution margin
  const contributionMargin = price - unitVariableCost;
  const contributionMarginRatio = contributionMargin / price;

  // Calculate break-even units per month
  const breakEvenUnits = fixedCostsPerMonth / contributionMargin;
  const breakEvenRevenue = breakEvenUnits * price;

  // Generate monthly projections
  const monthlyProjections = [];
  let cumulativeProfit = 0;
  let breakEvenMonth: number | null = null;
  let breakEvenDate: string | null = null;

  for (let month = 0; month < projectionMonths; month++) {
    // Calculate units for this month with growth rate
    let units = initialUnits * Math.pow(1 + growthRate, month);
    
    // Apply seasonality factor if provided
    if (seasonalityFactors.length > 0) {
      const seasonalityIndex = month % seasonalityFactors.length;
      units *= seasonalityFactors[seasonalityIndex];
    }

    // Calculate financial metrics
    const revenue = units * price;
    const variableCosts = units * unitVariableCost;
    const totalCosts = variableCosts + fixedCostsPerMonth;
    const profit = revenue - totalCosts;
    cumulativeProfit += profit;

    monthlyProjections.push({
      month: month + 1,
      units: Math.round(units * 100) / 100,
      revenue: Math.round(revenue * 100) / 100,
      variableCosts: Math.round(variableCosts * 100) / 100,
      fixedCosts: fixedCostsPerMonth,
      totalCosts: Math.round(totalCosts * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      cumulativeProfit: Math.round(cumulativeProfit * 100) / 100,
    });

    // Check if break-even is reached
    if (breakEvenMonth === null && cumulativeProfit >= 0) {
      breakEvenMonth = month;
      
      // Calculate approximate date using interpolation
      const currentMonth = monthlyProjections[month];
      if (month > 0) {
        const previousMonth = monthlyProjections[month - 1];
        const profitGap = currentMonth.cumulativeProfit - previousMonth.cumulativeProfit;
        const daysIntoMonth = profitGap > 0 
          ? Math.round((0 - previousMonth.cumulativeProfit) / profitGap * 30)
          : 0;
        
        const today = new Date();
        const breakEvenDateObj = new Date(today.getFullYear(), today.getMonth() + month, daysIntoMonth);
        breakEvenDate = breakEvenDateObj.toISOString().split('T')[0];
      } else {
        const today = new Date();
        const breakEvenDateObj = new Date(today.getFullYear(), today.getMonth(), 1);
        breakEvenDate = breakEvenDateObj.toISOString().split('T')[0];
      }
    }
  }

  // Calculate payback period (same as break-even month for now)
  const paybackPeriod = breakEvenMonth !== null ? breakEvenMonth + 1 : null;

  return {
    contributionMargin: Math.round(contributionMargin * 100) / 100,
    contributionMarginRatio: Math.round(contributionMarginRatio * 10000) / 100, // As percentage
    breakEvenUnits: Math.round(breakEvenUnits * 100) / 100,
    breakEvenRevenue: Math.round(breakEvenRevenue * 100) / 100,
    breakEvenMonth: breakEvenMonth !== null ? breakEvenMonth + 1 : null,
    breakEvenDate,
    paybackPeriod,
    cumulativeProfits: monthlyProjections.map(m => m.cumulativeProfit),
    monthlyProjections,
  };
}
