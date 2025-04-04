"use client";

import isEqual from 'lodash/isEqual';
import { useCallback, useRef, useState } from 'react';
import { useEffect } from 'react';

/**
 * 对话框状态管理 Hook
 * @returns {Object} 包含对话框显示状态和控制方法的对象
 */
export const useSetDialogState = () => {
  const [visible, setVisible] = useState(false);

  // 显示对话框
  const showDialog = useCallback(() => {
    setVisible(true);
  }, []);

  // 隐藏对话框
  const hideDialog = useCallback(() => {
    setVisible(false);
  }, []);

  // 切换对话框显示状态
  const switchVisible = useCallback(() => {
    setVisible(!visible);
  }, [visible]);

  return { visible, showDialog, hideDialog, switchVisible };
};

/**
 * 深度比较的 useEffect Hook
 * @param effect - 副作用函数
 * @param deps - 依赖数组
 */
export const useDeepCompareEffect = (
  effect: React.EffectCallback,
  deps: React.DependencyList,
) => {
  const ref = useRef<React.DependencyList>();
  let callback: ReturnType<React.EffectCallback> = () => { };

  // 使用 lodash 的 isEqual 进行深度比较
  if (!isEqual(deps, ref.current)) {
    callback = effect();
    ref.current = deps;
  }

  // 清理函数
  useEffect(() => {
    return () => {
      if (callback) {
        callback();
      }
    };
  }, []);
};

