/**
 * Formats a number into a string with commas as thousands separators.
 * @param num The number to format.
 * @returns A formatted string.
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString('ja-JP');
};

/**
 * Formats an ISO date string into a more readable 'YYYY年MM月DD日' format.
 * @param isoDate The ISO date string.
 * @returns A formatted date string.
 */
export const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
