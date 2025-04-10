import { zerox } from "zerox";
import { ModelProvider, ModelOptions } from 'zerox/node-zerox/dist/types';
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ""
const OPENAI_API_MODEL = process.env.OPENAI_API_MODEL || "gpt-4o-mini"

if (!OPENAI_API_KEY) {
    console.error("错误: 未设置OPENAI_API_KEY环境变量");
    process.exit(1);
}

const result = await zerox({
    filePath: path.resolve(__dirname, "../../test/data/05-versions-space.pdf"),
    modelProvider: ModelProvider.OPENAI,
    credentials: {
        apiKey: OPENAI_API_KEY,
    },
    model: OPENAI_API_MODEL,
});
console.log(result)