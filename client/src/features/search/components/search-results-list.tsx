import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cloud, Calendar, Database, HardDrive, MapPin } from "lucide-react";
import { SearchResult } from "../types";

interface SearchResultsListProps {
  isLoading: boolean;
  filteredResults: SearchResult[];
  setHoveredResultId: (id: number | null) => void;
  setPreviewedResultId: (id: number | null) => void;
  setLocation: (loc: string) => void;
}

export function SearchResultsList({
  isLoading,
  filteredResults,
  setHoveredResultId,
  setPreviewedResultId,
  setLocation
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
                     
                     <div className="absolute top-2 right-2 flex gap-1">
                        <Badge variant="secondary" className="text-[10px] h-5 bg-background/80 backdrop-blur border-border/50 text-foreground font-mono">
                          {result.platform}
                        </Badge>
                     </div>

                     <div className="absolute bottom-2 left-3 right-3 flex justify-between items-end">
                        <div className="flex flex-col">
                           <span className="text-white text-xs font-medium drop-shadow-md flex items-center gap-1">
                             <Calendar className="w-3 h-3 text-primary-foreground" />
                             {result.date}
                           </span>
                        </div>
                     </div>
                     
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
                   <div className="p-4 flex-1 flex flex-col gap-2">
                     <div>
                       <h3 className="font-display font-bold text-base leading-tight group-hover:text-primary transition-colors line-clamp-1" title={result.title}>
                         {result.title}
                       </h3>
                       <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                         {result.provider} • {result.format}
                       </p>
                     </div>

                     <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] py-0 h-5 border-border/50 bg-muted/50 text-muted-foreground font-normal gap-1">
                          <Cloud className="w-3 h-3" /> {result.cloudCover}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] py-0 h-5 border-border/50 bg-muted/50 text-muted-foreground font-normal gap-1">
                          <HardDrive className="w-3 h-3" /> ~850MB
                        </Badge>
                     </div>
                     
                     <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                           <Database className="w-3 h-3" />
                           Level-2A
                        </div>
                        <div className="font-mono opacity-50">
                           #{result.id.toString().padStart(4, '0')}
                        </div>
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
