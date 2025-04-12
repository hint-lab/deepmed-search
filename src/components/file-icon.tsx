import {
    FileText,
    File,
    Image as ImageIcon,
    FileType
} from 'lucide-react';

interface FileIconProps {
    extension: string;
}


// 根据文件扩展名获取对应的图标

export function FileIcon({ extension }: FileIconProps) {

    switch (extension.toLowerCase()) {
        // 文档类型
        case 'pdf':
            return <FileType className="h-5 w-5 text-red-500" />;
        case 'doc':
        case 'docx':
            return <FileText className="h-5 w-5 text-blue-600" />;
        case 'xls':
        case 'xlsx':
            return <FileText className="h-5 w-5 text-green-600" />;
        case 'ppt':
        case 'pptx':
            return <FileText className="h-5 w-5 text-orange-500" />;
        case 'md':
        case 'markdown':
            return <FileText className="h-5 w-5 text-gray-700" />;
        case 'txt':
            return <FileText className="h-5 w-5 text-gray-500" />;

        // 图片类型
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'svg':
        case 'webp':
            return <ImageIcon className="h-5 w-5 text-blue-500" />;

        // 代码类型
        case 'py':
        case 'js':
        case 'ts':
        case 'jsx':
        case 'tsx':
            return <File className="h-5 w-5 text-yellow-500" />;
        case 'html':
            return <File className="h-5 w-5 text-orange-400" />;
        case 'json':
        case 'xml':
            return <File className="h-5 w-5 text-purple-500" />;
        // 默认类型
        default:
            return <FileText className="h-5 w-5 text-gray-500" />;
    }
};