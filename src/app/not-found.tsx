'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center space-y-6 text-center">
        {/* 404 SVG 图片 */}
        <div className="relative w-full max-w-md">
          <Image
            src="/assets/404.svg"
            alt="404 Not Found"
            width={400}
            height={300}
            className="w-full h-auto"
            priority
          />
        </div>

        {/* 错误信息 */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            页面未找到
          </h1>
          <p className="text-lg text-muted-foreground">
            抱歉，您访问的页面不存在或已被移动。
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button asChild size="lg" variant="default">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              返回首页
            </Link>
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回上一页
          </Button>
        </div>
      </div>
    </div>
  );
}

