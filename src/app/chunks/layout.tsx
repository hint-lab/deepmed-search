import ProtectedRoute from '@/components/protected-route';

export default function ChunksLayout({
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