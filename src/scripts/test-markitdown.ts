import { createMarkItDownClient } from '@/lib/markitdown/client';

async function testMarkItDown() {
  const client = createMarkItDownClient();

  // 检查安装
  console.log('🔍 检查 MarkItDown 安装状态...');
  const isInstalled = await client.checkInstallation();
  
  if (isInstalled) {
    console.log('✅ MarkItDown 已正确安装');
  } else {
    console.log('❌ MarkItDown 未安装');
    console.log('');
    console.log('请运行以下命令安装:');
    console.log('  pip install markitdown[all]');
    console.log('');
    console.log('或按需安装特定格式支持:');
    console.log('  pip install markitdown[pdf]    # PDF 支持');
    console.log('  pip install markitdown[docx]   # Word 支持');
    console.log('  pip install markitdown[xlsx]   # Excel 支持');
    process.exit(1);
  }

  // 测试转换（如果有测试文件）
  const testFile = process.argv[2];
  if (testFile) {
    console.log(`\n📄 测试转换文件: ${testFile}`);
    const result = await client.convert(testFile);
    
    if (result.success) {
      console.log('✅ 转换成功');
      console.log(`⏱️  处理时间: ${result.processingTime}ms`);
      console.log(`📝 内容长度: ${result.content.length} 字符`);
      console.log('\n--- Markdown 内容预览（前 500 字符）---');
      console.log(result.content.substring(0, 500));
      if (result.content.length > 500) {
        console.log('...\n(内容已截断)');
      }
    } else {
      console.log('❌ 转换失败:', result.error);
      process.exit(1);
    }
  } else {
    console.log('\n💡 提示: 可以指定文件路径进行测试');
    console.log('  npx tsx src/scripts/test-markitdown.ts /path/to/document.pdf');
  }
}

testMarkItDown().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});

