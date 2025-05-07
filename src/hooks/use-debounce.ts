"use client";
import { useEffect, useState } from 'react';

/**
 * 防抖 Hook
 * @description 用于延迟更新值，避免频繁触发更新
 * @template T - 值的类型
 * @param {T} value - 需要防抖的值
 * @param {number} [delay=500] - 防抖延迟时间（毫秒）
 * @returns {T} 防抖后的值
 * 
 * @example
 * // 基本使用
 * const debouncedValue = useDebounce(searchText, 500);
 * 
 * // 自定义延迟时间
 * const debouncedValue = useDebounce(searchText, 1000);
 */
export function useDebounce<T>(value: T, delay: number): T {
    // 存储防抖后的值
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        // 设置定时器，在延迟时间后更新值
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // 清理函数：在组件卸载或值变化时清除定时器
        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
} 