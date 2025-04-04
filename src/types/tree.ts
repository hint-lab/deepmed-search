/**
 * 树节点数据接口
 */
export interface TreeNode {
    id: string;
    name: string;
    type: 'document' | 'tag' | 'folder';
    children?: TreeNode[];
    parentId?: string;
    expanded?: boolean;
    selected?: boolean;
}

/**
 * 树形数据结构
 */
export interface TreeData {
    nodes: TreeNode[];
    edges: {
        source: string;
        target: string;
        type: string;
    }[];
}

/**
 * 树形组件属性
 */
export interface TreeViewProps {
    data: TreeData;
    onNodeClick?: (node: TreeNode) => void;
    onNodeSelect?: (node: TreeNode) => void;
    className?: string;
} 