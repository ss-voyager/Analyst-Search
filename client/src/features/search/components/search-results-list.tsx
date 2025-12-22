import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MapPin, MoreHorizontal, Download, Share2, Search, Loader2, Calendar, FileType } from "lucide-react";
import { SearchResult, VoyagerSearchResult } from "../types";
import { toast } from "sonner";
import { getFormatDisplayName } from "../format-utils";
import { DEFAULT_THUMBNAIL } from "../voyager-api";

// Get base path from environment variable (e.g., "/analyst-search")
const basePath = import.meta.env.VITE_BASE_PATH?.replace(/\/$/, '') || '';

// Generic result type that works with both local and Voyager results
type GenericResult = SearchResult | VoyagerSearchResult;

interface SearchResultsListProps {
  isLoading: boolean;
  filteredResults: GenericResult[];
  setHoveredResultId: (id: number | string | null) => void;
  setPreviewedResultId: (id: number | string | null) => void;
  setLocation: (loc: string) => void;
  onFilterByFormat?: (format: string) => void;
  onFilterByProvider?: (provider: string) => void;
  showFacets?: boolean;
  showMap?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  /** Current search URL params to preserve for back navigation */
  searchUrl?: string;
}

export function SearchResultsList({
  isLoading,
  filteredResults,
  setHoveredResultId,
  setPreviewedResultId,
  setLocation,
  onFilterByFormat,
  onFilterByProvider,
  showFacets = true,
  showMap = true,
  onLoadMore,
  hasMore: hasMoreFromServer = false,
  isLoadingMore: isLoadingMoreFromServer = false,
  searchUrl = ""
}: SearchResultsListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Navigate to item detail page while preserving search state for back navigation
  const navigateToItem = (itemId: string | number) => {
    // Store searchUrl in sessionStorage as a backup before navigating
    if (searchUrl) {
      sessionStorage.setItem('lastSearchUrl', searchUrl);
    }
    // Use setLocation which respects wouter's base path configuration
    setLocation(`/item/${itemId}`);
  };

  // Store latest values in refs so observer callback always has current values
  const hasMoreRef = useRef(hasMoreFromServer);
  const isLoadingMoreRef = useRef(isLoadingMoreFromServer);
  const onLoadMoreRef = useRef(onLoadMore);

  // Keep refs in sync with props
  useEffect(() => {
    hasMoreRef.current = hasMoreFromServer;
    isLoadingMoreRef.current = isLoadingMoreFromServer;
    onLoadMoreRef.current = onLoadMore;
  });

  // Set up intersection observer - runs once on mount and reconnects when results change
  useEffect(() => {
    let observer: IntersectionObserver | null = null;

    // Small delay to ensure ScrollArea viewport is mounted
    const timeoutId = setTimeout(() => {
      const scrollViewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
      const sentinel = loadMoreRef.current;

      if (!sentinel) return;

      observer = new IntersectionObserver(
        (entries) => {
          // Read from refs to get latest values
          if (entries[0].isIntersecting && hasMoreRef.current && !isLoadingMoreRef.current && onLoadMoreRef.current) {
            onLoadMoreRef.current();
          }
        },
        {
          root: scrollViewport,
          threshold: 0.1,
          rootMargin: '400px'
        }
      );

      observer.observe(sentinel);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [filteredResults.length, isLoading]); // Re-run when results change or loading state changes

  // Adjust grid columns based on which panels are visible
  const getGridCols = () => {
    if (!showFacets && !showMap) {
      return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6";
    } else if (!showFacets || !showMap) {
      return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";
    }
    return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-muted/30 dark:bg-background/50" ref={scrollAreaRef}>
       <ScrollArea className="flex-1">
         <div className="p-4">
           {isLoading ? (
             <div className={`grid ${getGridCols()} gap-4`}>
               {Array.from({ length: 8 }).map((_, i) => (
                 <div key={i} className="flex flex-col h-[300px] rounded-xl border border-border overflow-hidden bg-card">
                   <Skeleton className="h-[160px] w-full rounded-none" />
                   <div className="p-3 flex-1 flex flex-col space-y-2">
                     <Skeleton className="h-4 w-3/4" />
                     <div className="space-y-1 pt-2">
                       <Skeleton className="h-3 w-1/2" />
                       <Skeleton className="h-3 w-1/3" />
                       <Skeleton className="h-3 w-1/4" />
                     </div>
                     <div className="mt-auto pt-2 flex justify-between items-center">
                        <Skeleton className="h-6 w-16 rounded-full" />
                        <Skeleton className="h-6 w-16" />
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           ) : filteredResults.length > 0 ? (
             <>
               <div className={`grid ${getGridCols()} gap-4`}>
                 {filteredResults.map((result, i) => (
                   <motion.div
                     key={result.id}
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.3 }}
                     className="group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:shadow-xl hover:border-primary/50 transition-all duration-300 cursor-pointer h-[320px]"
                     onMouseEnter={() => setHoveredResultId(result.id)}
                     onMouseLeave={() => setHoveredResultId(null)}
                     onClick={() => navigateToItem(result.id)}
                   >
                     {/* Image Thumbnail */}
                     <div className="relative h-[160px] overflow-hidden bg-muted">
                       <img
                         src={result.thumbnail}
                         alt={result.title}
                         className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                         loading="lazy"
                         onError={(e) => { e.currentTarget.src = DEFAULT_THUMBNAIL; }}
                       />
                     </div>

                     {/* Content */}
                     <div className="p-4 flex-1 flex flex-col gap-1.5">
                       {/* Clickable Name */}
                       <button
                         className="font-display font-bold text-base leading-tight text-left group-hover:text-primary transition-colors line-clamp-2 hover:underline"
                         title={result.title}
                         onClick={(e) => {
                           e.stopPropagation();
                           navigateToItem(result.id);
                         }}
                       >
                         {result.title}
                       </button>

                       {/* Format and Date */}
                       <div className="text-xs text-muted-foreground space-y-1 mt-1">
                         <p className="flex items-center gap-1.5">
                           <FileType className="w-3 h-3 text-foreground/50" />
                           <span className="text-foreground/70">Format:</span>{' '}
                           <span className="text-foreground">{getFormatDisplayName(result.format)}</span>
                         </p>
                         <p className="flex items-center gap-1.5">
                           <Calendar className="w-3 h-3 text-foreground/50" />
                           <span className="text-foreground/70">Date:</span>{' '}
                           <span className="text-foreground">
                             {(() => {
                               const dateStr = 'date' in result ? result.date :
                                 ('modified' in result ? result.modified :
                                 ('acquisitionDate' in result ? result.acquisitionDate :
                                 ('publishDate' in result ? result.publishDate : null)));
                               if (!dateStr) return 'N/A';
                               try {
                                 return new Date(dateStr).toLocaleDateString();
                               } catch {
                                 return dateStr;
                               }
                             })()}
                           </span>
                         </p>
                       </div>

                       {/* Tools - Bottom Right */}
                       <div className="mt-auto flex justify-end">
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                             <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground">
                               <MoreHorizontal className="w-4 h-4" />
                               Tools
                             </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                             <DropdownMenuItem
                               className="gap-2 cursor-pointer"
                               onClick={() => {
                                 const downloadUrl = 'download' in result ? result.download : null;
                                 if (downloadUrl) {
                                   window.open(downloadUrl, '_blank');
                                 } else {
                                   toast.error("Download not available for this item");
                                 }
                               }}
                             >
                               <Download className="w-4 h-4" />
                               Download
                             </DropdownMenuItem>
                             <DropdownMenuItem
                               className="gap-2 cursor-pointer"
                               onClick={() => {
                                 const shareUrl = 'fullpath' in result ? result.fullpath : `${window.location.origin}${basePath}/item/${result.id}`;
                                 if (shareUrl) {
                                   navigator.clipboard.writeText(shareUrl);
                                   toast.success("Link copied to clipboard");
                                 }
                               }}
                             >
                               <Share2 className="w-4 h-4" />
                               Share
                             </DropdownMenuItem>
                           </DropdownMenuContent>
                         </DropdownMenu>
                       </div>
                     </div>
                     
                     {/* Hover Border Effect */}
                     <div className="absolute inset-0 border-2 border-primary opacity-0 group-hover:opacity-100 rounded-xl pointer-events-none transition-opacity duration-300" />
                   </motion.div>
                 ))}
               </div>
               
               {/* Load More Trigger - always rendered so observer can watch it */}
               <div ref={loadMoreRef} className="flex justify-center items-center py-8">
                 {isLoadingMoreFromServer && (
                   <div className="flex items-center gap-2 text-muted-foreground">
                     <Loader2 className="w-5 h-5 animate-spin" />
                     <span className="text-sm">Loading more...</span>
                   </div>
                 )}
               </div>
             </>
           ) : (
             <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8 border border-dashed border-border rounded-xl bg-muted/10">
               <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                 <Search className="w-8 h-8 text-muted-foreground" />
               </div>
               <h3 className="text-xl font-bold mb-2">No results found</h3>
               <p className="text-muted-foreground max-w-sm mb-6">
                 Try adjusting your search terms, location, or filters to find what you're looking for.
               </p>
               <Button variant="outline" onClick={() => window.location.reload()}>Clear Filters</Button>
             </div>
           )}
         </div>
       </ScrollArea>
    </div>
  );
}
