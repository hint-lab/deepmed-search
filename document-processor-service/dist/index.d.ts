import Koa from 'koa';
import { AppContext } from './types';
declare const app: Koa<{}, AppContext>;
export default app;
