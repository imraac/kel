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
 * UTC-aware month key helper
 */
function getUTCMonthKey(dateStr: string): string {
  const date = dateStr.includes('T') 
    ? new Date(dateStr) 
    : new Date(`${dateStr}T00:00:00Z`);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Helper to calculate months between two YYYY-MM strings
 */
function getMonthsBetween(monthKey1: string, monthKey2: string): number {
  const [year1, month1] = monthKey1.split('-').map(Number);
  const [year2, month2] = monthKey2.split('-').map(Number);
  return (year2 - year1) * 12 + (month2 - month1);
}

/**
 * Aggregates financial data by month using UTC-aware month keys
 */
export function aggregateByMonth(
  sales: Array<{ saleDate: string; totalAmount: string | number; cratesSold: number }>,
  expenses: Array<{ expenseDate: string; category: string; amount: string | number }>
): MonthlyData[] {
  const monthlyMap = new Map<string, MonthlyData>();

  // Process sales with UTC month keys
  sales.forEach(sale => {
    const month = getUTCMonthKey(sale.saleDate);
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

  // Process expenses with UTC month keys
  expenses.forEach(expense => {
    const month = getUTCMonthKey(expense.expenseDate);
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
 * Data quality metrics for auto-calculated break-even parameters
 */
export interface DataQuality {
  hasSufficientData: boolean;
  monthsWithSales: number;
  monthsWithExpenses: number;
  totalSales: number;
  totalExpenses: number;
  warnings: string[];
}

/**
 * Auto-calculated break-even parameters from historical data
 */
export interface AutoCalculatedParams {
  price: number;
  unitVariableCost: number;
  fixedCostsPerMonth: number;
  initialUnits: number;
  growthRate: number;
  seasonalityFactors: number[];
  dataQuality: DataQuality;
}

/**
 * Auto-calculates break-even parameters from historical sales and expense data
 */
export function autoCalculateBreakEvenParams(
  sales: Array<{ saleDate: string; totalAmount: string | number; cratesSold: number; pricePerCrate: string | number }>,
  expenses: Array<{ expenseDate: string; category: string; amount: string | number }>,
  timeframeMonths: number
): AutoCalculatedParams {
  const warnings: string[] = [];
  
  // Filter data to timeframe using UTC months
  const now = new Date();
  const cutoffDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - timeframeMonths + 1, 1));
  
  const filteredSales = sales.filter(s => {
    const saleDate = s.saleDate.includes('T') ? new Date(s.saleDate) : new Date(`${s.saleDate}T00:00:00Z`);
    return saleDate >= cutoffDate;
  });
  
  const filteredExpenses = expenses.filter(e => {
    const expenseDate = e.expenseDate.includes('T') ? new Date(e.expenseDate) : new Date(`${e.expenseDate}T00:00:00Z`);
    return expenseDate >= cutoffDate;
  });

  // Aggregate by month
  const monthlyData = aggregateByMonth(filteredSales, filteredExpenses);
  
  // Sort by month
  const sortedMonths = monthlyData.sort((a, b) => a.month.localeCompare(b.month));
  
  // Calculate data quality metrics
  const monthsWithSales = sortedMonths.filter(m => m.unitsSold > 0).length;
  const monthsWithExpenses = sortedMonths.filter(m => m.totalCosts > 0).length;
  const totalSalesUnits = sortedMonths.reduce((sum, m) => sum + m.unitsSold, 0);
  const totalRevenue = sortedMonths.reduce((sum, m) => sum + m.revenue, 0);
  const totalExpenses = sortedMonths.reduce((sum, m) => sum + m.totalCosts, 0);
  
  // Minimum data requirements: ≥3 months with sales, ≥2 with expenses
  const hasSufficientData = monthsWithSales >= 3 && monthsWithExpenses >= 2 && totalSalesUnits > 0;
  
  if (monthsWithSales < 3) warnings.push("Less than 3 months of sales data");
  if (monthsWithExpenses < 2) warnings.push("Less than 2 months of expense data");
  if (totalSalesUnits === 0) warnings.push("No units sold in selected timeframe");
  
  // 1. Price: Weighted average
  let price = 0;
  if (totalSalesUnits > 0) {
    price = totalRevenue / totalSalesUnits;
  } else if (filteredSales.length > 0) {
    // Fallback to simple average of pricePerCrate
    const sum = filteredSales.reduce((s, sale) => {
      const p = typeof sale.pricePerCrate === 'string' ? parseFloat(sale.pricePerCrate) : sale.pricePerCrate;
      return s + (isNaN(p) ? 0 : p);
    }, 0);
    price = sum / filteredSales.length;
    warnings.push("Using average price (no units sold)");
  } else {
    price = 400; // Default fallback
    warnings.push("No sales data - using default price");
  }
  
  // 2. Unit Variable Cost: Variable expenses / total units
  const totalVariableCosts = sortedMonths.reduce((sum, m) => sum + m.variableCosts, 0);
  let unitVariableCost = 0;
  if (totalSalesUnits > 0) {
    unitVariableCost = totalVariableCosts / totalSalesUnits;
  } else {
    unitVariableCost = price * 0.4; // Default to 40% of price
    warnings.push("No units sold - estimating variable cost");
  }
  
  // 3. Fixed Costs Per Month: Average monthly fixed costs
  const monthsWithData = new Set<string>();
  filteredSales.forEach(s => monthsWithData.add(getUTCMonthKey(s.saleDate)));
  filteredExpenses.forEach(e => monthsWithData.add(getUTCMonthKey(e.expenseDate)));
  
  const totalFixedCosts = sortedMonths.reduce((sum, m) => sum + m.fixedCosts, 0);
  const fixedCostsPerMonth = monthsWithData.size > 0 ? totalFixedCosts / monthsWithData.size : 0;
  
  if (totalFixedCosts === 0) warnings.push("No fixed expenses recorded");
  
  // 4. Initial Units: First non-zero month
  let initialUnits = 0;
  const firstMonthWithSales = sortedMonths.find(m => m.unitsSold > 0);
  if (firstMonthWithSales) {
    initialUnits = firstMonthWithSales.unitsSold;
  } else {
    // Fallback to average units
    initialUnits = monthsWithSales > 0 ? totalSalesUnits / monthsWithSales : 100;
    warnings.push("No sales in first month - using average");
  }
  
  // 5. Growth Rate: CAGR across actual calendar months
  let growthRate = 0;
  const nonZeroMonths = sortedMonths.filter(m => m.unitsSold > 0);
  if (nonZeroMonths.length >= 2) {
    const firstMonth = nonZeroMonths[0];
    const lastMonth = nonZeroMonths[nonZeroMonths.length - 1];
    
    // Calculate actual calendar months between first and last non-zero month
    const actualMonthsBetween = getMonthsBetween(firstMonth.month, lastMonth.month);
    
    if (firstMonth.unitsSold > 0 && actualMonthsBetween > 0) {
      growthRate = Math.pow(lastMonth.unitsSold / firstMonth.unitsSold, 1 / actualMonthsBetween) - 1;
      
      // Cap growth rate to reasonable bounds (-20% to +20% per month)
      if (growthRate > 0.2) {
        growthRate = 0.2;
        warnings.push("Growth rate capped at 20%/month");
      } else if (growthRate < -0.2) {
        growthRate = -0.2;
        warnings.push("Decline rate capped at 20%/month");
      }
    }
  } else {
    growthRate = 0;
    warnings.push("Insufficient data for growth rate - using 0%");
  }
  
  // 6. Seasonality Factors: Monthly patterns
  let seasonalityFactors: number[] = [];
  if (sortedMonths.length >= 3) {
    const avgUnitsPerMonth = totalSalesUnits / sortedMonths.length;
    seasonalityFactors = sortedMonths.map(m => 
      avgUnitsPerMonth > 0 ? m.unitsSold / avgUnitsPerMonth : 1
    );
    
    // Normalize to mean 1
    const mean = seasonalityFactors.reduce((s, f) => s + f, 0) / seasonalityFactors.length;
    if (mean > 0) {
      seasonalityFactors = seasonalityFactors.map(f => f / mean);
    }
  } else {
    seasonalityFactors = [1];
    warnings.push("Insufficient data for seasonality - using flat pattern");
  }
  
  return {
    price: Math.round(price * 100) / 100,
    unitVariableCost: Math.round(unitVariableCost * 100) / 100,
    fixedCostsPerMonth: Math.round(fixedCostsPerMonth * 100) / 100,
    initialUnits: Math.round(initialUnits),
    growthRate: Math.round(growthRate * 10000) / 10000, // 4 decimal places
    seasonalityFactors,
    dataQuality: {
      hasSufficientData,
      monthsWithSales,
      monthsWithExpenses,
      totalSales: totalSalesUnits,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      warnings,
    },
  };
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
