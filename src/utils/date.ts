import dayjs from 'dayjs';

export function formatDate(dateString: string | Date): string {
    if (!dateString) {
        return '-';
    }
    const date = dayjs(dateString);
    if (!date.isValid()) {
        return '-';
    }
    return date.format('YYYY-MM-DD HH:mm');
}

export function formatTime(date: any) {
    if (!date) {
        return '';
    }
    return dayjs(date).format('HH:mm:ss');
}

export function today() {
    return formatDate(dayjs().toString());
}

export function lastDay() {
    return formatDate(dayjs().subtract(1, 'days').toDate());
}

export function lastWeek() {
    return formatDate(dayjs().subtract(1, 'weeks').toDate());
}

export function formatPureDate(date: any) {
    if (!date) {
        return '';
    }
    return dayjs(date).format('DD/MM/YYYY');
}
