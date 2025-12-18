import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SatelliteItem, RelatedItem, ProvenanceEvent, SavedSearch } from "@shared/schema";

interface SearchFilters {
  keyword?: string;
  location?: string;
  locationIds?: string[];
  keywords?: string[];
  properties?: string[];
  dateFrom?: string;
  dateTo?: string;
  platform?: string;
  sortBy?: string;
  limit?: number;
  offset?: number;
}

// Fetch satellite items with filters
async function fetchSatelliteItems(filters: SearchFilters): Promise<SatelliteItem[]> {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, String(v)));
      } else {
        params.append(key, String(value));
      }
    }
  });

  const response = await fetch(`/api/satellite-items?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch satellite items');
  }
  return response.json();
}

// Fetch single satellite item
async function fetchSatelliteItem(id: number): Promise<SatelliteItem> {
  const response = await fetch(`/api/satellite-items/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch satellite item');
  }
  return response.json();
}

// Fetch related items
async function fetchRelatedItems(id: number): Promise<RelatedItem[]> {
  const response = await fetch(`/api/satellite-items/${id}/related`);
  if (!response.ok) {
    throw new Error('Failed to fetch related items');
  }
  return response.json();
}

// Fetch provenance events
async function fetchProvenanceEvents(id: number): Promise<ProvenanceEvent[]> {
  const response = await fetch(`/api/satellite-items/${id}/provenance`);
  if (!response.ok) {
    throw new Error('Failed to fetch provenance events');
  }
  return response.json();
}

// Fetch saved searches for a user (proxied through Express to forward cookies)
async function fetchSavedSearches(userId?: string): Promise<SavedSearch[]> {
  if (!userId) {
    return [];
  }

  const response = await fetch(`/api/saved-searches?userId=${encodeURIComponent(userId)}`, {
    credentials: 'include', // Send cookies to our Express server
  });

  if (!response.ok) {
    throw new Error('Failed to fetch saved searches');
  }

  return response.json();
}

// Delete saved search (proxied through Express to forward cookies)
async function deleteSavedSearch(id: string): Promise<void> {
  const response = await fetch(`/api/saved-searches/${id}`, {
    method: 'DELETE',
    credentials: 'include', // Send cookies to our Express server
  });
  if (!response.ok) {
    throw new Error('Failed to delete saved search');
  }
}

// Fetch single saved search by ID (proxied through Express to forward cookies)
async function fetchSavedSearchById(id: string): Promise<SavedSearch> {
  const response = await fetch(`/api/saved-searches/${id}`, {
    credentials: 'include', // Send cookies to our Express server
  });

  if (!response.ok) {
    throw new Error('Failed to fetch saved search');
  }

  return response.json();
}

// Create saved search (proxied through Express to forward cookies)
async function createSavedSearch(data: {
  userId?: string;
  name: string;
  keyword?: string;
  location?: string;
  locationIds?: string[];
  keywords?: string[];
  properties?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  spatialFilter?: any;
  notifyOnNewResults?: number;
}): Promise<SavedSearch> {
  const response = await fetch('/api/saved-searches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Send cookies to our Express server
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to save search';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch (e) {
      // If parsing fails, use default message
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// React Query Hooks

export function useSatelliteItems(filters: SearchFilters) {
  return useQuery({
    queryKey: ['satelliteItems', filters],
    queryFn: () => fetchSatelliteItems(filters),
  });
}

export function useSatelliteItem(id: number) {
  return useQuery({
    queryKey: ['satelliteItem', id],
    queryFn: () => fetchSatelliteItem(id),
    enabled: !!id,
  });
}

export function useRelatedItems(id: number) {
  return useQuery({
    queryKey: ['relatedItems', id],
    queryFn: () => fetchRelatedItems(id),
    enabled: !!id,
  });
}

export function useProvenanceEvents(id: number) {
  return useQuery({
    queryKey: ['provenanceEvents', id],
    queryFn: () => fetchProvenanceEvents(id),
    enabled: !!id,
  });
}

export function useSaveSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSavedSearch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedSearches'] });
    },
  });
}

export function useSavedSearches(userId?: string) {
  return useQuery({
    queryKey: ['savedSearches', userId || 'anonymous'],
    queryFn: () => fetchSavedSearches(userId),
    enabled: !!userId, // Only fetch when userId is available
    staleTime: 5 * 60 * 1000, // 5 minutes - don't refetch constantly
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
}

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSavedSearch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedSearches'] });
    },
  });
}

export function useLoadSavedSearch() {
  return useMutation({
    mutationFn: fetchSavedSearchById,
  });
}
