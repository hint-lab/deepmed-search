/**
 * Answer Validator - 验证生成的答案是否有效
 * 在评估器之前进行基础校验，拦截无效输出
 */

export interface ValidationResult {
    valid: boolean;
    reason?: string;
    severity?: 'error' | 'warning';
}

/**
 * 检查答案是否为空或无效值
 */
function checkEmptyOrInvalid(answer: string): ValidationResult {
    const trimmed = answer.trim();
    
    // 1. 完全空白
    if (!trimmed) {
        return {
            valid: false,
            reason: '答案为空',
            severity: 'error'
        };
    }
    
    // 2. 无效字符串字面量
    const invalidLiterals = [
        'undefined',
        'null',
        'n/a',
        'na',
        'none',
        'error',
        '[object object]',
        'nan'
    ];
    
    const normalizedAnswer = trimmed.toLowerCase();
    if (invalidLiterals.includes(normalizedAnswer)) {
        return {
            valid: false,
            reason: `答案为无效值: "${trimmed}"`,
            severity: 'error'
        };
    }
    
    // 3. 纯符号或空结构
    const emptyStructures = ['[]', '{}', '()', '<>', '""', "''"];
    if (emptyStructures.includes(trimmed)) {
        return {
            valid: false,
            reason: `答案为空结构: ${trimmed}`,
            severity: 'error'
        };
    }
    
    return { valid: true };
}

/**
 * 检查答案长度是否合理
 */
function checkLength(answer: string): ValidationResult {
    const trimmed = answer.trim();
    
    // 太短（可能无意义）
    if (trimmed.length < 10) {
        return {
            valid: false,
            reason: `答案过短 (${trimmed.length} 字符)，可能缺乏实质内容`,
            severity: 'warning'
        };
    }
    
    // 太长（可能是错误输出）
    if (trimmed.length > 50000) {
        return {
            valid: false,
            reason: `答案过长 (${trimmed.length} 字符)，可能包含错误数据`,
            severity: 'warning'
        };
    }
    
    return { valid: true };
}

/**
 * 检查答案是否为原始 JSON 或对象字符串
 */
function checkRawStructure(answer: string): ValidationResult {
    const trimmed = answer.trim();
    
    // 检查是否为 JSON 对象格式
    if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
        try {
            const parsed = JSON.parse(trimmed);
            // 如果成功解析为对象/数组，说明可能是原始 JSON
            if (typeof parsed === 'object') {
                return {
                    valid: false,
                    reason: '答案为原始 JSON 结构，未转换为自然语言',
                    severity: 'error'
                };
            }
        } catch (e) {
            // JSON 解析失败，可能是正常的文本（如代码块）
        }
    }
    
    // 检查是否包含大量数字索引（如 "0": "字", "1": "符"）
    const indexPattern = /['"]\d+['"]\s*:\s*['"][^'"]{1,3}['"]/g;
    const matches = trimmed.match(indexPattern);
    if (matches && matches.length > 10) {
        return {
            valid: false,
            reason: '答案包含大量字符索引，可能为逐字拆分的错误输出',
            severity: 'error'
        };
    }
    
    return { valid: true };
}

/**
 * 检查答案是否包含常见错误模式
 */
function checkErrorPatterns(answer: string): ValidationResult {
    const trimmed = answer.trim();
    const lowerAnswer = trimmed.toLowerCase();
    
    // 常见错误提示
    const errorPatterns = [
        /error:/i,
        /exception:/i,
        /failed to/i,
        /cannot find/i,
        /unable to/i,
        /抱歉.*无法/,
        /很遗憾.*失败/,
        /出错了/
    ];
    
    for (const pattern of errorPatterns) {
        if (pattern.test(trimmed)) {
            // 如果答案主要是错误信息（长度较短且包含错误关键词）
            if (trimmed.length < 100) {
                return {
                    valid: false,
                    reason: '答案主要为错误提示信息',
                    severity: 'error'
                };
            }
        }
    }
    
    return { valid: true };
}

