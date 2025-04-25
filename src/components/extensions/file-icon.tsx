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
            return <FileType className="text-red-500" size={16} />;
        case 'doc':
        case 'docx':
            return <FileText className="text-blue-600" size={16} />;
        case 'xls':
        case 'xlsx':
            return <FileText className="text-green-600" size={16} />;
        case 'ppt':
        case 'pptx':
            return <FileText className="text-orange-500" size={16} />;
        case 'md':
        case 'markdown':
            return <FileText className="text-gray-700" size={16} />;
        case 'txt':
            return <FileText className="text-gray-500" size={16} />;

        // 图片类型
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'svg':
        case 'webp':
            return <ImageIcon className="text-blue-500" size={16} />;

        // 代码类型
        case 'py':
        case 'js':
        case 'ts':
        case 'jsx':
        case 'tsx':
            return <File className="text-yellow-500" size={16} />;
        case 'html':
            return <File className="text-orange-400" size={16} />;
        case 'json':
        case 'xml':
            return <File className="text-purple-500" size={16} />;
        // 默认类型
        default:
            return <FileText className="text-gray-500" size={16} />;
    }
};