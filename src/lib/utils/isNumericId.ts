/* 
 * Checks if the given id is a numeric string or number and does not start with zero.
 * @param id - The id to check.
 * @returns true if the id is numeric and does not start with zero, false otherwise.
 */export const isNumericId = (id: string | number): boolean => {
  return /^\d+$/.test(String(id)) && String(id)[0] !== '0';
};