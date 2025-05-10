import ProtectedRoute from '@/components/protected-route';

export default function DevToolsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <ProtectedRoute>
            <div className="container mx-auto py-6">
                <h1 className="text-2xl font-bold mb-6">Development Tools</h1>
                {children}
            </div>
        </ProtectedRoute>
    );
} 