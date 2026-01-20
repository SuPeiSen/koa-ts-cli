/**
 * 下划线转大写驼峰
 * @param {string} str
 * @returns {string}
 */
export function underscoreToPascalCase(str: string): string {
    if (typeof str !== "string") return ""; // 处理非字符串输入
    return str
        .split("_") // 分割成数组
        .filter((word) => word.length > 0) // 过滤空字符串
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(""); // 合并成驼峰
}
