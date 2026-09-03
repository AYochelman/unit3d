export const fmtILS = (n: number): string =>
  "₪" + Number(n).toLocaleString("en-US");