/**
 * 检查答案是否包含实质内容
 */
function checkSubstance(answer: string): ValidationResult {
    const trimmed = answer.trim();
    
    // 去除空白字符后的长度
    const contentLength = trimmed.replace(/\s+/g, '').length;
    
    // 如果去除空白后太短
    if (contentLength < 20) {
        return {
            valid: false,
            reason: '答案缺乏实质内容（去除空白后仅 ' + contentLength + ' 字符）',
            severity: 'warning'
        };
    }
    
    // 检查是否只包含标点符号
    const alphanumericCount = (trimmed.match(/[a-zA-Z0-9\u4e00-\u9fa5]/g) || []).length;
    if (alphanumericCount < 10) {
        return {
            valid: false,
            reason: '答案主要由标点符号组成，缺少文字内容',
            severity: 'warning'
        };
    }
    
    return { valid: true };
}

/**
 * 主验证函数 - 对答案进行全面检查
 */
export function validateAnswer(answer: string | undefined | null): ValidationResult {
    // 0. 类型检查
    if (answer === undefined || answer === null) {
        return {
            valid: false,
            reason: '答案为 undefined 或 null',
            severity: 'error'
        };
    }
    
    if (typeof answer !== 'string') {
        return {
            valid: false,
            reason: `答案类型错误: ${typeof answer}，期望 string`,
            severity: 'error'
        };
    }
    
    // 1. 空值和无效值检查
    const emptyCheck = checkEmptyOrInvalid(answer);
    if (!emptyCheck.valid) return emptyCheck;
    
    // 2. 长度检查
    const lengthCheck = checkLength(answer);
    if (!lengthCheck.valid && lengthCheck.severity === 'error') return lengthCheck;
    
    // 3. 原始结构检查
    const structureCheck = checkRawStructure(answer);
    if (!structureCheck.valid) return structureCheck;
    
    // 4. 错误模式检查
    const errorCheck = checkErrorPatterns(answer);
    if (!errorCheck.valid) return errorCheck;
    
    // 5. 实质内容检查
    const substanceCheck = checkSubstance(answer);
    if (!substanceCheck.valid && substanceCheck.severity === 'error') return substanceCheck;
    
    // 所有检查通过
    return { valid: true };
}

/**
 * 快速验证 - 只检查关键错误，用于性能敏感场景
 */
export function validateAnswerQuick(answer: string | undefined | null): boolean {
    if (!answer || typeof answer !== 'string') return false;
    const trimmed = answer.trim();
    if (!trimmed || trimmed.length < 5) return false;
    
    const invalidLiterals = ['undefined', 'null', 'n/a', 'error'];
    if (invalidLiterals.includes(trimmed.toLowerCase())) return false;
    
    return true;
}

/**
 * 验证并提供修复建议
 */
export function validateWithSuggestion(answer: string | undefined | null): {
    valid: boolean;
    reason?: string;
    suggestion?: string;
} {
    const result = validateAnswer(answer);
    
    if (!result.valid) {
        let suggestion = '';
        
        if (result.reason?.includes('undefined') || result.reason?.includes('null')) {
            suggestion = '建议检查 LLM 输出解析逻辑，确保正确提取 answer 字段';
        } else if (result.reason?.includes('JSON')) {
            suggestion = '建议使用 coerceToPlainText 将结构化数据转换为自然语言';
        } else if (result.reason?.includes('字符索引')) {
            suggestion = '检测到逐字拆分问题，建议检查 fallback 解析逻辑';
        } else if (result.reason?.includes('过短')) {
            suggestion = '答案内容不足，建议基于知识库生成更详细的回答';
        } else if (result.reason?.includes('错误提示')) {
            suggestion = '答案包含错误信息，建议使用 fallback 策略重新生成';
        }
        
        return {
            valid: false,
            reason: result.reason,
            suggestion
        };
    }
    
    return { valid: true };
}

