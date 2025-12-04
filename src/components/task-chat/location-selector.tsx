'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Search, Map } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { MapLocation } from './marine-map';

// Dynamically import MarineMap to avoid SSR and multiple initialization issues
const MarineMap = dynamic(() => import('./marine-map').then(mod => ({ default: mod.MarineMap })), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-lg border border-border overflow-hidden" style={{ height: '400px' }}>
      <div className="flex items-center justify-center h-full bg-muted/50">
        <div className="text-muted-foreground">Loading map...</div>
      </div>
    </div>
  ),
});

// Common sailing ports/destinations for autocomplete
const COMMON_PORTS = [
  { name: "Bridgetown, Barbados", lat: 13.0975, lng: -59.6167, country: "Barbados" },
  { name: "Funchal, Madeira", lat: 32.6333, lng: -16.9000, country: "Portugal" },
  { name: "Las Palmas, Canary Islands", lat: 28.1248, lng: -15.4300, country: "Spain" },
  { name: "Mindelo, Cape Verde", lat: 16.8900, lng: -25.0000, country: "Cape Verde" },
  { name: "Lisbon, Portugal", lat: 38.7223, lng: -9.1393, country: "Portugal" },
  { name: "Casablanca, Morocco", lat: 33.5731, lng: -7.5898, country: "Morocco" },
  { name: "Dakar, Senegal", lat: 14.7167, lng: -17.4672, country: "Senegal" },
  { name: "Gran Canaria, Spain", lat: 28.1248, lng: -15.4300, country: "Spain" },
  { name: "Tenerife, Spain", lat: 28.4636, lng: -16.2518, country: "Spain" },
  { name: "Gibraltar", lat: 36.1408, lng: -5.3536, country: "Gibraltar" },
  { name: "Miami, Florida", lat: 25.7617, lng: -80.1918, country: "USA" },
  { name: "New York, New York", lat: 40.7128, lng: -74.0060, country: "USA" },
  { name: "Annapolis, Maryland", lat: 38.9784, lng: -76.4922, country: "USA" },
  { name: "Newport, Rhode Island", lat: 41.4901, lng: -71.3128, country: "USA" },
  { name: "Charleston, South Carolina", lat: 32.7765, lng: -79.9311, country: "USA" },
  { name: "Bermuda", lat: 32.3078, lng: -64.7505, country: "Bermuda" },
  { name: "Azores, Portugal", lat: 37.7412, lng: -25.6756, country: "Portugal" },
  { name: "Brest, France", lat: 48.3904, lng: -4.4861, country: "France" },
  { name: "Southampton, UK", lat: 50.9097, lng: -1.4044, country: "UK" },
  { name: "Cork, Ireland", lat: 51.8985, lng: -8.4756, country: "Ireland" },
];

export interface Location {
  name: string;
  lat: number;
  lng: number;
  country?: string;
}

interface LocationSelectorProps {
  type: 'departure' | 'destination';
  onSelect: (location: Location) => void;
  isSubmitting?: boolean;
}

export function LocationSelector({ type, onSelect, isSubmitting }: LocationSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [useMap, setUseMap] = useState(false);
  const [mapLocation, setMapLocation] = useState<MapLocation | null>(null);

  const filteredPorts = COMMON_PORTS.filter((port) =>
    port.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    port.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (port: typeof COMMON_PORTS[0]) => {
    const location: Location = {
      name: port.name,
      lat: port.lat,
      lng: port.lng,
      country: port.country,
    };
    setSelectedLocation(location);
    setShowSuggestions(false);
    setMapLocation(location);
  };

  const handleMapLocationSelect = (location: MapLocation) => {
    const loc: Location = {
      name: location.name,
      lat: location.lat,
      lng: location.lng,
      country: location.country,
    };
    setSelectedLocation(loc);
    setMapLocation(location);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLocation) {
      onSelect(selectedLocation);
    }
  };

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    setShowSuggestions(true);
    if (!value) {
      setSelectedLocation(null);
    }
  };

  return (
    <Card className="border-primary/10 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Select {type === 'departure' ? 'Departure' : 'Destination'} Port
        </CardTitle>
        <CardDescription>
          {type === 'departure' 
            ? 'Where will your journey begin?'
            : 'Where are you heading?'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Toggle between search and map */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={!useMap ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUseMap(false)}
              className="flex-1"
            >
              <Search className="h-4 w-4 mr-2" />
              Search Ports
            </Button>
            <Button
              type="button"
              variant={useMap ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUseMap(true)}
              className="flex-1"
            >
              <Map className="h-4 w-4 mr-2" />
              Use Map
            </Button>
          </div>

          {!useMap ? (
            <>
              <div className="relative">
                <Label htmlFor="location-search" className="sr-only">
                  Search for a port
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="location-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder={`Search for ${type === 'departure' ? 'departure' : 'destination'} port...`}
                    className="pl-9"
                  />
                </div>
                {showSuggestions && filteredPorts.length > 0 && searchQuery && (
                  <div className="absolute z-10 w-full mt-2 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredPorts.map((port, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelect(port)}
                        className="w-full text-left px-4 py-3 hover:bg-muted focus:outline-none first:rounded-t-lg last:rounded-b-lg border-b border-border/50 last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-foreground">{port.name}</div>
                        <div className="text-sm text-muted-foreground">{port.country}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="w-full">
              <MarineMap
                onLocationSelect={handleMapLocationSelect}
                initialLocation={mapLocation || undefined}
                mode="select"
                height="400px"
              />
            </div>
          )}

          {selectedLocation && (
            <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <div className="flex-1">
                  <div className="font-medium text-foreground">{selectedLocation.name}</div>
                  {selectedLocation.country && (
                    <div className="text-sm text-muted-foreground">{selectedLocation.country}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={!selectedLocation || isSubmitting}
          >
            {isSubmitting ? 'Confirming...' : `Confirm ${type === 'departure' ? 'Departure' : 'Destination'}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

