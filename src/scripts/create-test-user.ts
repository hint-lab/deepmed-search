import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

/**
 * 租户（Tenant）和用户（User）的概念说明：
 * 
 * 1. 租户（Tenant）：
 *    - 代表一个组织或公司
 *    - 每个租户有独立的配置和资源
 *    - 包含以下关键信息：
 *      - id: 租户唯一标识
 *      - name: 租户名称
 *      - embd_id: 嵌入模型ID
 *      - llm_id: 大语言模型ID
 *      - asr_id: 语音识别模型ID
 *      - parser_ids: 解析器ID列表
 * 
 * 2. 用户（User）：
 *    - 代表具体使用系统的个人
 *    - 必须属于一个租户
 *    - 包含以下信息：
 *      - id: 用户唯一标识
 *      - email: 用户邮箱
 *      - name: 用户名称
 *      - password: 加密后的密码
 *      - language: 用户语言偏好
 *      - tenantId: 所属租户ID
 * 
 * 3. 关系：
 *    - 一个租户可以有多个用户（一对多）
 *    - 每个用户必须属于一个租户
 *    - 支持多租户系统（Multi-tenant System）
 * 
 * 4. 实际应用场景：
 *    - 不同公司使用同一个系统
 *    - 每个公司有自己的配置和资源
 *    - 公司内的员工作为用户使用系统
 *    - 不同公司的数据相互隔离
 */

const prisma = new PrismaClient();

/**
 * 创建测试租户
 * 如果租户已存在则返回现有租户
 */
async function createTestTenant() {
    try {
        const tenantName = 'Test Tenant';

        // 检查租户是否已存在
        const existingTenant = await prisma.tenant.findFirst({
            where: { name: tenantName },
        });

        if (existingTenant) {
            console.log('租户已存在');
            return existingTenant;
        }

        // 创建新租户
        const tenant = await prisma.tenant.create({
            data: {
                name: tenantName,
                embd_id: 'test-embd-id',
                llm_id: 'test-llm-id',
                parser_ids: ['test-parser-ids'],
            },
        });

        console.log('测试租户创建成功:', {
            id: tenant.id,
            name: tenant.name,
        });

        return tenant;
    } catch (error) {
        console.error('创建租户失败:', error);
        throw error;
    }
}

/**
 * 创建测试用户
 * 如果用户已存在则跳过创建
 * 会自动创建或关联到测试租户
 */
async function createTestUser() {
    try {
        const email = 'test@example.com';
        const password = 'password123';
        const name = 'Test User';

        // 检查用户是否已存在
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            console.log('用户已存在');
            return;
        }

        // 创建或获取租户
        const tenant = await createTestTenant();

        // 密码加密
        const hashedPassword = await hash(password, 12);

        // 创建新用户
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                tenantId: tenant.id,
                language: 'zh',
            },
        });

        console.log('测试用户创建成功:', {
            id: user.id,
            email: user.email,
            name: user.name,
            tenantId: user.tenantId,
        });
    } catch (error) {
        console.error('创建用户失败:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createTestUser(); 