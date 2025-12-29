"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface Seat {
  placeId: string;
  x: number | null;
  y: number | null;
  row: string | null;
  seat: string | null;
  section: string | null;
  price: number | null;
  status: 'available' | 'sold' | 'reserved';
  available?: boolean;
  wheelchairAccessible?: boolean;
  tags?: string[];
}

interface SectionBounds {
  minX?: number;
  minY?: number;
  maxX?: number;
  maxY?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

interface Section {
  id: string;
  name: string;
  color: string;
  bounds: SectionBounds | null;
  polygon: Array<{ x: number; y: number }> | null;
  spacingConfig?: {
    seatSpacingVisual?: number;
    rowSpacingVisual?: number;
    seatRadius?: number;
    topMargin?: number;
    rotationAngle?: number;
  };
}

interface DisplayConfig {
  dotSize?: number;
  rowGap?: number;
  seatGap?: number;
}

interface BackgroundSvgConfig {
  svgContent?: string;
  sourceUrl?: string;
  sourceType?: string;
  opacity?: number;
  scale?: number;
  translateX?: number;
  translateY?: number;
  rotation?: number;
  isVisible?: boolean;
  displayConfig?: DisplayConfig;
}

interface SeatMapProps {
  backgroundSvg: BackgroundSvgConfig | string | null;
  sections: Section[];
  seats: Seat[];
  selectedSeats: string[];
  onSeatClick?: (placeId: string, seat: Seat) => void;
  onSeatHover?: (placeId: string | null) => void;
  showSeats?: boolean;
  onToggleSeats?: () => void;
  readOnly?: boolean;
  viewMode?: 'overview' | 'section' | 'full';
  selectedSection?: string | null;
  onSectionClick?: (sectionId: string | null) => void;
}

const SeatMap: React.FC<SeatMapProps> = ({
  backgroundSvg,
  sections,
  seats,
  selectedSeats = [],
  onSeatClick,
  onSeatHover,
  showSeats = false,
  onToggleSeats,
  readOnly = false,
  viewMode = 'full',
  selectedSection = null,
  onSectionClick
}) => {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasCenteredRef = useRef(false);
  const [zoom, setZoom] = useState(0.5); // Start zoomed out to show full view
  // Calculate initial pan to center seats immediately (prevents bounce)
  const initialPan = useMemo(() => {
    if (seats.length === 0 || selectedSection) return { x: 0, y: 0 };

    const xs = seats.map(s => s.x).filter(x => x !== null) as number[];
    const ys = seats.map(s => s.y).filter(y => y !== null) as number[];

    if (xs.length === 0 || ys.length === 0) return { x: 0, y: 0 };

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Calculate pan to center: pan.x = centerX * (1 - zoom)
    const initialZoom = 0.5;
    return {
      x: centerX * (1 - initialZoom),
      y: centerY * (1 - initialZoom)
    };
  }, [seats, selectedSection]); // Recalculate if seats change

  const [pan, setPan] = useState(initialPan);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [svgImage, setSvgImage] = useState<string | null>(null);

  // Alignment offsets - seats are drawn relative to their coordinates,
  // background SVG is offset by translateX/translateY from venue config
  // No fixed offsets here - alignment is controlled by venue's backgroundSvg settings
  const seatOffsetX = 0;
  const seatOffsetY = 0;

  // Default seat radius - will be overridden by displayConfig if available
  const DEFAULT_SEAT_RADIUS = 8;

  // Parse backgroundSvg config and extract SVG content/URL
  // Also extract viewBox from SVG content to properly align with seat coordinates
  const svgConfig = useMemo(() => {
    if (!backgroundSvg) return null;

    let svgContent: string | null = null;
    let sourceUrl: string | null = null;
    let viewBox: string | null = null;

    // Handle object format
    if (typeof backgroundSvg === 'object') {
      svgContent = backgroundSvg.svgContent || null;
      sourceUrl = backgroundSvg?.sourceUrl?.trim() || null;

      // Extract viewBox from svgContent if available
      if (svgContent) {
        const viewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/i);
        if (viewBoxMatch) {
          viewBox = viewBoxMatch[1];
        }
      }

      const config = {
        svgContent,
        sourceUrl,
        viewBox,
        opacity: 1,
        scale: backgroundSvg.scale ?? 1,
        translateX: backgroundSvg.translateX ?? 0,
        translateY: backgroundSvg.translateY ?? 0,
        rotation: backgroundSvg.rotation ?? 0,
        isVisible: backgroundSvg.isVisible !== false,
        // Display config for consistent seat rendering with CMS
        displayConfig: {
          dotSize: backgroundSvg.displayConfig?.dotSize ?? 8,
          rowGap: backgroundSvg.displayConfig?.rowGap ?? 10,
          seatGap: backgroundSvg.displayConfig?.seatGap ?? 12
        }
      };
      return config;
    }

    // Handle string format (backward compatibility)
    svgContent = backgroundSvg;

    // Extract viewBox from SVG string if available
    if (svgContent) {
      const viewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/i);
      if (viewBoxMatch) {
        viewBox = viewBoxMatch[1];
      }
    }

    return {
      svgContent,
      sourceUrl: null,
      viewBox,
      opacity: 1,
      scale: 1,
      translateX: 0,
      translateY: 0,
      rotation: 0,
      isVisible: true,
      displayConfig: {
        dotSize: DEFAULT_SEAT_RADIUS,
        rowGap: 10,  // Baseline value = no scaling
        seatGap: 10  // Baseline value = no scaling
      }
    };
  }, [backgroundSvg]);

  // Get seat radius from displayConfig or use default
  const SEAT_RADIUS = useMemo(() => {
    const radius = svgConfig?.displayConfig?.dotSize ?? DEFAULT_SEAT_RADIUS;
    return radius;
  }, [svgConfig]);

  // Helper function to check if point is inside polygon
  const isPointInPolygon = useCallback((point: { x: number; y: number }, polygon: Array<{ x: number; y: number }>): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }, []);

  // Helper function to find nearest point on polygon edge
  const findNearestPointOnPolygon = useCallback((point: { x: number; y: number }, polygon: Array<{ x: number; y: number }>): { x: number; y: number } => {
    let minDist = Infinity;
    let nearestPoint = { x: point.x, y: point.y };

    for (let i = 0; i < polygon.length; i++) {
      const p1 = polygon[i];
      const p2 = polygon[(i + 1) % polygon.length];

      // Find nearest point on line segment
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const length = Math.sqrt(dx * dx + dy * dy);

      if (length > 0) {
        const t = Math.max(0, Math.min(1, ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / (length * length)));
        const nearest = {
          x: p1.x + t * dx,
          y: p1.y + t * dy
        };

        const dist = Math.sqrt((point.x - nearest.x) ** 2 + (point.y - nearest.y) ** 2);
        if (dist < minDist) {
          minDist = dist;
          nearestPoint = nearest;
        }
      }
    }

    return nearestPoint;
  }, []);

  // Helper function to calculate scaled seat position (matching CMS SeatMapCanvas logic)
  const getScaledSeatPosition = useCallback((seat: Seat) => {
    if (seat.x === null || seat.y === null) return { x: 0, y: 0 };

    // Find section for this seat - try multiple matching strategies
    const sectionName = seat.section || 'default';
    let section = sections.find(s =>
      s.name === sectionName ||
      s.id === sectionName ||
      s.name?.toLowerCase() === sectionName?.toLowerCase() ||
      s.id?.toLowerCase() === sectionName?.toLowerCase()
    );

    // If no section found, try to find by matching any part of the name
    if (!section && sectionName) {
      section = sections.find(s =>
        s.name?.includes(sectionName) ||
        sectionName.includes(s.name || '')
      );
    }

    // Debug: Log section matching
    if (!section && process.env.NODE_ENV === 'development') {
      console.warn(`[SeatMap] No section found for seat ${seat.placeId} with section name "${sectionName}". Available sections:`, sections.map(s => ({ name: s.name, id: s.id, hasPolygon: !!s.polygon })));
    }

    const spacingConfig = section?.spacingConfig || {};

    // Priority: displayConfig (from backgroundSvg.displayConfig) > spacingConfig > defaults
    const displayConfig: DisplayConfig = svgConfig?.displayConfig || {};
    const baselineSpacing = 10;

    // Get spacing multipliers
    let rawSeatSpacingMultiplier: number;
    let rawRowSpacingMultiplier: number;

    if (displayConfig.seatGap !== undefined) {
      rawSeatSpacingMultiplier = displayConfig.seatGap / baselineSpacing;
    } else if (spacingConfig.seatSpacingVisual !== undefined) {
      rawSeatSpacingMultiplier = spacingConfig.seatSpacingVisual;
    } else {
      rawSeatSpacingMultiplier = 1.0;
    }

    if (displayConfig.rowGap !== undefined) {
      rawRowSpacingMultiplier = displayConfig.rowGap / baselineSpacing;
    } else if (spacingConfig.rowSpacingVisual !== undefined) {
      rawRowSpacingMultiplier = spacingConfig.rowSpacingVisual;
    } else {
      rawRowSpacingMultiplier = 1.0;
    }

    // CRITICAL: If section has no polygon, use bounds as fallback constraint
    if (!section?.polygon || section.polygon.length === 0) {
      // No polygon data - use bounds if available, otherwise use original position
      if (section?.bounds && (section.bounds.minX !== undefined || section.bounds.x1 !== undefined)) {
        const bounds = section.bounds;
        const seatRadius = svgConfig?.displayConfig?.dotSize ?? DEFAULT_SEAT_RADIUS;

        // Handle both minX/maxX and x1/x2 formats
        const minX = bounds.minX ?? bounds.x1 ?? 0;
        const minY = bounds.minY ?? bounds.y1 ?? 0;
        const maxX = bounds.maxX ?? bounds.x2 ?? 1000;
        const maxY = bounds.maxY ?? bounds.y2 ?? 1000;

        // Constrain to bounds with margin for seat radius
        const constrainedX = Math.max(minX + seatRadius, Math.min(maxX - seatRadius, seat.x));
        const constrainedY = Math.max(minY + seatRadius, Math.min(maxY - seatRadius, seat.y));

        if (process.env.NODE_ENV === 'development') {
          console.warn(`[SeatMap] Section "${section.name}" (id: ${section.id}) has no polygon - using bounds constraint for ${seat.placeId}`);
        }
        return { x: constrainedX, y: constrainedY };
      } else {
        // No polygon and no bounds - use original position (no scaling)
        if (process.env.NODE_ENV === 'development' && section) {
          console.warn(`[SeatMap] Section "${section.name}" (id: ${section.id}) has no polygon or bounds - using original seat position for ${seat.placeId}`);
        }
        return { x: seat.x, y: seat.y };
      }
    }

    // Calculate scaling factors - allow values from 0.1 to 3.0 (matching SeatMapViewer)
    const seatSpacingMultiplier = Math.max(0.1, Math.min(3.0, rawSeatSpacingMultiplier));
    const rowSpacingMultiplier = Math.max(0.1, Math.min(3.0, rawRowSpacingMultiplier));
    const sectionTopMargin = spacingConfig.topMargin !== undefined ? spacingConfig.topMargin : 0;

    // Get section center and rotation
    const rotationAngle = spacingConfig.rotationAngle || 0;
    const polygon = section.polygon;

    // Use polygon centroid (matching SeatMapViewer logic)
    const centerX = polygon.reduce((sum, p) => sum + p.x, 0) / polygon.length;
    const centerY = polygon.reduce((sum, p) => sum + p.y, 0) / polygon.length;

    // Only apply scaling if values differ from baseline (matching SeatMapViewer: simpleMode && scale !== 1)
    // For customer-facing app, we always apply scaling when multipliers are not 1.0
    if (seatSpacingMultiplier === 1.0 && rowSpacingMultiplier === 1.0 && rotationAngle === 0 && sectionTopMargin === 0) {
      // No scaling needed - use original position
      return { x: seat.x, y: seat.y };
    }

    // Calculate scaled position
    let scaledX: number, scaledY: number;

    if (rotationAngle !== 0) {
      // For tilted/rotated sections, automatically reduce gaps to prevent overflow (matching SeatMapViewer)
      // Apply reduction: if user sets gap to 20 (2x), tilted section gets reduced scaling
      const reducedSeatScale = 0.6 + (seatSpacingMultiplier - 1);
      const reducedRowScale = 0.8 + (rowSpacingMultiplier - 1);

      // Scale in local coordinate system
      const radians = (rotationAngle * Math.PI) / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);

      // Calculate offset from center
      const offsetX = seat.x - centerX;
      const offsetY = seat.y - centerY;

      // Step 1: Rotate offset by -angle to get local coordinates
      const localX = offsetX * cos + offsetY * sin;
      const localY = -offsetX * sin + offsetY * cos;

      // Step 2: Scale in local coordinate system (with reduced scaling for tilted sections)
      const scaledLocalX = localX * reducedSeatScale;
      const scaledLocalY = localY * reducedRowScale;

      // Step 3: Rotate back by +angle to get global coordinates
      const rotatedBackX = scaledLocalX * cos - scaledLocalY * sin;
      const rotatedBackY = scaledLocalX * sin + scaledLocalY * cos;

      // Step 4: Translate back to global position (matching SeatMapViewer - no topMargin for rotated sections)
      scaledX = centerX + rotatedBackX;
      scaledY = centerY + rotatedBackY;
    } else {
      // No rotation - standard scaling
      scaledX = centerX + (seat.x - centerX) * seatSpacingMultiplier;
      scaledY = sectionTopMargin + centerY + (seat.y - centerY) * rowSpacingMultiplier;
    }

    // Constrain to polygon (matching SeatMapViewer logic)
    const scaledPoint = { x: scaledX, y: scaledY };

    // Check if scaled position is inside polygon
    if (isPointInPolygon(scaledPoint, polygon)) {
      // Inside polygon - use scaled position
      return { x: scaledX, y: scaledY };
    }

    // If outside polygon, find the closest point on polygon boundary
    // For rotated/tilted sections, we need strict constraint to prevent overflow
    const nearestPoint = findNearestPointOnPolygon(scaledPoint, polygon);
    const dx = scaledX - nearestPoint.x;
    const dy = scaledY - nearestPoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // If the scaled point is far outside (> 20px), use original position instead
    // This prevents seats from jumping to polygon edges when scaling causes overflow
    if (dist > 20) {
      return { x: seat.x, y: seat.y };
    }

    // Return closest point on polygon edge (matching SeatMapViewer)
    return { x: nearestPoint.x, y: nearestPoint.y };
  }, [sections, svgConfig, isPointInPolygon, findNearestPointOnPolygon]);

  // Load SVG as image
  useEffect(() => {
    if (!svgConfig || !svgConfig.isVisible) {
      setSvgImage(null);
      return;
    }

    // Prefer sourceUrl if available, otherwise use svgContent
    const svgSource = svgConfig.sourceUrl || svgConfig.svgContent;

    if (!svgSource) {
      setSvgImage(null);
      return;
    }



    // If SVG is a data URL or URL, use it directly
    if (svgSource.startsWith('data:') || svgSource.startsWith('http')) {
      setSvgImage(svgSource);
    } else {
      // Use base64 encoding for data URL to avoid CSP issues with blob URLs
      const base64Svg = btoa(unescape(encodeURIComponent(svgSource)));
      const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;
      setSvgImage(dataUrl);
    }
  }, [svgConfig]);

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!containerRef.current) return;
    e.preventDefault();

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, zoom * delta));

    // Zoom towards mouse position
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newPanX = pan.x - (mouseX - pan.x) * (newZoom / zoom - 1);
    const newPanY = pan.y - (mouseY - pan.y) * (newZoom / zoom - 1);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [zoom, pan]);

  // Attach wheel event listener with passive: false to allow preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // Handle drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Get seat color based on status
  const getSeatColor = (seat: Seat): string => {
    if (selectedSeats.includes(seat.placeId)) {
      return '#3b82f6'; // Blue for selected
    }
    // Check if seat is unavailable (available === false) - mark as sold
    if (seat.available === false || seat.status === 'sold') {
      return '#ef4444'; // Red for sold/unavailable
    }
    if (seat.status === 'reserved') {
      return '#f59e0b'; // Orange/amber for reserved/occupied
    }
    return '#10b981'; // Green for available
  };

  // Calculate viewBox based on seats or selected section
  const getViewBox = (): string => {
    // If section is selected, zoom to section bounds
    if (selectedSection && viewMode === 'section') {
      const section = sections.find(s => s.id === selectedSection);
      if (section) {
        // Try to get bounds from section.bounds or calculate from polygon
        let minX: number | undefined, minY: number | undefined, maxX: number | undefined, maxY: number | undefined;

        if (section.bounds && (section.bounds.minX !== undefined || section.bounds.x1 !== undefined)) {
          minX = section.bounds.minX ?? section.bounds.x1;
          minY = section.bounds.minY ?? section.bounds.y1;
          maxX = section.bounds.maxX ?? section.bounds.x2;
          maxY = section.bounds.maxY ?? section.bounds.y2;
        } else if (section.polygon && section.polygon.length > 0) {
          const xs = section.polygon.map(p => p.x);
          const ys = section.polygon.map(p => p.y);
          minX = Math.min(...xs);
          minY = Math.min(...ys);
          maxX = Math.max(...xs);
          maxY = Math.max(...ys);
        }

        if (minX !== undefined && minY !== undefined && maxX !== undefined && maxY !== undefined) {
          const padding = 50;
          return `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`;
        }
      }
    }

    // Default: fit all seats (using scaled positions)
    if (seats.length === 0) return '0 0 800 600';

    // Get scaled positions for all seats
    const scaledPositions = seats
      .filter(s => s.x !== null && s.y !== null)
      .map(s => getScaledSeatPosition(s));

    if (scaledPositions.length === 0) return '0 0 800 600';

    const xs = scaledPositions.map(p => p.x);
    const ys = scaledPositions.map(p => p.y);

    const minX = Math.min(...xs) - 50;
    const maxX = Math.max(...xs) + 50;
    const minY = Math.min(...ys) - 50;
    const maxY = Math.max(...ys) + 50;

    const viewBox = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
    return viewBox;
  };

  // Update pan when seats are first loaded (prevents bounce on initial render)
  useEffect(() => {
    if (seats.length > 0 && !selectedSection && !hasCenteredRef.current) {
      // Immediately set pan to center (no delay to prevent bounce)
      setPan(initialPan);
      hasCenteredRef.current = true;
    }
  }, [seats.length, selectedSection, initialPan]);

  // Auto-zoom to section when selected
  useEffect(() => {
    if (selectedSection && viewMode === 'section') {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [selectedSection, viewMode]);


  return (
    <div
      ref={containerRef}
      className="relative w-full h-full border rounded-lg overflow-hidden"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Mini-Map Overview */}
      {sections.length > 0 && (() => {
        // Calculate bounds from all sections (from polygon if bounds are missing)
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        sections.forEach(section => {
          let sMinX: number | undefined, sMinY: number | undefined, sMaxX: number | undefined, sMaxY: number | undefined;

          if (section.bounds && (section.bounds.minX !== undefined || section.bounds.x1 !== undefined)) {
            sMinX = section.bounds.minX ?? section.bounds.x1;
            sMinY = section.bounds.minY ?? section.bounds.y1;
            sMaxX = section.bounds.maxX ?? section.bounds.x2;
            sMaxY = section.bounds.maxY ?? section.bounds.y2;
          } else if (section.polygon && section.polygon.length > 0) {
            const xs = section.polygon.map(p => p.x);
            const ys = section.polygon.map(p => p.y);
            sMinX = Math.min(...xs);
            sMinY = Math.min(...ys);
            sMaxX = Math.max(...xs);
            sMaxY = Math.max(...ys);
          }

          if (sMinX !== undefined && sMinY !== undefined && sMaxX !== undefined && sMaxY !== undefined) {
            minX = Math.min(minX, sMinX);
            minY = Math.min(minY, sMinY);
            maxX = Math.max(maxX, sMaxX);
            maxY = Math.max(maxY, sMaxY);
          }
        });
        const totalWidth = maxX !== -Infinity && minX !== Infinity ? maxX - minX : 1000;
        const totalHeight = maxY !== -Infinity && minY !== Infinity ? maxY - minY : 1000;
        const scale = Math.min(192 / totalWidth, 144 / totalHeight) || 0.1;

        return (
          <div className="absolute top-4 right-4 z-10 w-48 h-36 rounded-lg border overflow-hidden shadow-lg" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <svg width="100%" height="100%" viewBox={`0 0 ${totalWidth * scale} ${totalHeight * scale}`} preserveAspectRatio="xMidYMid meet">
              {/* Render sections in mini-map */}
              {sections.map((section) => {
                const isActive = selectedSection === section.id || hoveredSection === section.id;
                const handleMiniMapClick = () => {
                  if (onSectionClick) {
                    // Toggle selection: if already selected, deselect (pass null)
                    onSectionClick(isActive && selectedSection === section.id ? null : section.id);
                  }
                };

                // Render polygon if available (more accurate for tilted sections)
                if (section.polygon && section.polygon.length > 0) {
                  const points = section.polygon
                    .map(p => `${(p.x - minX) * scale},${(p.y - minY) * scale}`)
                    .join(' ');
                  return (
                    <polygon
                      key={section.id}
                      points={points}
                      fill={isActive ? '#3b82f6' : '#9ca3af'}
                      fillOpacity={isActive ? 0.6 : 0.3}
                      stroke={isActive ? '#3b82f6' : '#6b7280'}
                      strokeWidth={isActive ? 2 : 1}
                      onClick={handleMiniMapClick}
                      style={{ cursor: onSectionClick ? 'pointer' : 'default' }}
                    />
                  );
                }

                // Fallback to rectangle bounds
                let sMinX: number | undefined, sMinY: number | undefined, sMaxX: number | undefined, sMaxY: number | undefined;

                if (section.bounds && (section.bounds.minX !== undefined || section.bounds.x1 !== undefined)) {
                  // Handle both minX/maxX and x1/x2 formats
                  sMinX = section.bounds.minX ?? section.bounds.x1;
                  sMinY = section.bounds.minY ?? section.bounds.y1;
                  sMaxX = section.bounds.maxX ?? section.bounds.x2;
                  sMaxY = section.bounds.maxY ?? section.bounds.y2;
                }

                if (sMinX !== undefined && sMinY !== undefined && sMaxX !== undefined && sMaxY !== undefined) {
                  return (
                    <rect
                      key={section.id}
                      x={(sMinX - minX) * scale}
                      y={(sMinY - minY) * scale}
                      width={(sMaxX - sMinX) * scale}
                      height={(sMaxY - sMinY) * scale}
                      fill={isActive ? '#3b82f6' : '#9ca3af'}
                      fillOpacity={isActive ? 0.6 : 0.3}
                      stroke={isActive ? '#3b82f6' : '#6b7280'}
                      strokeWidth={isActive ? 2 : 1}
                      onClick={handleMiniMapClick}
                      style={{ cursor: onSectionClick ? 'pointer' : 'default' }}
                    />
                  );
                }
                return null;
              })}
              {/* Section labels */}
              {sections.map((section) => {
                // Calculate bounds from polygon if bounds are not available
                let sMinX: number | undefined, sMinY: number | undefined, sMaxX: number | undefined, sMaxY: number | undefined;

                if (section.bounds && (section.bounds.minX !== undefined || section.bounds.x1 !== undefined)) {
                  // Handle both minX/maxX and x1/x2 formats
                  sMinX = section.bounds.minX ?? section.bounds.x1;
                  sMinY = section.bounds.minY ?? section.bounds.y1;
                  sMaxX = section.bounds.maxX ?? section.bounds.x2;
                  sMaxY = section.bounds.maxY ?? section.bounds.y2;
                } else if (section.polygon && section.polygon.length > 0) {
                  // Calculate bounds from polygon
                  const xs = section.polygon.map(p => p.x);
                  const ys = section.polygon.map(p => p.y);
                  sMinX = Math.min(...xs);
                  sMinY = Math.min(...ys);
                  sMaxX = Math.max(...xs);
                  sMaxY = Math.max(...ys);
                }

                if (sMinX !== undefined && sMinY !== undefined && sMaxX !== undefined && sMaxY !== undefined) {
                  const centerX = ((sMinX + sMaxX) / 2 - minX) * scale;
                  const centerY = ((sMinY + sMaxY) / 2 - minY) * scale;
                  return (
                    <text
                      key={`label-${section.id}`}
                      x={centerX}
                      y={centerY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="10"
                      fontWeight="bold"
                      pointerEvents="none"
                    >
                      {section.name}
                    </text>
                  );
                }
                return null;
              })}
            </svg>
          </div>
        );
      })()}

      {/* Zoom Controls - Vertical Stack */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2" style={{ marginTop: sections.length > 0 ? '160px' : '0' }}>
        <button
          onClick={() => {
            // Reset zoom and recalculate center using the same logic as initial centering
            const newZoom = 0.5;

            // Calculate center of seats
            const xs = seats.map(s => s.x).filter(x => x !== null) as number[];
            const ys = seats.map(s => s.y).filter(y => y !== null) as number[];

            if (xs.length > 0 && ys.length > 0) {
              const minX = Math.min(...xs);
              const maxX = Math.max(...xs);
              const minY = Math.min(...ys);
              const maxY = Math.max(...ys);

              const centerX = (minX + maxX) / 2;
              const centerY = (minY + maxY) / 2;

              // Get viewBox to match the initial centering calculation
              const viewBox = getViewBox();
              // Parse viewBox for potential future use
              viewBox.split(' ').map(Number);

              // Use the same centering formula as initial load
              const panX = centerX * (1 - newZoom);
              const panY = centerY * (1 - newZoom);

              // Update both zoom and pan together
              setZoom(newZoom);
              setPan({ x: panX, y: panY });
            } else {
              setZoom(newZoom);
              setPan({ x: 0, y: 0 });
            }
          }}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-md"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            borderWidth: '1px',
            color: 'var(--foreground)',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            textRendering: 'optimizeLegibility'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          aria-label="Reset view"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button
          onClick={() => setZoom(Math.min(3, zoom + 0.1))}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-md"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            borderWidth: '1px',
            color: 'var(--foreground)',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            textRendering: 'optimizeLegibility'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          aria-label="Zoom in"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button
          onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-md"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            borderWidth: '1px',
            color: 'var(--foreground)',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            textRendering: 'optimizeLegibility'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          aria-label="Zoom out"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-4 px-4 py-2 rounded-lg shadow-md" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: '1px' }}>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ background: '#10b981' }}></div>
          <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
            {t('seatSelection.available') || 'Available'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ background: '#3b82f6' }}></div>
          <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
            {t('seatSelection.selected') || 'Selected'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ background: '#ef4444' }}></div>
          <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
            {t('seatSelection.occupied') || 'Occupied'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ background: '#f59e0b' }}></div>
          <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
            {t('seatSelection.reserved') || 'Reserved'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ background: '#10b981', border: '2px solid #9333ea' }}></div>
          <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
            ♿ {t('seatSelection.wheelchair') || 'Wheelchair Accessible'}
          </span>
        </div>
      </div>

      {/* SVG Container */}
      <svg
        ref={svgRef}
        viewBox={getViewBox()}
        className="w-full h-full"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onClick={(e) => {
          // Deselect section when clicking on empty space (not on a section or seat)
          if (e.target === svgRef.current || (e.target as Element).tagName === 'svg' || (e.target as Element).tagName === 'g') {
            if (selectedSection && onSectionClick) {
              onSectionClick(null);
            }
          }
        }}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Background SVG Image */}
          {/* Match CMS rendering: background at (translateX, translateY) with display size * scale.
              The CMS uses the SVG's width/height attributes (not viewBox) for actual display size. */}
          {svgImage && svgConfig && svgConfig.isVisible && svgConfig.svgContent && (
            (() => {
              // Parse width/height attributes from SVG (the actual display size, not viewBox)
              // SVG has viewBox="0 0 10240 7680" but width="1024px" height="768px"
              // CMS uses 1024x768 (the width/height), not 10240x7680 (the viewBox)
              const widthMatch = svgConfig.svgContent.match(/width=["']([0-9.]+)/i);
              const heightMatch = svgConfig.svgContent.match(/height=["']([0-9.]+)/i);
              const naturalWidth = widthMatch ? parseFloat(widthMatch[1]) : 1024;
              const naturalHeight = heightMatch ? parseFloat(heightMatch[1]) : 768;

              // Position exactly like CMS: at (translateX, translateY) with display size * scale
              const bgX = svgConfig.translateX || 0;
              const bgY = svgConfig.translateY || 0;
              const bgScale = svgConfig.scale || 1;
              const bgWidth = naturalWidth * bgScale;
              const bgHeight = naturalHeight * bgScale;

              return (
                <g opacity={1}>
                  <image
                    href={svgImage || undefined}
                    x={bgX}
                    y={bgY}
                    width={bgWidth}
                    height={bgHeight}
                    preserveAspectRatio="none"
                    onLoad={() => console.log('')}
                    onError={(e) => console.error('[SeatMap] Background image failed to load', e)}
                  />
                </g>
              );
            })()
          )}

          {/* Section Overlays */}
          {sections.map((section) => {
            const isSelected = selectedSection === section.id;
            const isHovered = hoveredSection === section.id;
            const shouldHighlight = isSelected || isHovered;
            const handleClick = (e: React.MouseEvent) => {
              e.stopPropagation(); // Prevent event bubbling to avoid bouncing
              if (onSectionClick) {
                // Toggle selection: if already selected, deselect (pass null)
                onSectionClick(isSelected ? null : section.id);
              } else if (onToggleSeats) {
                onToggleSeats();
              }
            };

            if (section.polygon && section.polygon.length > 0) {
              // Render polygon section (stroke only, matching CMS - no fill to avoid covering seats)
              const points = section.polygon.map(p => `${p.x},${p.y}`).join(' ');
              return (
                <polygon
                  key={section.id}
                  points={points}
                  fill={shouldHighlight ? (section.color || '#2196F3') : 'none'}
                  fillOpacity={shouldHighlight ? 0.2 : 0}
                  stroke={shouldHighlight ? '#FF6B35' : (section.color || '#2196F3')}
                  strokeWidth={shouldHighlight ? 3 : 2}
                  strokeDasharray={shouldHighlight ? 'none' : '5,5'}
                  onClick={handleClick}
                  style={{ cursor: (onSectionClick || onToggleSeats) ? 'pointer' : 'default' }}
                />
              );
            } else if (section.bounds) {
              // Calculate bounds from polygon if bounds are not available
              let minX: number | undefined, minY: number | undefined, maxX: number | undefined, maxY: number | undefined;

              if (section.bounds && (section.bounds.minX !== undefined || section.bounds.x1 !== undefined)) {
                minX = section.bounds.minX ?? section.bounds.x1;
                minY = section.bounds.minY ?? section.bounds.y1;
                maxX = section.bounds.maxX ?? section.bounds.x2;
                maxY = section.bounds.maxY ?? section.bounds.y2;
              } else if (section.polygon && section.polygon.length > 0) {
                const xs = section.polygon.map(p => p.x);
                const ys = section.polygon.map(p => p.y);
                minX = Math.min(...xs);
                minY = Math.min(...ys);
                maxX = Math.max(...xs);
                maxY = Math.max(...ys);
              }

              if (minX !== undefined && minY !== undefined && maxX !== undefined && maxY !== undefined) {
                // Render rectangle section (stroke only, matching CMS)
                return (
                  <rect
                    key={section.id}
                    x={minX}
                    y={minY}
                    width={maxX - minX}
                    height={maxY - minY}
                    fill={shouldHighlight ? (section.color || '#2196F3') : 'none'}
                    fillOpacity={shouldHighlight ? 0.2 : 0}
                    stroke={shouldHighlight ? '#FF6B35' : (section.color || '#2196F3')}
                    strokeWidth={shouldHighlight ? 3 : 2}
                    strokeDasharray={shouldHighlight ? 'none' : '5,5'}
                    onClick={handleClick}
                    style={{ cursor: (onSectionClick || onToggleSeats) ? 'pointer' : 'default' }}
                  />
                );
              }
            }
            return null;
          })}

          {/* Section Labels */}
          {!showSeats && sections.map((section) => {
            if (section.bounds) {
              const minX = section.bounds.minX ?? section.bounds.x1 ?? 0;
              const minY = section.bounds.minY ?? section.bounds.y1 ?? 0;
              const maxX = section.bounds.maxX ?? section.bounds.x2 ?? 100;
              const maxY = section.bounds.maxY ?? section.bounds.y2 ?? 100;
              const centerX = (minX + maxX) / 2;
              const centerY = (minY + maxY) / 2;
              return (
                <text
                  key={`label-${section.id}`}
                  x={centerX}
                  y={centerY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="24"
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  {section.name}
                </text>
              );
            }
            return null;
          })}

          {/* Seats (only shown when showSeats is true or viewMode is not 'overview') */}
          {(showSeats || viewMode !== 'overview') && seats.map((seat) => {
            if (seat.x === null || seat.y === null) return null;

            const isSelected = selectedSeats.includes(seat.placeId);
            const isHovered = hoveredSeat === seat.placeId;
            const color = getSeatColor(seat);

            // Apply spacing scale from displayConfig (matching CMS logic)
            // This function ALWAYS returns constrained positions
            const scaledPos = getScaledSeatPosition(seat);
            const seatX = scaledPos.x + seatOffsetX;
            const seatY = scaledPos.y + seatOffsetY;

            const isUnavailable = seat.available === false;
            const isSold = seat.status === 'sold' || isUnavailable;
            const isReserved = seat.status === 'reserved';
            const isWheelchair = seat.wheelchairAccessible || seat.tags?.includes('wheelchair');

            return (
              <g key={seat.placeId}>
                <circle
                  cx={seatX}
                  cy={seatY}
                  r={SEAT_RADIUS}
                  fill={color}
                  stroke={isSelected || isHovered ? '#ffffff' : (isWheelchair ? '#9333ea' : 'none')}
                  strokeWidth={isSelected || isHovered ? 2 : (isWheelchair ? 2 : 0)}
                  opacity={isSold || isReserved ? 0.5 : 1}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent event bubbling
                    if (!readOnly && seat.status === 'available' && !isUnavailable && onSeatClick) {
                      onSeatClick(seat.placeId, seat);
                    }
                    // Highlight section when seat is clicked (set, don't toggle to prevent bouncing)
                    if (seat.section) {
                      const section = sections.find(s =>
                        s.name === seat.section ||
                        s.id === seat.section ||
                        s.name?.toLowerCase() === seat.section?.toLowerCase()
                      );
                      if (section && onSectionClick && selectedSection !== section.id) {
                        // Only set if not already selected to prevent bouncing
                        onSectionClick(section.id);
                      }
                    }
                  }}
                  onMouseEnter={() => {
                    setHoveredSeat(seat.placeId);
                    if (onSeatHover) {
                      onSeatHover(seat.placeId);
                    }
                    // Highlight section when seat is hovered
                    if (seat.section) {
                      const section = sections.find(s =>
                        s.name === seat.section ||
                        s.id === seat.section ||
                        s.name?.toLowerCase() === seat.section?.toLowerCase()
                      );
                      if (section) {
                        setHoveredSection(section.id);
                      }
                    }
                  }}
                  onMouseLeave={() => {
                    // Only clear hover state if section is not selected (prevents bouncing)
                    // Keep section highlighted if it's the selected section
                    if (!seat.section || selectedSection === null) {
                      setHoveredSection(null);
                    } else {
                      const section = sections.find(s =>
                        s.name === seat.section ||
                        s.id === seat.section ||
                        s.name?.toLowerCase() === seat.section?.toLowerCase()
                      );
                      // Only clear if this section is not the selected one
                      if (section && section.id !== selectedSection) {
                        setHoveredSection(null);
                      }
                    }
                    setHoveredSeat(null);
                    if (onSeatHover) {
                      onSeatHover(null);
                    }
                  }}
                  style={{
                    cursor: readOnly || seat.status !== 'available' || isUnavailable ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                />
                {/* Wheelchair indicator - small icon */}
                {isWheelchair && (
                  <text
                    x={seatX +0.5}
                    y={seatY + 0.5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="5"
                    fill="#9333ea"
                    fontWeight="normal"
                    pointerEvents="none"
                    style={{
                      textRendering: 'geometricPrecision',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale'
                    }}
                  >
                    ♿
                  </text>
                )}
                {/* Checkmark for selected seats */}
                {isSelected && (
                  <g>
                    <circle
                      cx={seatX}
                      cy={seatY}
                      r={SEAT_RADIUS + 2}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                    />
                    <text
                      x={seatX}
                      y={seatY + 4}
                      textAnchor="middle"
                      fontSize="12"
                      fill="white"
                      fontWeight="bold"
                      pointerEvents="none"
                    >
                      ✓
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Tooltips - render after all seats so they appear on top */}
          {(showSeats || viewMode !== 'overview') && seats.map((seat) => {
            if (seat.x === null || seat.y === null) return null;
            if (hoveredSeat !== seat.placeId || !seat.row || !seat.seat) return null;

            const scaledPos = getScaledSeatPosition(seat);
            const seatX = scaledPos.x + seatOffsetX;
            const seatY = scaledPos.y + seatOffsetY;

            return (
              <g key={`tooltip-${seat.placeId}`} style={{ pointerEvents: 'none' }}>
                {/* Tooltip background - positioned above the seat with more space */}
                <rect
                  x={seatX - 55}
                  y={seatY - SEAT_RADIUS - 60}
                  width="110"
                  height={seat.price ? 55 : 40}
                  rx="4"
                  fill="rgba(0, 0, 0, 0.9)"
                  pointerEvents="none"
                />
                {/* Seat info */}
                <text
                  x={seatX}
                  y={seatY - SEAT_RADIUS - 40}
                  textAnchor="middle"
                  fontSize="13"
                  fill="white"
                  fontWeight="500"
                  pointerEvents="none"
                >
                  {seat.row} - Seat {seat.seat}
                </text>
                {/* Status indicator for sold/reserved/unavailable seats */}
                {(seat.status === 'sold' || seat.available === false) && (
                  <text
                    x={seatX}
                    y={seatY - SEAT_RADIUS - 25}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#ef4444"
                    fontWeight="500"
                    pointerEvents="none"
                  >
                    {seat.available === false ? 'Unavailable' : 'Sold'}
                  </text>
                )}
                {seat.status === 'reserved' && seat.available !== false && (
                  <text
                    x={seatX}
                    y={seatY - SEAT_RADIUS - 25}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#f59e0b"
                    fontWeight="500"
                    pointerEvents="none"
                  >
                    Reserved
                  </text>
                )}
                {/* Wheelchair accessible indicator */}
                {(seat.wheelchairAccessible || seat.tags?.includes('wheelchair')) && (
                  <text
                    x={seatX}
                    y={seatY - SEAT_RADIUS - (seat.status === 'sold' || seat.available === false || seat.status === 'reserved' ? 10 : 25)}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#9333ea"
                    fontWeight="500"
                    pointerEvents="none"
                  >
                    ♿ {t('seatSelection.wheelchair') || 'Wheelchair Accessible'}
                  </text>
                )}
                {/* Price - only show for available seats */}
                {seat.price && seat.status === 'available' && (
                  <text
                    x={seatX}
                    y={seatY - SEAT_RADIUS - 20}
                    textAnchor="middle"
                    fontSize="12"
                    fill="#a5f3fc"
                    fontWeight="400"
                    pointerEvents="none"
                  >
                    {seat.price.toFixed(2)} EUR
                  </text>
                )}
                {/* Tooltip arrow */}
                <polygon
                  points={`${seatX - 8},${seatY - SEAT_RADIUS - 5} ${seatX + 8},${seatY - SEAT_RADIUS - 5} ${seatX},${seatY - SEAT_RADIUS}`}
                  fill="rgba(0, 0, 0, 0.9)"
                  pointerEvents="none"
                />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default SeatMap;

