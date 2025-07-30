export const formatToK = (number: number): string => {
  if (number >= 1000) {
    return `${Math.floor(number / 1000)}K`;
  }
  return number.toString();
};
