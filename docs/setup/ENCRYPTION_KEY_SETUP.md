# 加密密钥设置说明

## ⚠️ 重要提示

在启动系统之前，您**必须**配置 `ENCRYPTION_KEY` 环境变量。此密钥用于加密用户的 LLM API Key，确保数据安全。

## 快速设置

### 1. 生成加密密钥

在终端运行以下命令生成一个安全的随机密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

这将输出一个64字符的十六进制字符串，例如：
```
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

### 2. 添加到 .env 文件

在项目根目录的 `.env` 文件中添加：

```env
ENCRYPTION_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

**注意**: 请替换为您自己生成的密钥！

### 3. 验证配置

启动应用后，如果加密密钥配置正确，用户 LLM 配置功能将正常工作。

如果配置错误或未配置，系统在尝试加密/解密时会抛出错误。

## 安全最佳实践

### ✅ 应该做的

1. **使用强密钥**: 使用上述命令生成的随机密钥
2. **保密存储**: 不要将密钥提交到版本控制系统
3. **定期轮换**: 在生产环境中定期更换密钥（需要数据迁移）
4. **备份密钥**: 安全备份密钥，丢失密钥将导致无法解密已存储的 API Key

### ❌ 不应该做的

1. **不要使用简单密钥**: 如 "password123" 或 "myencryptionkey"
2. **不要公开密钥**: 不要提交到 Git、不要在日志中打印
3. **不要在多个环境使用相同密钥**: 开发、测试、生产应使用不同密钥
4. **不要硬编码**: 始终通过环境变量配置

## 生产环境建议

### Docker 环境

在 `docker-compose.yml` 中：

```yaml
services:
  app:
    environment:
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
```

然后在宿主机的 `.env` 文件中配置密钥。

### Kubernetes 环境

使用 Secret 存储：

```bash
kubectl create secret generic encryption-key \
  --from-literal=ENCRYPTION_KEY=your-encryption-key-here
```

在 Deployment 中引用：

```yaml
env:
  - name: ENCRYPTION_KEY
    valueFrom:
      secretKeyRef:
        name: encryption-key
        key: ENCRYPTION_KEY
```

### 云平台

- **AWS**: 使用 AWS Secrets Manager 或 Parameter Store
- **Azure**: 使用 Azure Key Vault
- **Google Cloud**: 使用 Secret Manager

## 密钥轮换

如果需要更换加密密钥：

1. **准备**: 记录旧密钥和新密钥
2. **迁移脚本**: 创建数据迁移脚本
3. **解密**: 使用旧密钥解密所有用户的 API Key
4. **重新加密**: 使用新密钥重新加密
5. **更新环境变量**: 更新 `.env` 文件
6. **重启应用**: 重启应用使新密钥生效

示例迁移脚本（需要根据实际情况调整）：

```typescript
// scripts/rotate-encryption-key.ts
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const OLD_KEY = process.env.OLD_ENCRYPTION_KEY;
const NEW_KEY = process.env.NEW_ENCRYPTION_KEY;

async function rotateKeys() {
  const users = await prisma.user.findMany({
    where: { llmApiKey: { not: null } }
  });

  for (const user of users) {
    // 使用旧密钥解密
    const decrypted = decryptWithKey(user.llmApiKey!, OLD_KEY);
    // 使用新密钥加密
    const encrypted = encryptWithKey(decrypted, NEW_KEY);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { llmApiKey: encrypted }
    });
  }
}
```

## 故障排查

### 错误: "ENCRYPTION_KEY environment variable is not set"

**原因**: 未配置 `ENCRYPTION_KEY` 环境变量

**解决方案**: 按照上述步骤 1-2 生成并配置密钥

### 错误: "Failed to decrypt API Key"

**原因**: 
1. 加密密钥已更改
2. 数据库中的加密数据损坏
3. 加密格式不兼容

**解决方案**:
1. 确认使用的是正确的加密密钥
2. 检查数据库中的数据完整性
3. 如果密钥已更改，需要运行密钥轮换脚本

### 测试加密功能

使用以下代码测试加密功能是否正常：

```typescript
import { encryptApiKey, decryptApiKey, validateEncryptionKey } from '@/lib/crypto';

// 测试加密密钥配置
console.log('Encryption key valid:', validateEncryptionKey());

// 测试加密/解密
const testKey = 'sk-test-1234567890abcdef';
const encrypted = encryptApiKey(testKey);
console.log('Encrypted:', encrypted);

const decrypted = decryptApiKey(encrypted);
console.log('Decrypted:', decrypted);
console.log('Match:', testKey === decrypted);
```

## 支持

如有问题，请联系技术支持或查看项目文档。

---

**重要**: 此文件包含安全相关信息，请妥善保管。

