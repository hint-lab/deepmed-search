import { useState } from 'react';

export function useSelectedRecord<T>() {
    const [currentRecord, setCurrentRecord] = useState<T>({} as T);

    const setRecord = (record: T) => {
        setCurrentRecord(record);
    };

    return { currentRecord, setRecord };
} 