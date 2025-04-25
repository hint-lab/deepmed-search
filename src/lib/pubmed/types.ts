export interface PubMedArticle {
    pmid: string;
    title: string;
    authors: string; // Comma-separated string of author names
    journal: string;
    pubdate: string;
    abstract?: string; // Optional: If fetched via EFetch
}

export interface PubMedSearchResult {
    articles: PubMedArticle[];
    count: number; // Total number of results found by the search
    queryKey?: string; // For ESearch history
    webEnv?: string;   // For ESearch history
} 