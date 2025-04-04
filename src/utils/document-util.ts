import { IChunk } from "@/types/db/knowledge-base";
import { IHighlight } from "react-pdf-highlighter";

export function getExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

export function getUnSupportedFilesCount(message: string): number {
    try {
        const match = message.match(/(\d+)\s+files?\s+not\s+supported/i);
        return match ? parseInt(match[1], 10) : 0;
    } catch (error) {
        return 0;
    }
}

export function buildChunkHighlights(chunk: IChunk, size: { width: number, height: number }): IHighlight[] {
    return [];
}
