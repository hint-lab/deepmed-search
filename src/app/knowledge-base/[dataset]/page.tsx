import DatasetView from '@/components/dataset-view';

export default async function DatasetPage({
    searchParams,
}: {
    searchParams: { id: string };
}) {
    const id = await Promise.resolve(searchParams.id);
    return <DatasetView id={id} />;
}
