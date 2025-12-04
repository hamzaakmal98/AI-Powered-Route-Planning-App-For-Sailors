'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Navigation, Plus, Trash2 } from 'lucide-react';
import { MarineMap, MapLocation } from './marine-map';

export interface Waypoint extends MapLocation {
  id?: string;
  sequence?: number;
  notes?: string;
}

interface WaypointPlannerProps {
  departure?: MapLocation | null;
  destination?: MapLocation | null;
  existingWaypoints?: Waypoint[];
  onWaypointsChange?: (waypoints: Waypoint[]) => void;
  onSave?: (waypoints: Waypoint[]) => void;
  isSubmitting?: boolean;
}

export function WaypointPlanner({
  departure,
  destination,
  existingWaypoints = [],
  onWaypointsChange,
  onSave,
  isSubmitting,
}: WaypointPlannerProps) {
  const [waypoints, setWaypoints] = useState<Waypoint[]>(existingWaypoints);
  const [waypointName, setWaypointName] = useState('');
  const [selectedWaypoint, setSelectedWaypoint] = useState<Waypoint | null>(null);

  useEffect(() => {
    setWaypoints(existingWaypoints);
  }, [existingWaypoints]);

  const handleWaypointAdd = (location: MapLocation) => {
    const newWaypoint: Waypoint = {
      ...location,
      id: `wp-${Date.now()}`,
      sequence: waypoints.length + 1,
      name: waypointName || `Waypoint ${waypoints.length + 1}`,
    };
    const updatedWaypoints = [...waypoints, newWaypoint];
    setWaypoints(updatedWaypoints);
    setWaypointName('');
    if (onWaypointsChange) {
      onWaypointsChange(updatedWaypoints);
    }
  };

  const handleWaypointRemove = (waypointId: string) => {
    const updatedWaypoints = waypoints.filter(wp => wp.id !== waypointId);
    // Re-sequence waypoints
    const resequenced = updatedWaypoints.map((wp, index) => ({
      ...wp,
      sequence: index + 1,
    }));
    setWaypoints(resequenced);
    if (onWaypointsChange) {
      onWaypointsChange(resequenced);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(waypoints);
    }
  };

  // Build route array: departure -> waypoints -> destination
  const route: MapLocation[] = [];
  if (departure) route.push(departure);
  route.push(...waypoints);
  if (destination) route.push(destination);

  return (
    <Card className="border-primary/10 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5" />
          Plan Your Route Waypoints
        </CardTitle>
        <CardDescription>
          Click on the map to add waypoints along your route from {departure?.name || 'departure'} to {destination?.name || 'destination'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Map for waypoint selection */}
        <div className="w-full">
          <div className="mb-2">
            <Label htmlFor="waypoint-name">Waypoint Name (optional)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="waypoint-name"
                value={waypointName}
                onChange={(e) => setWaypointName(e.target.value)}
                placeholder="Enter waypoint name..."
                className="flex-1"
              />
            </div>
          </div>
          <MarineMap
            onWaypointAdd={handleWaypointAdd}
            departure={departure || undefined}
            destination={destination || undefined}
            waypoints={waypoints}
            route={route}
            mode="waypoint"
            height="500px"
          />
        </div>

        {/* Waypoints list */}
        {waypoints.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-foreground">
              Waypoints ({waypoints.length})
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {waypoints.map((waypoint, index) => (
                <div
                  key={waypoint.id || index}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {waypoint.sequence || index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{waypoint.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {waypoint.lat.toFixed(4)}, {waypoint.lng.toFixed(4)}
                      </div>
                      {waypoint.notes && (
                        <div className="text-xs text-muted-foreground mt-1">{waypoint.notes}</div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleWaypointRemove(waypoint.id || `wp-${index}`)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Route summary */}
        {departure && destination && (
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="text-sm font-semibold text-foreground mb-2">Route Summary</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Departure: {departure.name}</div>
              {waypoints.length > 0 && (
                <div>Waypoints: {waypoints.length}</div>
              )}
              <div>Destination: {destination.name}</div>
            </div>
          </div>
        )}

        {onSave && (
          <Button
            onClick={handleSave}
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : `Save ${waypoints.length} Waypoint${waypoints.length !== 1 ? 's' : ''}`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

