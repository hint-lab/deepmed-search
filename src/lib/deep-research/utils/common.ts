// 等待指定的毫秒数
export async function sleep(ms: number) {
    const seconds = Math.ceil(ms / 1000);
    console.log(`Waiting ${seconds}s...`);
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 检查评估类型是否包含在所有检查中
export function includesEval(allChecks: any[], evalType: string): boolean {
    return allChecks.some(c => c.type === evalType);
}

// 更新上下文
export function updateContext(step: any) {
    allContext.push(step)
}

// 存储所有上下文步骤
export const allContext: any[] = []; 