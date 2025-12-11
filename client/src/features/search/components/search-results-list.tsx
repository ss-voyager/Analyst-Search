import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MapPin, MoreHorizontal, Download, Share2 } from "lucide-react";
import { SearchResult } from "../types";

interface SearchResultsListProps {
  isLoading: boolean;
  filteredResults: SearchResult[];
  setHoveredResultId: (id: number | null) => void;
  setPreviewedResultId: (id: number | null) => void;
  setLocation: (loc: string) => void;
  onFilterByFormat?: (format: string) => void;
  onFilterByProvider?: (provider: string) => void;
}

export function SearchResultsList({
  isLoading,
  filteredResults,
  setHoveredResultId,
  setPreviewedResultId,
  setLocation,
  onFilterByFormat,
  onFilterByProvider
}: SearchResultsListProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-muted/30 dark:bg-background/50">
       <ScrollArea className="flex-1">
         <div className="p-4">
           {isLoading ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
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
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
               {filteredResults.map((result, i) => (
                 <motion.div
                   key={result.id}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: i * 0.05, duration: 0.3 }}
                   className="group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:shadow-xl hover:border-primary/50 transition-all duration-300 cursor-pointer h-[320px]"
                   onMouseEnter={() => setHoveredResultId(result.id)}
                   onMouseLeave={() => setHoveredResultId(null)}
                   onClick={() => setLocation(`/item/${result.id}`)}
                 >
                   {/* Image Thumbnail */}
                   <div className="relative h-[160px] overflow-hidden bg-muted">
                     <img 
                       src={result.thumbnail} 
                       alt={result.title}
                       className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                       loading="lazy"
                     />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                     
                     {/* Quick Actions Overlay */}
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                        <button 
                          className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded-full hover:bg-gray-200 transition-colors shadow-lg transform translate-y-4 group-hover:translate-y-0 duration-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/item/${result.id}`);
                          }}
                        >
                          View Details
                        </button>
                        <button 
                          className="p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors border border-white/20 transform translate-y-4 group-hover:translate-y-0 duration-300 delay-75"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewedResultId(result.id);
                          }}
                          title="Locate on Map"
                        >
                          <MapPin className="w-4 h-4" />
                        </button>
                     </div>
                   </div>

                   {/* Content */}
                   <div className="p-4 flex-1 flex flex-col gap-1.5">
                     <h3 className="font-display font-bold text-base leading-tight group-hover:text-primary transition-colors line-clamp-2" title={result.title}>
                       {result.title}
                     </h3>
                     <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                       <p>
                         <span className="text-foreground/70">Format:</span>{' '}
                         <button 
                           className="text-primary hover:underline"
                           onClick={(e) => { e.stopPropagation(); if (result.format) onFilterByFormat?.(result.format); }}
                         >
                           {result.format || 'Unknown'}
                         </button>
                       </p>
                       <p>
                         <span className="text-foreground/70">Author:</span>{' '}
                         <button 
                           className="text-primary hover:underline"
                           onClick={(e) => { e.stopPropagation(); if (result.provider) onFilterByProvider?.(result.provider); }}
                         >
                           {result.provider || 'Unknown'}
                         </button>
                       </p>
                     </div>
                     <div className="mt-auto flex justify-end">
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                           <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground">
                             <MoreHorizontal className="w-4 h-4" />
                             Tools
                           </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                           <DropdownMenuItem className="gap-2 cursor-pointer">
                             <Download className="w-4 h-4" />
                             Download
                           </DropdownMenuItem>
                           <DropdownMenuItem className="gap-2 cursor-pointer">
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

// Helper icons needed since I removed imports
import { Search } from "lucide-react";
