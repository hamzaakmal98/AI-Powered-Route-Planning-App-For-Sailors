'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, X, Search, Loader2, Trash2, Edit2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

// Lazy load Leaflet components to avoid SSR issues
// These will be loaded only on the client side
const loadLeaflet = async () => {
  if (typeof window === 'undefined') return null;
  
  const [reactLeaflet, leaflet] = await Promise.all([
    import('react-leaflet'),
    import('leaflet')
  ]);
  
  // Import CSS
  await import('leaflet/dist/leaflet.css');
  
  const L = leaflet.default;
  
  // Fix default marker icon issue with webpack/Next.js
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
  
  return {
    MapContainer: reactLeaflet.MapContainer,
    TileLayer: reactLeaflet.TileLayer,
    Marker: reactLeaflet.Marker,
    Popup: reactLeaflet.Popup,
    Polyline: reactLeaflet.Polyline,
    useMapEvents: reactLeaflet.useMapEvents,
    useMap: reactLeaflet.useMap,
  };
};

// Export MapLocation interface for use in other components
export interface MapLocation {
  id?: string; // Waypoint ID from database
  name: string;
  lat: number;
  lng: number;
  country?: string;
}

interface MarineMapProps {
  onLocationSelect?: (location: MapLocation) => void;
  onWaypointAdd?: (waypoint: MapLocation) => void;
  onWaypointUpdate?: (index: number, waypoint: MapLocation) => void;
  onWaypointDelete?: (index: number) => void;
  initialLocation?: MapLocation | null;
  waypoints?: MapLocation[];
  route?: MapLocation[]; // Array of locations forming a route
  mode?: 'select' | 'waypoint' | 'route' | 'edit'; // select: single location, waypoint: add waypoints, route: view route, edit: edit waypoints
  height?: string;
  showSearch?: boolean;
  departure?: MapLocation;
  destination?: MapLocation;
  editable?: boolean; // Allow editing waypoints even in route mode
}

// Component to update map view when location changes
function MapViewUpdater({ center, zoom, useMap }: { center: [number, number]; zoom: number; useMap: any }) {
  if (!useMap) return null;
  const map = useMap();
  
  useEffect(() => {
    if (map) {
      map.setView(center, zoom);
    }
  }, [map, center, zoom]);
  
  return null;
}

// Component to handle map clicks
function MapClickHandler({ 
  onLocationSelect, 
  onWaypointAdd, 
  mode,
  useMapEvents
}: { 
  onLocationSelect?: (location: MapLocation) => void;
  onWaypointAdd?: (waypoint: MapLocation) => void;
  mode?: 'select' | 'waypoint' | 'route' | 'edit';
  useMapEvents: any;
}) {
  if (!useMapEvents) return null;
  
  useMapEvents({
    click: (e: any) => {
      const { lat, lng } = e.latlng;
      
      if (mode === 'select' && onLocationSelect) {
        onLocationSelect({
          name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          lat,
          lng,
        });
      } else if ((mode === 'waypoint' || mode === 'edit') && onWaypointAdd) {
        onWaypointAdd({
          name: `Waypoint ${Date.now()}`,
          lat,
          lng,
        });
      }
    },
  });

  return null;
}

