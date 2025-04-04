"use client"
import { useFetchKnowledgeList } from "@/hooks/use-knowledge-base"
import { ChevronRight, Folder, FolderOpen, PanelLeftClose, PanelLeftOpen, FileIcon } from "lucide-react"
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface IKnowledgeItem {
    id: string;
    name: string;
    avatar?: string;
    embd_id: string;
}

interface IGroupedItem {
    id: string;
    name: string;
    children?: IKnowledgeItem[];
}

interface IKnowledgeList {
    items: IKnowledgeItem[];
    total: number;
    page: number;
    pageSize: number;
}

interface IProps {
    isFirstRender: boolean
    checkedList: string[]
    setCheckedList: Dispatch<SetStateAction<string[]>>
}

const SearchSidebar = ({
    isFirstRender,
    checkedList,
    setCheckedList,
}: IProps) => {
    const { list, loading } = useFetchKnowledgeList()
    const [collapsed, setCollapsed] = useState(false)
    const [openItems, setOpenItems] = useState<string[]>([])

    const groupedList = useMemo(() => {
        const items = Array.isArray(list) ? list : (list as IKnowledgeList)?.items || [];
        return (items as IKnowledgeItem[]).reduce<IGroupedItem[]>((pre, cur) => {
            const parentItem = pre.find((x) => x.id === cur.embd_id)
            const childItem = {
                id: cur.id,
                name: cur.name,
                avatar: cur.avatar,
                embd_id: cur.embd_id,
            }
            if (parentItem) {
                parentItem.children = parentItem.children || [];
                parentItem.children.push(childItem)
            } else {
                pre.push({
                    id: cur.embd_id,
                    name: cur.embd_id,
                    children: [childItem],
                })
            }
            return pre
        }, [])
    }, [list])

    useEffect(() => {
        const firstGroup = groupedList[0]?.children?.map((x) => x.id)
        if (firstGroup) {
            setCheckedList(firstGroup)
            setOpenItems([groupedList[0]?.id])
        }
    }, [groupedList, setCheckedList])

    const handleCheck = (checked: boolean, item: IGroupedItem | IKnowledgeItem) => {
        if ('children' in item && item.children) {
            // 父节点
            const childIds = item.children.map((x) => x.id);
            if (checked) {
                // 添加所有未选中的子节点
                const newIds = childIds.filter(id => !checkedList.includes(id));
                setCheckedList(prev => [...prev, ...newIds]);
            } else {
                // 移除所有已选中的子节点
                setCheckedList(prev => prev.filter(id => !childIds.includes(id)));
            }
        } else {
            // 子节点
            setCheckedList(prev =>
                checked
                    ? [...new Set([...prev, item.id])]  // 使用Set去重
                    : prev.filter(x => x !== item.id)
            );
        }
    }

    const toggleCollapse = (id: string) => {
        setOpenItems((prev) =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    const renderItem = useCallback(
        (item: IGroupedItem | IKnowledgeItem) => {
            const isParent = 'children' in item && item.children;
            const hasChildren = isParent && item.children && item.children.length > 0;
            const children = isParent ? item.children || [] : [];
            const isOpen = openItems.includes(item.id);

            if (isParent) {
                return (
                    <Collapsible key={item.id} open={isOpen}>
                        <div className="flex items-center space-x-2">
                            <CollapsibleTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-slate-100"
                                    onClick={() => toggleCollapse(item.id)}
                                >
                                    <ChevronRight className={cn(
                                        "h-4 w-4 text-slate-500 transition-transform",
                                        isOpen && "transform rotate-90"
                                    )} />
                                </Button>
                            </CollapsibleTrigger>
                            <div className="flex items-center space-x-2">
                                {isOpen ? (
                                    <FolderOpen className="h-4 w-4 text-blue-500" />
                                ) : (
                                    <Folder className="h-4 w-4 text-blue-500" />
                                )}
                                <Checkbox
                                    id={item.id}
                                    checked={hasChildren ? children.every((x) => checkedList.includes(x.id)) : checkedList.includes(item.id)}
                                    onCheckedChange={(checked) => handleCheck(checked as boolean, item)}
                                />
                                <span className="text-slate-500 font-semibold">{item.name}</span>
                            </div>
                        </div>
                        <CollapsibleContent className="space-y-2 mt-2">
                            <div className="ml-6 space-y-2">
                                {children.map((child) => renderItem(child))}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                )
            }

            return (
                <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox
                        id={item.id}
                        checked={checkedList.includes(item.id)}
                        onCheckedChange={(checked) => handleCheck(checked as boolean, item)}
                    />
                    <label
                        htmlFor={item.id}
                        className="flex items-center space-x-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={(item as IKnowledgeItem).avatar} />
                            <AvatarFallback>
                                <FileIcon className="h-4 w-4" />
                            </AvatarFallback>
                        </Avatar>
                        <span className="truncate max-w-[200px] text-slate-700 hover:text-slate-900">{item.name}</span>
                    </label>
                </div>
            )
        },
        [checkedList, openItems]
    )

    return (
        <aside
            className={cn(
                "relative transition-all duration-300 ease-in-out",
                collapsed ? "w-0 opacity-0" : "w-[300px] opacity-100",
                isFirstRender && "bg-transparent"
            )}
        >
            <Button
                variant="ghost"
                size="icon"
                className="absolute -right-10 top-3 h-8 w-8"
                onClick={() => setCollapsed(!collapsed)}
            >
                {collapsed ? (
                    <PanelLeftOpen className="h-4 w-4" />
                ) : (
                    <PanelLeftClose className="h-4 w-4" />
                )}
            </Button>
            <div className={cn(
                "h-screen border-r bg-white",
                collapsed && "hidden"
            )}>
                <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold text-slate-900">知识库列表</h2>
                </div>
                <ScrollArea className="h-[calc(100vh-65px)]">
                    <div className="p-4 space-y-4">
                        {groupedList.map((item) => renderItem(item))}
                    </div>
                </ScrollArea>
            </div>
        </aside>
    )
}

export default SearchSidebar 