import { useNavigatePage } from '@/hooks/logic-hooks/navigate-hooks';
import { SideBar } from './sidebar';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface DatasetLayoutProps {
  children: React.ReactNode;
}
const PageHeader = ({ title, back }: { title: string, back: () => void }) => {
  return (
    <header className="flex justify-between items-center border-b pr-9">
      <div className="flex items-center ">
        <div className="flex items-center border-r p-1.5">
          <Button variant="ghost" size="icon" onClick={back}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
        <div className="p-4">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        </div>
      </div>
    </header>
  );
};

export default function DatasetLayout({ children }: DatasetLayoutProps) {
  const { navigateToDatasetList } = useNavigatePage();
  return (
    <section>
      <PageHeader
        title="Dataset details"
        back={navigateToDatasetList}
      ></PageHeader>
      <div className="flex flex-1">
        <SideBar></SideBar>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </section>
  );
}
