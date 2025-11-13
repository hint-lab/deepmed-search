import { cn } from "@/lib/utils"
import { Markdown } from "@/components/markdown"

interface IProps {
    loading?: boolean
    content: string
    reference?: any // 保留以保持向后兼容，但不再使用
    className?: string
    components?: React.ComponentProps<typeof Markdown>['components']
}

const MarkdownContent = ({
    loading,
    content,
    reference,
    className,
    components,
}: IProps) => {
    return (
        <div className={cn(loading && "opacity-50")}>
            <Markdown
                content={content}
                className={className}
                components={components}
            />
        </div>
    )
}

export default MarkdownContent
