import { useInfiniteFetchKnowledgeList } from '@/hooks/knowledge-hooks';
import { useFetchUserInfo } from '@/hooks/user-setting-hooks';
import { useTranslation } from 'react-i18next';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useSaveKnowledge } from './hooks';
import KnowledgeBaseCard from './knowledge-base-card';
import KnowledgeBaseCreatingModal from './knowledge-base-creating-modal';
import { useMemo } from 'react';

// Shadcn UI 组件导入
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Search, Plus } from "lucide-react";

const KnowledgeList = () => {
  const { data: userInfo } = useFetchUserInfo();
  const { t } = useTranslation('translation', { keyPrefix: 'knowledgeList' });
  const {
    visible,
    hideModal,
    showModal,
    onCreateOk,
    loading: creatingLoading,
  } = useSaveKnowledge();
  const {
    fetchNextPage,
    data,
    hasNextPage,
    searchString,
    handleInputChange,
    loading,
  } = useInfiniteFetchKnowledgeList();

  const nextList = useMemo(() => {
    const list =
      data?.pages?.flatMap((x: any) => (Array.isArray(x.kbs) ? x.kbs : [])) ?? [];
    return list;
  }, [data?.pages]);

  const total = useMemo(() => {
    return data?.pages.at(-1).total ?? 0;
  }, [data?.pages]);

  return (
    <div className="flex flex-col py-12 overflow-auto flex-1" id="scrollableDiv">
      <div className="flex justify-between items-start px-[60px] pb-[72px]">
        <div>
          <span className="font-inter text-[30px] font-semibold leading-[38px] text-primary">
            {t('welcome')}, {userInfo.nickname}
          </span>
          <p className="font-inter text-base font-normal leading-6">
            {t('description')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('searchKnowledgePlaceholder')}
              value={searchString}
              className="w-[220px] pl-8"
              onChange={(e) => handleInputChange(e)}
            />
          </div>

          <Button
            onClick={showModal}
            className="font-inter text-sm font-semibold leading-5"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('createKnowledgeBase')}
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="space-y-2 px-[60px]">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <InfiniteScroll
          dataLength={nextList?.length ?? 0}
          next={fetchNextPage}
          hasMore={hasNextPage}
          loader={
            <div className="space-y-2 px-[60px]">
              <Skeleton className="h-12 w-full" />
            </div>
          }
          endMessage={!!total &&
            <div className="flex items-center justify-center py-4">
              <Separator className="flex-grow" />
              <span className="mx-4 text-sm text-muted-foreground">{t('noMoreData')} 🤐</span>
              <Separator className="flex-grow" />
            </div>
          }
          scrollableTarget="scrollableDiv"
        >
          <div className="flex flex-wrap gap-6 px-[60px] overflow-auto">
            {nextList?.length > 0 ? (
              nextList.map((item: any, index: number) => {
                return (
                  <KnowledgeCard
                    item={item}
                    key={`${item?.name}-${index}`}
                  ></KnowledgeCard>
                );
              })
            ) : (
              <div className="w-full flex items-center justify-center py-10">
                <div className="text-center">
                  <p className="text-muted-foreground">没有数据</p>
                </div>
              </div>
            )}
          </div>
        </InfiniteScroll>
      )}
      <KnowledgeCreatingModal
        loading={creatingLoading}
        visible={visible}
        hideModal={hideModal}
        onOk={onCreateOk}
      ></KnowledgeCreatingModal>
    </div>
  );
};

export default KnowledgeList;
