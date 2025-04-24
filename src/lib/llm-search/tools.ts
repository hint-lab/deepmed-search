import { z } from 'zod';
import { generateObject, LanguageModelUsage, NoObjectGeneratedError } from "ai";
import { LanguageModelV1 } from '@ai-sdk/provider';

interface GenerateObjectOptions<T> {
    modelInstance: LanguageModelV1;
    schema: z.ZodType<T>;
    prompt?: string;
    system?: string;
    messages?: any;
    maxTokens: number;
    temperature: number;
}

export class ObjectGeneratorSafe {
    async generateObject<T>(options: GenerateObjectOptions<T>): Promise<{ object: T; usage: LanguageModelUsage, finishReason: string }> {
        const {
            modelInstance,
            schema,
            prompt,
            system,
            messages,
            maxTokens,
            temperature
        } = options;

        try {
            console.log(`[ObjectGenerator] Attempting generation with model: ${modelInstance.modelId}`);
            const result = await generateObject({
                model: modelInstance,
                schema,
                prompt,
                system,
                messages,
                maxTokens,
                temperature,
            });
            const usage = result.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
            const finishReason = result.finishReason || 'unknown';
            console.log(`[ObjectGenerator] Generation successful. Finish Reason: ${finishReason}`);
            return { ...result, usage, finishReason };

        } catch (error) {
            console.error(`[ObjectGenerator] Error during generation with ${modelInstance.modelId}:`, error);
            throw error;
        }
    }
} 