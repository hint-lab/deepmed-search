import { IChunk } from "@/types/chunk";
import { IHighlight } from "react-pdf-highlighter";

export function getExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

export function getUnSupportedFilesCount(message: string): number {
    try {
        const regex = /(\d+)\s+files?\s+not\s+supported/i;
        const match = regex.exec(message);
        return match ? parseInt(match[1], 10) : 0;
    } catch (error) {
        return 0;
    }
}

export function buildChunkHighlights(chunk: IChunk, size: { width: number, height: number }): IHighlight[] {
    return [];
}
