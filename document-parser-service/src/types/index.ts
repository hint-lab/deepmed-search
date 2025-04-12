import { Context } from 'koa';
import { IRouterParamContext } from 'koa-router';

// 定义文件类型
export interface UploadedFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    destination: string;
    filename: string;
    path: string;
    size: number;
}

// 定义请求体类型
export interface UploadRequestBody {
    documentId?: string;
}

// 扩展 Context 类型
export interface AppContext extends Context, IRouterParamContext {
    request: Context['request'] & {
        file?: UploadedFile;
    };
}
