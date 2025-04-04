import { IReference } from "@/types/db/chat"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
interface IProps {
    loading?: boolean
    content: string
    reference?: IReference
}

const MarkdownContent = ({
    loading,
    content,
    reference,
}: IProps) => {
    return (
        <div className={cn(
            "prose prose-sm max-w-none dark:prose-invert",
            loading && "opacity-50"
        )}>
            <ReactMarkdown>{content}</ReactMarkdown>
        </div>
    )
}

export default MarkdownContent 