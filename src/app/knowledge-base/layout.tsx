
import ProtectedRoute from "@/components/protected-route";

export default async function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (<ProtectedRoute >
        {children}
    </ProtectedRoute >
    )
}
