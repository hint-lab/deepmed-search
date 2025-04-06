import ProtectedRoute from "@/components/protected-route";

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (<ProtectedRoute >
        {children}
    </ProtectedRoute >
    )
}
