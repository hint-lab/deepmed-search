import { z } from "zod"
import { Tool } from "./base-agent"

// 天气查询工具
export const weatherTool: Tool = {
    name: "get_weather",
    description: "获取指定城市的天气信息",
    parameters: z.object({
        city: z.string().describe("城市名称"),
        date: z.string().optional().describe("日期,格式:YYYY-MM-DD"),
    }),
    handler: async ({ city, date }) => {
        // 这里应该调用实际的天气 API
        return {
            city,
            date: date || new Date().toISOString().split("T")[0],
            temperature: "25°C",
            condition: "晴天",
        }
    },
}

// 搜索工具
export const searchTool: Tool = {
    name: "web_search",
    description: "在网络上搜索信息",
    parameters: z.object({
        query: z.string().describe("搜索关键词"),
        limit: z.number().optional().describe("返回结果数量限制"),
    }),
    handler: async ({ query, limit = 5 }) => {
        // 这里应该调用实际的搜索 API
        return {
            query,
            results: [
                { title: "搜索结果 1", url: "http://example.com/1" },
                { title: "搜索结果 2", url: "http://example.com/2" },
            ].slice(0, limit),
        }
    },
}

// 计算器工具
export const calculatorTool: Tool = {
    name: "calculate",
    description: "执行数学计算",
    parameters: z.object({
        expression: z.string().describe("数学表达式"),
    }),
    handler: async ({ expression }) => {
        try {
            // 注意:这里使用 eval 仅作为示例,实际应用中应该使用更安全的计算方法
            const result = eval(expression)
            return {
                expression,
                result,
            }
        } catch (error) {
            throw new Error(`计算错误: ${error.message}`)
        }
    },
}

// 示例:如何使用这些工具
export async function exampleUsage() {
    // 创建 OpenAI Agent
    const agent = new OpenAIAgent({
        apiKey: process.env.OPENAI_API_KEY || "",
        model: "gpt-4o-mini",
        temperature: 0.3,
        systemPrompt: "你是一个有帮助的AI助手,可以使用各种工具来帮助用户。",
    })

    // 添加工具
    agent.addTool(weatherTool)
    agent.addTool(searchTool)
    agent.addTool(calculatorTool)

    try {
        // 使用函数调用处理用户输入
        const response = await agent.processWithFunctionCalling(
            "北京今天天气怎么样?帮我计算一下 23 * 45 等于多少?"
        )
        console.log("Agent Response:", response)
    } catch (error) {
        console.error("Error:", error)
    }
}