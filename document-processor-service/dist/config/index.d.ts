declare const config: {
    port: number;
    nodeEnv: string;
    redis: {
        host: string;
        port: number;
        password: string;
        db: number;
    };
    queue: {
        prefix: string;
    };
    storage: {
        path: string;
        maxFileSize: number;
    };
    log: {
        level: string;
    };
};
export default config;
