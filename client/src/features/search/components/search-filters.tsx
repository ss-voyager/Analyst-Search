import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Globe, Check, Layers, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Folder, FolderOpen, File } from "lucide-react";
import { TreeNode } from "../types";
import type { FacetCategory } from "../voyager-api";

// --- FolderTree Component ---
const FolderTree = ({ nodes, level = 0, onSelect, selectedIds = [] }: { nodes: TreeNode[], level?: number, onSelect?: (id: string, label: string) => void, selectedIds?: string[] }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelect = (e: React.MouseEvent, node: TreeNode) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(node.id, node.label);
    }
  };

  return (
    <div className="space-y-0.5">
      {nodes.map(node => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expanded[node.id];
        const isSelected = selectedIds.includes(node.id);
        
        return (
          <div key={node.id}>
            <div 
              className={cn(
                "flex items-center py-1.5 px-2 rounded-md group transition-colors cursor-pointer select-none",
                isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
              )}
              style={{ paddingLeft: `${level * 16 + 8}px` }}
              onClick={() => hasChildren && toggleExpand(node.id)}
            >
              <div className={cn("mr-2 transition-colors", isSelected ? "text-primary" : "text-muted-foreground/70 group-hover:text-primary")}>
                {hasChildren ? (
                  isExpanded ? <FolderOpen className="w-3.5 h-3.5" /> : <Folder className="w-3.5 h-3.5" />
                ) : (
                  <File className="w-3.5 h-3.5 opacity-50" />
                )}
              </div>
              
              <span className={cn("text-xs font-medium flex-1 truncate", isSelected ? "text-primary" : "text-foreground/90")}>
                {node.label}
              </span>
              
              <Checkbox 
                id={`tree-check-${node.id}`} 
                checked={isSelected}
                className={cn(
                  "w-3.5 h-3.5 ml-2 border-muted-foreground/40 group-hover:border-primary/60",
                  isSelected ? "data-[state=checked]:bg-primary border-primary" : ""
                )} 
                onClick={(e) => handleSelect(e, node)} 
              />
            </div>
            
            {hasChildren && isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <FolderTree nodes={node.children!} level={level + 1} onSelect={onSelect} selectedIds={selectedIds} />
              </motion.div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// --- SearchFilters Component ---
interface SearchFiltersProps {
  showFacets: boolean;
  setShowFacets: (show: boolean) => void;
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  hierarchyTree: TreeNode[];
  handleLocationFilterSelect: (id: string, label: string) => void;
  selectedLocationIds: string[];
  keywords: string[];
  keywordSearch: string;
  setKeywordSearch: (val: string) => void;
  toggleKeyword: (kw: string) => void;
  selectedKeywords: string[];
  selectedProperties: string[];
  toggleProperty: (prop: string) => void;
  selectedPlatforms: string[];
  togglePlatform: (platform: string) => void;
  // Voyager facets
  voyagerFacets?: FacetCategory[];
  selectedFacets?: Record<string, string[]>;
  onFacetToggle?: (field: string, value: string) => void;
}

export function SearchFilters({
  showFacets,
  setShowFacets,
  date,
  setDate,
  hierarchyTree,
  handleLocationFilterSelect,
  selectedLocationIds,
  keywords,
  keywordSearch,
  setKeywordSearch,
  toggleKeyword,
  selectedKeywords,
  selectedProperties,
  toggleProperty,
  selectedPlatforms,
  togglePlatform,
  voyagerFacets = [],
  selectedFacets = {},
  onFacetToggle,
}: SearchFiltersProps) {
  const [expandedFacets, setExpandedFacets] = useState<Record<string, boolean>>({});

  const toggleFacetExpanded = (field: string) => {
    setExpandedFacets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const isFacetValueSelected = (field: string, value: string) => {
    return selectedFacets[field]?.includes(value) || false;
  };
  return (
    <AnimatePresence mode="wait">
      {showFacets && (
        <motion.div 
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="border-r border-border/50 bg-background/95 backdrop-blur-xl hidden md:flex flex-col overflow-hidden shrink-0 z-10 shadow-lg"
        >
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6 pr-4">
              {/* Date Range Filter */}
              <div className="space-y-3">
                <h3 className="text-sm font-display font-bold text-foreground flex items-center gap-2 tracking-wide">
                  <CalendarIcon className="w-4 h-4 text-primary" /> Date Range
                </h3>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal text-xs",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date?.from ? (
                        date.to ? (
                          <>
                            {format(date.from, "LLL dd, y")} -{" "}
                            {format(date.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(date.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={setDate}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Separator className="bg-border/50" />

              <div className="space-y-3">
                <h3 className="text-sm font-display font-bold text-foreground flex items-center gap-2 tracking-wide">
                  <Globe className="w-4 h-4 text-primary" /> Location Hierarchy
                </h3>
                <div className="border border-border/60 rounded-lg bg-muted/10 p-2 max-h-[300px] overflow-y-auto">
                  <FolderTree nodes={hierarchyTree} onSelect={handleLocationFilterSelect} selectedIds={selectedLocationIds} />
                </div>
              </div>

              <Separator className="bg-border/50" />

              {/* Keywords Filter - Command style */}
              <div className="space-y-1">
                <Accordion type="single" collapsible defaultValue="keywords" className="w-full">
                  <AccordionItem value="keywords" className="border-none">
                    <AccordionTrigger className="py-3 text-xs font-bold text-muted-foreground hover:text-foreground hover:no-underline uppercase tracking-wider">
                      Keywords
                    </AccordionTrigger>
                    <AccordionContent>
                       <Command className="border rounded-md">
                          <CommandInput placeholder="Filter keywords..." value={keywordSearch} onValueChange={setKeywordSearch} className="h-8 text-xs" />
                          <CommandList className="max-h-[200px]">
                            <CommandEmpty>No keywords found.</CommandEmpty>
                            <CommandGroup>
                              {keywords.map(k => (
                                <CommandItem
                                  key={k}
                                  value={k}
                                  onSelect={() => toggleKeyword(k)}
                                  className="text-xs cursor-pointer"
                                >
                                  <div className={cn(
                                    "mr-2 flex h-3 w-3 items-center justify-center rounded-sm border border-primary",
                                    selectedKeywords.includes(k) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                  )}>
                                    <Check className={cn("h-3 w-3")} />
                                  </div>
                                  {k}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                       </Command>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              <Separator className="bg-border/50" />

              {/* Properties Filter - Clickable */}
              <div className="space-y-1">
                <Accordion type="single" collapsible defaultValue="properties" className="w-full">
                  <AccordionItem value="properties" className="border-none">
                    <AccordionTrigger className="py-3 text-xs font-bold text-muted-foreground hover:text-foreground hover:no-underline uppercase tracking-wider">
                      Properties
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-1 pb-2">
                         {[
                           { name: "has_thumbnail", label: "Has Thumbnail" },
                           { name: "has_spatial", label: "Has Spatial Info" },
                           { name: "has_temporal", label: "Has Temporal Info" },
                           { name: "is_downloadable", label: "Downloadable" }
                         ].map(prop => {
                           const isSelected = selectedProperties.includes(prop.name);
                           return (
                            <button 
                              key={prop.name} 
                              onClick={() => toggleProperty(prop.name)}
                              className={cn(
                                "w-full flex items-center justify-between py-1.5 px-2 text-sm rounded-md group transition-colors text-left",
                                isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-foreground/80"
                              )}
                            >
                              <span className="font-medium">{prop.label}</span>
                              {isSelected && <Check className="w-3 h-3" />}
                            </button>
                           )
                         })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              <Separator className="bg-border/50" />

              {/* Dynamic Voyager Facets */}
              {voyagerFacets.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-display font-bold text-foreground flex items-center gap-2 tracking-wide">
                    <Layers className="w-4 h-4 text-primary" /> Filters from API
                  </h3>
                  {voyagerFacets.map((category) => {
                    const isExpanded = expandedFacets[category.field] || false;
                    const selectedCount = selectedFacets[category.field]?.length || 0;

                    return (
                      <Collapsible
                        key={category.field}
                        open={isExpanded}
                        onOpenChange={() => toggleFacetExpanded(category.field)}
                      >
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-lg text-left group">
                          <span className="text-xs font-medium flex items-center gap-2">
                            {category.displayName}
                            {selectedCount > 0 && (
                              <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                                {selectedCount}
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground">
                              {category.values.length}
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pl-2 pt-1 pb-2">
                          <div className="space-y-0.5 max-h-40 overflow-y-auto pr-2">
                            {category.values.slice(0, 20).map((value) => {
                              const isSelected = isFacetValueSelected(category.field, value.name);
                              return (
                                <label
                                  key={`${category.field}-${value.name}`}
                                  className={cn(
                                    "flex items-center gap-2 text-xs cursor-pointer py-1 px-1.5 rounded transition-colors",
                                    isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                                  )}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => onFacetToggle?.(category.field, value.name)}
                                    className="h-3 w-3"
                                  />
                                  <span className="flex-1 truncate" title={value.name}>
                                    {value.name}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground tabular-nums">
                                    {value.count.toLocaleString()}
                                  </span>
                                </label>
                              );
                            })}
                            {category.values.length > 20 && (
                              <p className="text-[10px] text-muted-foreground pl-5 pt-1">
                                +{category.values.length - 20} more...
                              </p>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              )}

              {/* Static Platform section - fallback when no Voyager facets */}
              {voyagerFacets.length === 0 && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-display font-bold text-foreground flex items-center gap-2 tracking-wide mt-3">
                      <Layers className="w-4 h-4 text-primary" /> Platform
                    </h3>
                    <div className="space-y-2">
                      {['Sentinel-1', 'Sentinel-2', 'Landsat 8', 'Landsat 9', 'Terra', 'Aqua'].map(p => (
                        <div key={p} className="flex items-center space-x-2">
                          <Checkbox
                            id={`p-${p}`}
                            checked={selectedPlatforms.includes(p)}
                            onCheckedChange={() => togglePlatform(p)}
                          />
                          <Label
                            htmlFor={`p-${p}`}
                            className={cn(
                              "text-xs font-normal cursor-pointer",
                              selectedPlatforms.includes(p) ? "text-foreground" : "text-muted-foreground"
                            )}
                          >
                            {p}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator className="bg-border" />
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
