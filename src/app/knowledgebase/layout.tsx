
import ProtectedRoute from "@/components/protected-route";
import { KnowledgeBaseProvider } from '@/contexts/knowledgebase-context'

export default async function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute >
            <KnowledgeBaseProvider>
                {children}
            </KnowledgeBaseProvider>
        </ProtectedRoute >
    )
}
