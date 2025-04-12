export interface ITag {
    id: string;
    name: string;
    knowledgeBaseId: string;
    createdAt: Date;
    updatedAt: Date;
}


export interface IRenameTag {
    id: string;
    oldName: string;
    newName: string;
}
