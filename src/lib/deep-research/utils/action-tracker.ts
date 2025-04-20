import { EventEmitter } from 'events';
import { StepAction } from '../types';
import { getI18nText } from "./text-tools";

// 定义动作跟踪器的状态结构
interface ActionState {
  thisStep: StepAction; // 当前步骤的动作
  gaps: string[];       // 当前存在的知识差距（问题列表）
  totalStep: number;    // 总共执行的步骤数
}

// ActionTracker 类用于跟踪代理执行的动作和思考过程
// 它继承自 EventEmitter，可以在状态变化时发出事件
export class ActionTracker extends EventEmitter {
  // 私有状态变量，存储当前的动作状态
  private state: ActionState = {
    thisStep: { action: 'answer', answer: '', references: [], think: '' }, // 初始动作为回答空内容
    gaps: [], // 初始知识差距为空
    totalStep: 0 // 初始步骤数为 0
  };

  // 跟踪一个完整的动作步骤
  // newState 可以包含部分或全部 ActionState 的更新
  trackAction(newState: Partial<ActionState>) {
    // 合并新状态到当前状态
    this.state = { ...this.state, ...newState };
    // 发出 'action' 事件，传递当前的动作步骤信息
    this.emit('action', this.state.thisStep);
  }

  // 跟踪思考过程
  // think: 思考内容的字符串
  // lang: 语言代码，用于国际化
  // params: 传递给国际化函数的参数
  trackThink(think: string, lang?: string, params = {}) {
    // 如果提供了语言代码，则获取国际化后的文本
    if (lang) {
      think = getI18nText(think, lang, params);
    }
    // 更新状态中的思考内容，并将 URLTargets 清空 (因为思考过程不直接涉及访问URL)
    // 注意：这里强制转换为 StepAction 可能需要根据实际 StepAction 定义调整
    this.state = { ...this.state, thisStep: { ...this.state.thisStep, URLTargets: [], think } as StepAction };
    // 发出 'action' 事件，传递更新后的动作步骤信息 (主要是更新了 think)
    this.emit('action', this.state.thisStep);
  }

  // 获取当前的动作状态
  // 返回状态对象的一个浅拷贝，防止外部直接修改内部状态
  getState(): ActionState {
    return { ...this.state };
  }

  // 重置状态到初始值
  reset() {
    this.state = {
      thisStep: { action: 'answer', answer: '', references: [], think: '' },
      gaps: [],
      totalStep: 0
    };
  }
}
