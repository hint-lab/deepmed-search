import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "react-i18next"

interface IProps {
    selectedDocumentIds: string[]
    setSelectedDocumentIds: (ids: string[]) => void
    onTesting: (ids: string[]) => void
}

const RetrievalDocuments = ({
    selectedDocumentIds,
    setSelectedDocumentIds,
    onTesting,
}: IProps) => {
    const { t } = useTranslation()

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("chat.retrievalDocuments")}</CardTitle>
            </CardHeader>
            <CardContent>
                {/* TODO: 实现文档检索UI */}
            </CardContent>
        </Card>
    )
}

export default RetrievalDocuments 