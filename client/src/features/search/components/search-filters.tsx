import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Globe, Check, ChevronRight, Tag } from "lucide-react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Folder, FolderOpen, File } from "lucide-react";
import { TreeNode } from "../types";
import { getCheckboxState, HIERARCHY_TREE } from "../location-hierarchy";

import type { FiltersConfig, FilterOption } from "@/hooks/useConfig";

// Date filter mode type
export type DateFilterMode = "range" | "since";
export type SinceUnit = "days" | "weeks" | "months" | "years";

// Re-export for backwards compatibility
export type DateFieldOption = FilterOption;

// Keyword grouping categories with common prefixes/patterns
const KEYWORD_GROUPS: { name: string; patterns: RegExp[]; keywords: string[] }[] = [
  {
    name: "Location & Geography",
    patterns: [/country|region|state|city|province|continent|geographic|location|place/i],
    keywords: ["country", "region", "state", "city", "province", "continent", "geographic", "location"]
  },
  {
    name: "Data Type & Format",
    patterns: [/raster|vector|image|map|layer|dataset|file|format|shapefile|geotiff|jpeg|png|kml|kmz|csv/i],
    keywords: ["raster", "vector", "image", "map", "layer", "dataset", "shapefile", "geotiff", "jpeg", "kml"]
  },
  {
    name: "Time & Date",
    patterns: [/year|month|date|time|temporal|period|season|annual|daily|weekly|monthly/i],
    keywords: ["year", "temporal", "period", "season", "annual", "daily"]
  },
  {
    name: "Environment & Nature",
    patterns: [/vegetation|forest|water|ocean|river|lake|climate|weather|environment|natural|land|soil|ecosystem/i],
    keywords: ["vegetation", "forest", "water", "ocean", "climate", "environment", "land", "soil"]
  },
  {
    name: "Infrastructure & Urban",
    patterns: [/urban|city|building|road|infrastructure|transport|construction|development/i],
    keywords: ["urban", "building", "road", "infrastructure", "transport"]
  },
  {
    name: "Agriculture & Land Use",
    patterns: [/agriculture|farm|crop|land use|cultivation|irrigation|harvest/i],
    keywords: ["agriculture", "farm", "crop", "land use", "cultivation"]
  },
  {
    name: "Satellite & Sensor",
    patterns: [/satellite|sensor|landsat|sentinel|modis|radar|sar|aerial|drone|lidar/i],
    keywords: ["satellite", "sensor", "landsat", "sentinel", "modis", "radar", "sar", "aerial"]
  },
  {
    name: "Analysis & Processing",
    patterns: [/analysis|processing|classification|detection|monitoring|assessment|evaluation/i],
    keywords: ["analysis", "classification", "detection", "monitoring", "assessment"]
  }
];

// Group keywords intelligently
export function groupKeywords(keywords: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  const ungrouped: string[] = [];
  const assigned = new Set<string>();

  // First pass: assign keywords to groups based on patterns
  keywords.forEach(kw => {
    const kwLower = kw.toLowerCase();
    let matched = false;

    for (const group of KEYWORD_GROUPS) {
      // Check patterns first
      if (group.patterns.some(pattern => pattern.test(kwLower))) {
        if (!groups.has(group.name)) {
          groups.set(group.name, []);
        }
        groups.get(group.name)!.push(kw);
        assigned.add(kw);
        matched = true;
        break;
      }

      // Check if keyword contains any group keywords
      if (group.keywords.some(gkw => kwLower.includes(gkw))) {
        if (!groups.has(group.name)) {
          groups.set(group.name, []);
        }
        groups.get(group.name)!.push(kw);
        assigned.add(kw);
        matched = true;
        break;
      }
    }

    if (!matched) {
      ungrouped.push(kw);
    }
  });

  // Add ungrouped keywords to "Other" category
  if (ungrouped.length > 0) {
    groups.set("Other", ungrouped);
  }

  // Sort groups by number of keywords (largest first)
  const sortedGroups = new Map([...groups.entries()].sort((a, b) => {
    // Keep "Other" at the end
    if (a[0] === "Other") return 1;
    if (b[0] === "Other") return -1;
    return b[1].length - a[1].length;
  }));

  return sortedGroups;
}

// Keyword group component
interface KeywordGroupProps {
  groupName: string;
  keywords: string[];
  selectedKeywords: string[];
  toggleKeyword: (kw: string) => void;
  keywordSearch: string;
}

