import { createWorker } from 'tesseract.js';
import { getExtension } from './utils';

export async function performOCR(filePath: string): Promise<string> {
    const worker = await createWorker('chi-sim');

    try {
        const { data: { text } } = await worker.recognize(filePath);
        return text;
    } finally {
        await worker.terminate();
    }
}

export function isOCRSupported(fileType: string): boolean {
    const supportedTypes = ['png', 'jpg', 'jpeg', 'bmp', 'tiff'];
    return supportedTypes.includes(getExtension(fileType).toLowerCase());
} 