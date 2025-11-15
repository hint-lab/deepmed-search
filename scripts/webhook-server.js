#!/usr/bin/env node

/**
 * GitHub Webhook 服务器
 * 接收 GitHub push 事件并触发自动部署
 */

const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置
const PORT = process.env.WEBHOOK_PORT || 9000;
const SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret';
const PROJECT_DIR = process.env.PROJECT_DIR || '/home/deploy/deepmed-search';
const DEPLOY_SCRIPT = path.join(PROJECT_DIR, 'scripts/deploy.sh');
const LOG_FILE = path.join(PROJECT_DIR, 'webhook.log');

// 日志函数
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage.trim());
    fs.appendFileSync(LOG_FILE, logMessage);
}

// 验证 GitHub 签名
function verifySignature(payload, signature) {
    if (!signature) {
        return false;
    }

    const hmac = crypto.createHmac('sha256', SECRET);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(digest)
    );
}

// 执行部署
function deploy(branch) {
    log(`🚀 开始部署分支: ${branch}`);
    
    const env = {
        ...process.env,
        PROJECT_DIR,
        BRANCH: branch
    };
    
    exec(`bash ${DEPLOY_SCRIPT}`, { env }, (error, stdout, stderr) => {
        if (error) {
            log(`❌ 部署失败: ${error.message}`);
            log(`错误输出: ${stderr}`);
            return;
        }
        
        log(`✅ 部署成功！`);
        log(`输出: ${stdout}`);
    });
}

// 处理 webhook 请求
function handleWebhook(req, res) {
    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method Not Allowed');
        return;
    }

    let body = '';
    
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        try {
            // 验证签名
            const signature = req.headers['x-hub-signature-256'];
            if (!verifySignature(body, signature)) {
                log('❌ 签名验证失败');
                res.writeHead(401, { 'Content-Type': 'text/plain' });
                res.end('Unauthorized');
                return;
            }
            
            const payload = JSON.parse(body);
            const event = req.headers['x-github-event'];
            
            log(`📨 收到 GitHub 事件: ${event}`);
            
            // 只处理 push 事件
            if (event === 'push') {
                const ref = payload.ref;
                const branch = ref.replace('refs/heads/', '');
                
                // 只部署指定分支
                const DEPLOY_BRANCHES = ['main', 'demo-without-gpu'];
                
                if (DEPLOY_BRANCHES.includes(branch)) {
                    log(`✓ 分支 ${branch} 触发部署`);
                    deploy(branch);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        status: 'success', 
                        message: `Deployment triggered for branch: ${branch}` 
                    }));
                } else {
                    log(`⊘ 分支 ${branch} 不在部署列表中，跳过`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        status: 'skipped', 
                        message: `Branch ${branch} is not configured for deployment` 
                    }));
                }
            } else if (event === 'ping') {
                log('✓ Webhook 配置成功！');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    status: 'success', 
                    message: 'Webhook is configured correctly!' 
                }));
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    status: 'ignored', 
                    message: `Event ${event} is not handled` 
                }));
            }
            
        } catch (error) {
            log(`❌ 处理请求失败: ${error.message}`);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
        }
    });
}

// 创建服务器
const server = http.createServer((req, res) => {
    if (req.url === '/webhook') {
        handleWebhook(req, res);
    } else if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    log(`🎯 Webhook 服务器运行在端口 ${PORT}`);
    log(`📍 Webhook URL: http://your-server:${PORT}/webhook`);
    log(`💡 请在 GitHub 仓库设置中配置 Webhook`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    log('收到 SIGTERM 信号，正在关闭服务器...');
    server.close(() => {
        log('服务器已关闭');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    log('收到 SIGINT 信号，正在关闭服务器...');
    server.close(() => {
        log('服务器已关闭');
        process.exit(0);
    });
});

