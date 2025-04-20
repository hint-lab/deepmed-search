import {SERPQuery} from "../types";

export function formatDateRange(query: SERPQuery) {
  let searchDateTime;
  const currentDate = new Date();
  let format = 'full'; // Default format

  switch (query.tbs) {
    case 'qdr:h':
      searchDateTime = new Date(Date.now() - 60 * 60 * 1000);
      format = 'hour';
      break;
    case 'qdr:d':
      searchDateTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      format = 'day';
      break;
    case 'qdr:w':
      searchDateTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      format = 'day';
      break;
    case 'qdr:m':
      searchDateTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      format = 'day';
      break;
    case 'qdr:y':
      searchDateTime = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      format = 'year';
      break;
    default:
      searchDateTime = undefined;
  }

  if (searchDateTime !== undefined) {
    const startDate = formatDateBasedOnType(searchDateTime, format);
    const endDate = formatDateBasedOnType(currentDate, format);
    return `Between ${startDate} and ${endDate}`;
  }

  return '';
}

export function formatDateBasedOnType(date: Date, formatType: string) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  switch (formatType) {
    case 'year':
      return `${year}-${month}-${day}`;
    case 'day':
      return `${year}-${month}-${day}`;
    case 'hour':
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    case 'full':
    default:
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
}