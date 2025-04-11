import { Context } from 'koa';
import { IRouterParamContext } from 'koa-router';
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
export interface UploadRequestBody {
    documentId?: string;
}
export interface AppContext extends Context, IRouterParamContext {
    request: Context['request'] & {
        file?: UploadedFile;
    };
}