// Draggable waypoint marker component
function DraggableWaypointMarker({
  waypoint,
  index,
  onDragEnd,
  onNameUpdate,
  onDelete,
  editable,
  Marker: MarkerComp,
  Popup: PopupComp,
}: {
  waypoint: MapLocation;
  index: number;
  onDragEnd: (lat: number, lng: number) => void;
  onNameUpdate?: (name: string) => void;
  onDelete: () => void;
  editable: boolean;
  Marker: any;
  Popup: any;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(waypoint.name);
  const markerRef = useRef<any>(null);

  // Update edited name when waypoint changes
  useEffect(() => {
    setEditedName(waypoint.name);
  }, [waypoint.name]);

  const eventHandlers = useMemo(
    () => ({
      dragstart: () => {
        setIsDragging(true);
      },
      dragend: () => {
        setIsDragging(false);
        const marker = markerRef.current;
        if (marker) {
          const latlng = marker.getLatLng();
          onDragEnd(latlng.lat, latlng.lng);
        }
      },
    }),
    [onDragEnd]
  );

  if (!MarkerComp || !PopupComp) return null;

  return (
    <MarkerComp
      draggable={editable}
      position={[waypoint.lat, waypoint.lng]}
      eventHandlers={eventHandlers}
      ref={markerRef}
    >
      <PopupComp>
        <div className="text-sm min-w-[200px]">
          {isEditing ? (
            <div className="space-y-2">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Waypoint name"
                className="text-xs"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => {
                    if (editedName.trim() && editedName !== waypoint.name && onNameUpdate) {
                      onNameUpdate(editedName);
                    }
                    setIsEditing(false);
                  }}
                  className="text-xs h-7"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditedName(waypoint.name);
                    setIsEditing(false);
                  }}
                  className="text-xs h-7"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="font-semibold">{waypoint.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Waypoint {index + 1}
              </div>
              <div className="text-xs text-muted-foreground">
                {waypoint.lat.toFixed(4)}, {waypoint.lng.toFixed(4)}
              </div>
              {editable && (
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    className="text-xs h-7"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onDelete}
                    className="text-xs h-7 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </PopupComp>
    </MarkerComp>
  );
}

// Internal component implementation
function LeafletMapInternal({
  onLocationSelect,
  onWaypointAdd,
  onWaypointUpdate,
  onWaypointDelete,
  initialLocation,
  waypoints = [],
  route = [],
  mode = 'select',
  height = '500px',
  showSearch = false,
  departure,
  destination,
  editable = false,
}: MarineMapProps) {
  const [leafletComponents, setLeafletComponents] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(initialLocation || null);
  const [useNauticalCharts, setUseNauticalCharts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MapLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Load Leaflet components on client side only
  useEffect(() => {
    loadLeaflet().then(components => {
      if (components) {
        setLeafletComponents(components);
      }
    });
  }, []);
  
  // Use lazy initializer to avoid calling Math.random during render
  const mapIdRef = useRef<string | null>(null);
  if (mapIdRef.current === null) {
    mapIdRef.current = `map-${Math.random().toString(36).substring(7)}`;
  }

  // Calculate map center and zoom - memoized to prevent unnecessary recalculations
  const { mapCenter, mapZoom } = useMemo(() => {
    if (initialLocation) {
      return { mapCenter: [initialLocation.lat, initialLocation.lng] as [number, number], mapZoom: 10 };
    } else if (route.length > 0) {
      // Center on route
      const avgLat = route.reduce((sum, loc) => sum + loc.lat, 0) / route.length;
      const avgLng = route.reduce((sum, loc) => sum + loc.lng, 0) / route.length;
      return { mapCenter: [avgLat, avgLng] as [number, number], mapZoom: 6 };
    } else if (departure && destination) {
      // Center between departure and destination
      const avgLat = (departure.lat + destination.lat) / 2;
      const avgLng = (departure.lng + destination.lng) / 2;
      return { mapCenter: [avgLat, avgLng] as [number, number], mapZoom: 5 };
    } else {
      // Default to Atlantic Ocean center (common sailing area)
      return { mapCenter: [25, -30] as [number, number], mapZoom: 3 };
    }
  }, [initialLocation, route, departure, destination]);

  // Update selected location when initialLocation changes
  useEffect(() => {
    if (initialLocation) {
      setSelectedLocation(initialLocation);
    }
  }, [initialLocation]);

  const handleLocationSelect = (location: MapLocation) => {
    setSelectedLocation(location);
    if (onLocationSelect) {
      onLocationSelect(location);
    }
  };

  const handleWaypointAdd = (waypoint: MapLocation) => {
    if (onWaypointAdd) {
      onWaypointAdd(waypoint);
    }
  };

  const handleWaypointDrag = useCallback((index: number, lat: number, lng: number) => {
    if (onWaypointUpdate && waypoints[index]) {
      onWaypointUpdate(index, {
        ...waypoints[index],
        lat,
        lng,
      });
    }
  }, [onWaypointUpdate, waypoints]);

  const handleWaypointNameUpdate = useCallback((index: number, name: string) => {
    if (onWaypointUpdate && waypoints[index]) {
      onWaypointUpdate(index, {
        ...waypoints[index],
        name,
      });
    }
  }, [onWaypointUpdate, waypoints]);

  const handleWaypointDelete = useCallback((index: number) => {
    if (onWaypointDelete) {
      onWaypointDelete(index);
    }
  }, [onWaypointDelete]);

  // Geocoding search using Nominatim (OpenStreetMap)
  const searchLocation = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'KnotReady/1.0', // Required by Nominatim
          },
        }
      );
      
      if (!response.ok) {
        toast.error('Search failed', {
          description: 'Unable to search for locations. Please try again.',
        });
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      const data = await response.json();
      const results: MapLocation[] = data.map((item: any) => ({
        name: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        country: item.address?.country || item.address?.country_code?.toUpperCase(),
      }));

      setSearchResults(results);
      setShowSearchResults(true);
      
      if (results.length === 0) {
        toast.info('No results found', {
          description: 'Try a different search term.',
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('Search error', {
        description: 'An error occurred while searching. Please try again.',
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle search input change with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchLocation(searchQuery);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchLocation]);

  // Handle search result selection
  const handleSearchResultSelect = (result: MapLocation) => {
    setSelectedLocation(result);
    setSearchQuery(result.name);
    setShowSearchResults(false);
    if (onLocationSelect) {
      onLocationSelect(result);
    }
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.search-container')) {
        setShowSearchResults(false);
      }
    };

    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSearchResults]);

  // Create route points array (departure + waypoints + destination)
  const routePoints: [number, number][] = [];
  if (departure) routePoints.push([departure.lat, departure.lng]);
  waypoints.forEach(wp => routePoints.push([wp.lat, wp.lng]));
  if (destination) routePoints.push([destination.lat, destination.lng]);
  
  if (route.length > 0) {
    routePoints.length = 0;
    route.forEach(loc => routePoints.push([loc.lat, loc.lng]));
  }

  // OpenSeaMap tile URL (free nautical charts)
  const nauticalTileUrl = 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png';
  // OpenStreetMap tile URL (fallback)
  const osmTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  // Calculate search result view center
  const searchViewCenter = useMemo(() => {
    if (selectedLocation && searchResults.length > 0) {
      return [selectedLocation.lat, selectedLocation.lng] as [number, number];
    }
    return null;
  }, [selectedLocation, searchResults]);

  // Destructure components for easier use
  const {
    MapContainer: MapContainerComp,
    TileLayer: TileLayerComp,
    Marker: MarkerComp,
    Popup: PopupComp,
    Polyline: PolylineComp,
    useMap: useMapHook,
    useMapEvents: useMapEventsHook,
  } = leafletComponents || {};

  return (
    <div className="w-full">
      {/* Search bar */}
      {(showSearch || mode === 'select') && (
        <div className="mb-2 relative search-container">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) {
                  setShowSearchResults(true);
                }
              }}
              placeholder="Search for a location..."
              className="pl-9 pr-9"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
            )}
          </div>
          
          {/* Search results dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSearchResultSelect(result)}
                  className="w-full text-left px-4 py-3 hover:bg-muted focus:outline-none first:rounded-t-lg last:rounded-b-lg border-b border-border/50 last:border-b-0 transition-colors"
                >
                  <div className="font-medium text-foreground text-sm">{result.name}</div>
                  {result.country && (
                    <div className="text-xs text-muted-foreground mt-0.5">{result.country}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {mode === 'select' && 'Click on the map or search to select a location'}
            {mode === 'waypoint' && 'Click on the map to add waypoints'}
            {mode === 'route' && editable && 'Drag waypoints to modify, click to edit or delete'}
            {mode === 'route' && !editable && 'View your planned route'}
            {mode === 'edit' && 'Drag waypoints to modify, click to edit or delete'}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setUseNauticalCharts(!useNauticalCharts)}
          className="text-xs"
        >
          {useNauticalCharts ? 'Show Standard Map' : 'Show Nautical Charts'}
        </Button>
      </div>
      
      <div className="relative rounded-lg border border-border overflow-hidden" style={{ height }}>
        {!leafletComponents || !MapContainerComp ? (
          <div className="flex items-center justify-center h-full bg-muted/50">
            <div className="text-muted-foreground">Loading map...</div>
          </div>
        ) : (
          <MapContainerComp
            key={mapIdRef.current}
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
          {/* Base map layer - OpenStreetMap */}
          <TileLayerComp
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url={osmTileUrl}
            opacity={useNauticalCharts ? 0.7 : 1}
          />
          
          {/* Nautical charts overlay (OpenSeaMap) */}
          {useNauticalCharts && (
            <TileLayerComp
              attribution='&copy; <a href="https://www.openseamap.org">OpenSeaMap</a> contributors'
              url={nauticalTileUrl}
              opacity={0.8}
            />
          )}

          {/* Map view updater for search results */}
          {searchViewCenter && (
            <MapViewUpdater center={searchViewCenter} zoom={12} useMap={useMapHook} />
          )}

          {/* Map click handler */}
          <MapClickHandler
            onLocationSelect={handleLocationSelect}
            onWaypointAdd={handleWaypointAdd}
            mode={mode}
            useMapEvents={useMapEventsHook}
          />

          {/* Departure marker */}
          {departure && (
            <MarkerComp position={[departure.lat, departure.lng]}>
              <PopupComp>
                <div className="text-sm">
                  <div className="font-semibold">Departure: {departure.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {departure.lat.toFixed(4)}, {departure.lng.toFixed(4)}
                  </div>
                </div>
              </PopupComp>
            </MarkerComp>
          )}

          {/* Destination marker */}
          {destination && (
            <MarkerComp position={[destination.lat, destination.lng]}>
              <PopupComp>
                <div className="text-sm">
                  <div className="font-semibold">Destination: {destination.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
                  </div>
                </div>
              </PopupComp>
            </MarkerComp>
          )}

          {/* Selected location marker */}
          {selectedLocation && !departure && !destination && (
            <MarkerComp position={[selectedLocation.lat, selectedLocation.lng]}>
              <PopupComp>
                <div className="text-sm">
                  <div className="font-semibold">{selectedLocation.name}</div>
                  {selectedLocation.country && (
                    <div className="text-muted-foreground">{selectedLocation.country}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                  </div>
                </div>
              </PopupComp>
            </MarkerComp>
          )}

          {/* Waypoint markers - draggable if editable */}
          {waypoints.map((waypoint, index) => {
            const isEditable = editable || mode === 'edit' || mode === 'waypoint';
            if (isEditable) {
              return (
                <DraggableWaypointMarker
                  key={`waypoint-${index}`}
                  waypoint={waypoint}
                  index={index}
                  onDragEnd={(lat, lng) => handleWaypointDrag(index, lat, lng)}
                  onNameUpdate={(name) => handleWaypointNameUpdate(index, name)}
                  onDelete={() => handleWaypointDelete(index)}
                  editable={isEditable}
                  Marker={MarkerComp}
                  Popup={PopupComp}
                />
              );
            }
            return (
              <MarkerComp key={`waypoint-${index}`} position={[waypoint.lat, waypoint.lng]}>
                <PopupComp>
                  <div className="text-sm">
                    <div className="font-semibold">{waypoint.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Waypoint {index + 1}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {waypoint.lat.toFixed(4)}, {waypoint.lng.toFixed(4)}
                    </div>
                  </div>
                </PopupComp>
              </MarkerComp>
            );
          })}

          {/* Route polyline */}
          {routePoints.length > 1 && (
            <PolylineComp
              positions={routePoints}
              color="#3b82f6"
              weight={3}
              opacity={0.7}
            />
          )}
        </MapContainerComp>
        )}
      </div>

      {/* Selected location info */}
      {selectedLocation && mode === 'select' && (
        <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-foreground">{selectedLocation.name}</div>
              {selectedLocation.country && (
                <div className="text-sm text-muted-foreground">{selectedLocation.country}</div>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                Coordinates: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedLocation(null);
                if (onLocationSelect) {
                  onLocationSelect({ name: '', lat: 0, lng: 0 });
                }
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Waypoints list */}
      {waypoints.length > 0 && (mode === 'waypoint' || mode === 'edit' || (mode === 'route' && editable)) && (
        <div className="mt-3 space-y-2">
          <div className="text-sm font-semibold text-foreground">Waypoints ({waypoints.length})</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {waypoints.map((waypoint, index) => {
              const isEditable = editable || mode === 'edit' || mode === 'waypoint';
              return (
                <div
                  key={`waypoint-list-${index}`}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded border border-border/50 text-sm"
                >
                  <div className="flex items-center gap-2 flex-1">
                    {isEditable && (
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{waypoint.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {waypoint.lat.toFixed(4)}, {waypoint.lng.toFixed(4)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isEditable && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleWaypointDelete(index)}
                        className="h-6 w-6 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                    <Navigation className="h-4 w-4 text-primary" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Export the component - it's already marked 'use client' so SSR is handled
// Consumers can still use dynamic import if they want loading states
export function MarineMap(props: MarineMapProps) {
  return <LeafletMapInternal {...props} />;
}