function KeywordGroup({ groupName, keywords, selectedKeywords, toggleKeyword, keywordSearch }: KeywordGroupProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Filter keywords by search
  const filteredKeywords = keywords.filter(kw =>
    kw.toLowerCase().includes(keywordSearch.toLowerCase())
  );

  // Count selected in this group
  const selectedCount = filteredKeywords.filter(kw => selectedKeywords.includes(kw)).length;

  if (filteredKeywords.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors group">
        <div className="flex items-center gap-2">
          <ChevronRight className={cn("w-3 h-3 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
          <span className="text-xs font-medium">{groupName}</span>
        </div>
        <div className="flex items-center gap-1">
          {selectedCount > 0 && (
            <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-medium">
              {selectedCount}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">{filteredKeywords.length}</span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-5 space-y-0.5 py-1">
          {filteredKeywords.map(kw => {
            const isSelected = selectedKeywords.includes(kw);
            return (
              <button
                key={kw}
                onClick={() => toggleKeyword(kw)}
                className={cn(
                  "w-full flex items-center gap-2 py-1 px-2 text-xs rounded-md transition-colors text-left",
                  isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-foreground/80"
                )}
              >
                <div className={cn(
                  "flex h-3 w-3 items-center justify-center rounded-sm border",
                  isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"
                )}>
                  {isSelected && <Check className="h-2 w-2" />}
                </div>
                <span className="truncate flex-1">{kw}</span>
              </button>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Component that renders grouped keywords
interface GroupedKeywordsListProps {
  keywords: string[];
  selectedKeywords: string[];
  toggleKeyword: (kw: string) => void;
  keywordSearch: string;
}

function GroupedKeywordsList({ keywords, selectedKeywords, toggleKeyword, keywordSearch }: GroupedKeywordsListProps) {
  // Group keywords using the helper function
  const groupedKeywords = useMemo(() => groupKeywords(keywords), [keywords]);

  // Check if search is filtering results
  const hasSearchFilter = keywordSearch.length > 0;

  // If searching, show flat list instead of groups for easier scanning
  if (hasSearchFilter) {
    const filteredKeywords = keywords.filter(kw =>
      kw.toLowerCase().includes(keywordSearch.toLowerCase())
    );

    if (filteredKeywords.length === 0) {
      return (
        <div className="p-3 text-xs text-muted-foreground text-center">
          No keywords match "{keywordSearch}"
        </div>
      );
    }

    return (
      <div className="p-1 space-y-0.5">
        {filteredKeywords.slice(0, 50).map(kw => {
          const isSelected = selectedKeywords.includes(kw);
          return (
            <button
              key={kw}
              onClick={() => toggleKeyword(kw)}
              className={cn(
                "w-full flex items-center gap-2 py-1 px-2 text-xs rounded-md transition-colors text-left",
                isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-foreground/80"
              )}
            >
              <div className={cn(
                "flex h-3 w-3 items-center justify-center rounded-sm border",
                isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"
              )}>
                {isSelected && <Check className="h-2 w-2" />}
              </div>
              <span className="truncate flex-1">{kw}</span>
            </button>
          );
        })}
        {filteredKeywords.length > 50 && (
          <div className="p-2 text-[10px] text-muted-foreground text-center">
            Showing 50 of {filteredKeywords.length} matches
          </div>
        )}
      </div>
    );
  }

  // Show grouped view
  return (
    <div className="p-1">
      {Array.from(groupedKeywords.entries()).map(([groupName, groupKeywords]) => (
        <KeywordGroup
          key={groupName}
          groupName={groupName}
          keywords={groupKeywords}
          selectedKeywords={selectedKeywords}
          toggleKeyword={toggleKeyword}
          keywordSearch={keywordSearch}
        />
      ))}
    </div>
  );
}

// --- FolderTree Component ---
const FolderTree = ({ nodes, level = 0, onSelect, selectedIds = [], topLevelIds = [] }: { nodes: TreeNode[], level?: number, onSelect?: (id: string, label: string) => void, selectedIds?: string[], topLevelIds?: string[] }) => {
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
        const checkboxState = getCheckboxState(node.id, selectedIds, HIERARCHY_TREE);
        const isTopLevel = topLevelIds.includes(node.id);

        return (
          <div key={node.id}>
            <div
              className={cn(
                "flex items-center py-1.5 px-2 rounded-md group transition-colors cursor-pointer select-none",
                isTopLevel ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
              )}
              style={{ paddingLeft: `${level * 16 + 8}px` }}
              onClick={() => hasChildren && toggleExpand(node.id)}
            >
              <div className={cn("mr-2 transition-colors", isTopLevel ? "text-primary" : "text-muted-foreground/70 group-hover:text-primary")}>
                {hasChildren ? (
                  isExpanded ? <FolderOpen className="w-3.5 h-3.5" /> : <Folder className="w-3.5 h-3.5" />
                ) : (
                  <File className="w-3.5 h-3.5 opacity-50" />
                )}
              </div>

              <span className={cn("text-xs font-medium flex-1 truncate", isTopLevel ? "text-primary" : "text-foreground/90")}>
                {node.label}
              </span>

              <Checkbox
                id={`tree-check-${node.id}`}
                checked={checkboxState}
                className={cn(
                  "w-3.5 h-3.5 ml-2 border-muted-foreground/40 group-hover:border-primary/60",
                  checkboxState === true ? "data-[state=checked]:bg-primary border-primary" : ""
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
                <FolderTree nodes={node.children!} level={level + 1} onSelect={onSelect} selectedIds={selectedIds} topLevelIds={topLevelIds} />
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
  // Full filter configuration from backend
  filtersConfig: FiltersConfig;
  // Date filter state
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  dateFilterMode: DateFilterMode;
  setDateFilterMode: (mode: DateFilterMode) => void;
  sinceValue: number;
  setSinceValue: (value: number) => void;
  sinceUnit: SinceUnit;
  setSinceUnit: (unit: SinceUnit) => void;
  dateField: string;
  setDateField: (field: string) => void;
  // Location filter state
  hierarchyTree: TreeNode[];
  handleLocationFilterSelect: (id: string, label: string) => void;
  selectedLocationIds: string[];
  topLevelSelectionIds: string[];
  // Keywords filter state
  keywords: string[];
  keywordSearch: string;
  setKeywordSearch: (val: string) => void;
  toggleKeyword: (kw: string) => void;
  selectedKeywords: string[];
  // Properties filter state
  selectedProperties: string[];
  toggleProperty: (prop: string) => void;
}

export function SearchFilters({
  showFacets,
  filtersConfig,
  date,
  setDate,
  dateFilterMode,
  setDateFilterMode,
  sinceValue,
  setSinceValue,
  sinceUnit,
  setSinceUnit,
  dateField,
  setDateField,
  hierarchyTree,
  handleLocationFilterSelect,
  selectedLocationIds,
  topLevelSelectionIds,
  keywords,
  keywordSearch,
  setKeywordSearch,
  toggleKeyword,
  selectedKeywords,
  selectedProperties,
  toggleProperty,
}: SearchFiltersProps) {
  // Extract config for each filter
  const dateConfig = filtersConfig.date;
  const locationConfig = filtersConfig.location;
  const keywordsConfig = filtersConfig.keywords;
  const propertiesConfig = filtersConfig.properties;
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
              {/* Date Filter - conditionally rendered based on config */}
              {dateConfig.enabled && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-display font-bold text-foreground flex items-center gap-2 tracking-wide">
                      <CalendarIcon className="w-4 h-4 text-primary" /> {dateConfig.label}
                    </h3>

                    <RadioGroup
                      value={dateFilterMode}
                      onValueChange={(value) => setDateFilterMode(value as DateFilterMode)}
                      className="space-y-3"
                    >
                      {/* Range Option - shown if enabled in config */}
                      {dateConfig.modes.range && (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="range" id="date-range" />
                            <Label htmlFor="date-range" className="text-xs font-medium cursor-pointer">Range</Label>
                          </div>

                          {dateFilterMode === "range" && (
                            <div className="pl-6 space-y-2">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">start</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full justify-start text-left font-normal text-xs h-8",
                                        !date?.from && "text-muted-foreground"
                                      )}
                                    >
                                      {date?.from ? format(date.from, "yyyy-MM-dd") : "yyyy-mm-dd"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={date?.from}
                                      onSelect={(day) => setDate({ from: day, to: date?.to })}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">end</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full justify-start text-left font-normal text-xs h-8",
                                        !date?.to && "text-muted-foreground"
                                      )}
                                    >
                                      {date?.to ? format(date.to, "yyyy-MM-dd") : "yyyy-mm-dd"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={date?.to}
                                      onSelect={(day) => setDate({ from: date?.from, to: day })}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Since Option - shown if enabled in config */}
                      {dateConfig.modes.since && (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="since" id="date-since" />
                            <Label htmlFor="date-since" className="text-xs font-medium cursor-pointer">Since</Label>
                          </div>

                          {dateFilterMode === "since" && (
                            <div className="pl-6 flex items-center gap-2">
                              <Input
                                type="number"
                                min={1}
                                value={sinceValue}
                                onChange={(e) => setSinceValue(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-20 h-8 text-xs"
                              />
                              <Select value={sinceUnit} onValueChange={(value) => setSinceUnit(value as SinceUnit)}>
                                <SelectTrigger className="w-24 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="days">Days</SelectItem>
                                  <SelectItem value="weeks">Weeks</SelectItem>
                                  <SelectItem value="months">Months</SelectItem>
                                  <SelectItem value="years">Years</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      )}
                    </RadioGroup>

                    {/* Date Field Selector - shown if configured */}
                    {dateConfig.fields.showFieldSelector && dateConfig.fields.options.length > 1 && (
                      <div className="pt-3 border-t border-border/30">
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Filter by</Label>
                        <Select value={dateField} onValueChange={setDateField}>
                          <SelectTrigger className="w-full h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {dateConfig.fields.options.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex flex-col">
                                  <span>{option.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {dateConfig.fields.options.find(o => o.value === dateField)?.description}
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator className="bg-border/50" />
                </>
              )}

              {/* Location Hierarchy Filter - conditionally rendered based on config */}
              {locationConfig.enabled && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-display font-bold text-foreground flex items-center gap-2 tracking-wide">
                      <Globe className="w-4 h-4 text-primary" /> {locationConfig.label}
                    </h3>
                    <div
                      className="border border-border/60 rounded-lg bg-muted/10 p-2 overflow-y-auto"
                      style={{ maxHeight: `${locationConfig.maxHeight}px` }}
                    >
                      <FolderTree nodes={hierarchyTree} onSelect={handleLocationFilterSelect} selectedIds={selectedLocationIds} topLevelIds={topLevelSelectionIds} />
                    </div>
                  </div>

                  <Separator className="bg-border/50" />
                </>
              )}

              {/* Keywords Filter - conditionally rendered based on config */}
              {keywordsConfig.enabled && (
                <>
                  <div className="space-y-1">
                    <Accordion type="single" collapsible defaultValue={keywordsConfig.defaultExpanded ? "keywords" : undefined} className="w-full">
                      <AccordionItem value="keywords" className="border-none">
                        <AccordionTrigger className="py-3 text-xs font-bold text-muted-foreground hover:text-foreground hover:no-underline uppercase tracking-wider">
                          <div className="flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5" />
                            {keywordsConfig.label}
                            {keywords.length > 0 && (
                              <span className="text-[10px] font-normal text-muted-foreground">({keywords.length})</span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-1">
                            {/* Search input - shown if enabled in config */}
                            {keywordsConfig.showSearch && (
                              <div className="relative mb-2">
                                <input
                                  type="text"
                                  placeholder="Filter keywords..."
                                  value={keywordSearch}
                                  onChange={(e) => setKeywordSearch(e.target.value)}
                                  className="w-full h-8 px-3 text-xs bg-muted/50 border border-border rounded-md outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                                />
                              </div>
                            )}

                            {/* Grouped keywords */}
                            <div
                              className="border border-border/60 rounded-lg bg-muted/10 overflow-y-auto"
                              style={{ maxHeight: `${keywordsConfig.maxHeight}px` }}
                            >
                              {keywords.length === 0 ? (
                                <div className="p-3 text-xs text-muted-foreground text-center">
                                  No keywords available
                                </div>
                              ) : (
                                <GroupedKeywordsList
                                  keywords={keywords}
                                  selectedKeywords={selectedKeywords}
                                  toggleKeyword={toggleKeyword}
                                  keywordSearch={keywordSearch}
                                />
                              )}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>

                  <Separator className="bg-border/50" />
                </>
              )}

              {/* Properties Filter - conditionally rendered based on config */}
              {propertiesConfig.enabled && (
                <>
                  <div className="space-y-1">
                    <Accordion type="single" collapsible defaultValue={propertiesConfig.defaultExpanded ? "properties" : undefined} className="w-full">
                      <AccordionItem value="properties" className="border-none">
                        <AccordionTrigger className="py-3 text-xs font-bold text-muted-foreground hover:text-foreground hover:no-underline uppercase tracking-wider">
                          {propertiesConfig.label}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-1 pb-2">
                             {propertiesConfig.options.map(prop => {
                               const isSelected = selectedProperties.includes(prop.value);
                               return (
                                <button
                                  key={prop.value}
                                  onClick={() => toggleProperty(prop.value)}
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

                  <Separator className="bg-border" />
                </>
              )}
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
