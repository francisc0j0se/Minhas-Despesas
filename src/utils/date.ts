import { isPast, getMonth, getYear } from 'date-fns';

/**
 * Verifica se o mês e ano fornecidos já passaram em relação à data atual.
 * @param month Mês (1-12)
 * @param year Ano
 * @returns true se o mês/ano é estritamente passado.
 */
export const isMonthPast = (month: number, year: number): boolean => {
  const now = new Date();
  const currentMonth = getMonth(now) + 1;
  const currentYear = getYear(now);

  if (year < currentYear) {
    return true;
  }
  if (year === currentYear && month < currentMonth) {
    return true;
  }
  return false;
};

/**
 * Verifica se o mês e ano fornecidos são o mês atual.
 * @param month Mês (1-12)
 * @param year Ano
 * @returns true se for o mês atual.
 */
export const isCurrentMonth = (month: number, year: number): boolean => {
  const now = new Date();
  const currentMonth = getMonth(now) + 1;
  const currentYear = getYear(now);
  
  return year === currentYear && month === currentMonth;
};