// 共用格式化工具
export const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
