import ProtectedRoute from '@/components/protected-route';

export default function ResearchLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <ProtectedRoute>
            {children}
        </ProtectedRoute>
    );
}