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
  status: 'available' | 'sold';
}

interface Section {
  id: string;
  name: string;
  color: string;
  bounds: any;
  polygon: Array<{ x: number; y: number }> | null;
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
  onSectionClick?: (sectionId: string) => void;
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
  }, [seats.length, selectedSection]); // Recalculate if seats change

  const [pan, setPan] = useState(initialPan);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);
  const [svgImage, setSvgImage] = useState<string | null>(null);

  // Alignment offsets - seats are drawn relative to their coordinates,
  // background SVG is offset by translateX/translateY from venue config
  // No fixed offsets here - alignment is controlled by venue's backgroundSvg settings
  const seatOffsetX = 0;
  const seatOffsetY = 0;

  // Default seat radius - will be overridden by displayConfig if available
  const DEFAULT_SEAT_RADIUS = 8;
  const SECTION_OPACITY = 0.3;

  // Parse backgroundSvg config and extract SVG content/URL
  // Also extract viewBox from SVG content to properly align with seat coordinates
  const svgConfig = useMemo(() => {
    console.log('[SeatMap] backgroundSvg prop received:', backgroundSvg ? {
      type: typeof backgroundSvg,
      hasContent: !!(backgroundSvg as any)?.svgContent,
      hasSourceUrl: !!(backgroundSvg as any)?.sourceUrl,
      translateX: (backgroundSvg as any)?.translateX,
      translateY: (backgroundSvg as any)?.translateY,
      scale: (backgroundSvg as any)?.scale
    } : 'null/undefined');
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
      console.log('[SeatMap] Parsed backgroundSvg config:', {
        translateX: config.translateX,
        translateY: config.translateY,
        scale: config.scale,
        opacity: config.opacity,
        hasContent: !!config.svgContent,
        hasSourceUrl: !!config.sourceUrl,
        viewBox: config.viewBox,
        displayConfig: config.displayConfig
      });
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
    console.log('[SeatMap] SEAT_RADIUS:', radius, 'from displayConfig:', svgConfig?.displayConfig);
    return radius;
  }, [svgConfig]);

  // Calculate seat spacing scales and centroid (matching CMS SeatMapViewer logic)
  // Baseline spacing is 10, so scaling factor = configured value / 10
  // Values < 10 shrink seats toward center, values > 10 expand (but should be clamped to max 1.0)
  const seatSpacingConfig = useMemo(() => {
    const baselineSpacing = 10;  // Match CMS baseline of 10
    const seatGap = svgConfig?.displayConfig?.seatGap ?? 10;
    const rowGap = svgConfig?.displayConfig?.rowGap ?? 10;

    // Calculate scale factors, clamped to max 1.0 to prevent expansion beyond polygon bounds
    const seatSpacingScale = Math.min(1.0, seatGap / baselineSpacing);
    const rowSpacingScale = Math.min(1.0, rowGap / baselineSpacing);

    // Calculate centroid of all seats for scaling from center
    let centroidX = 0, centroidY = 0, validCount = 0;
    seats.forEach(seat => {
      if (seat.x !== null && seat.y !== null) {
        centroidX += seat.x;
        centroidY += seat.y;
        validCount++;
      }
    });

    if (validCount > 0) {
      centroidX /= validCount;
      centroidY /= validCount;
    }

    console.log('[SeatMap] Spacing config:', {
      seatGap, rowGap, seatSpacingScale, rowSpacingScale,
      centroid: { x: centroidX, y: centroidY }
    });

    return { seatSpacingScale, rowSpacingScale, centroidX, centroidY };
  }, [svgConfig, seats]);

  // Helper function to calculate scaled seat position (matching CMS logic)
  const getScaledSeatPosition = useCallback((x: number, y: number) => {
    const { seatSpacingScale, rowSpacingScale, centroidX, centroidY } = seatSpacingConfig;
    // Scale position from centroid
    const scaledX = centroidX + (x - centroidX) * seatSpacingScale;
    const scaledY = centroidY + (y - centroidY) * rowSpacingScale;
    return { x: scaledX, y: scaledY };
  }, [seatSpacingConfig]);

  // Load SVG as image
  useEffect(() => {
    if (!svgConfig || !svgConfig.isVisible) {
      console.log('[SeatMap] Background SVG not visible or config missing', { svgConfig });
      setSvgImage(null);
      return;
    }

    // Prefer sourceUrl if available, otherwise use svgContent
    const svgSource = svgConfig.sourceUrl || svgConfig.svgContent;

    if (!svgSource) {
      console.log('[SeatMap] No SVG source available', { svgConfig });
      setSvgImage(null);
      return;
    }



    // If SVG is a data URL or URL, use it directly
    if (svgSource.startsWith('data:') || svgSource.startsWith('http')) {
      console.log('[SeatMap] Using SVG as URL/data URL');
      setSvgImage(svgSource);
    } else {
      // If it's SVG content, convert to data URL (not blob URL - CSP blocks blob:)
      console.log('[SeatMap] Converting SVG content to data URL');
      // Use base64 encoding for data URL to avoid CSP issues with blob URLs
      const base64Svg = btoa(unescape(encodeURIComponent(svgSource)));
      const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;
      setSvgImage(dataUrl);
    }
  }, [svgConfig]);

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
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
    if (seat.status === 'sold') {
      return '#ef4444'; // Red for sold
    }
    return '#10b981'; // Green for available
  };

  // Calculate viewBox based on seats or selected section
  const getViewBox = (): string => {
    // If section is selected, zoom to section bounds
    if (selectedSection && viewMode === 'section') {
      const section = sections.find(s => s.id === selectedSection);
      if (section) {
        if (section.bounds) {
          const { minX, minY, maxX, maxY } = section.bounds;
          const padding = 50;
          return `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`;
        } else if (section.polygon && section.polygon.length > 0) {
          const xs = section.polygon.map(p => p.x);
          const ys = section.polygon.map(p => p.y);
          const minX = Math.min(...xs) - 50;
          const maxX = Math.max(...xs) + 50;
          const minY = Math.min(...ys) - 50;
          const maxY = Math.max(...ys) + 50;
          return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
        }
      }
    }

    // Default: fit all seats (using scaled positions)
    if (seats.length === 0) return '0 0 800 600';

    // Get scaled positions for all seats
    const scaledPositions = seats
      .filter(s => s.x !== null && s.y !== null)
      .map(s => getScaledSeatPosition(s.x!, s.y!));

    if (scaledPositions.length === 0) return '0 0 800 600';

    const xs = scaledPositions.map(p => p.x);
    const ys = scaledPositions.map(p => p.y);

    const minX = Math.min(...xs) - 50;
    const maxX = Math.max(...xs) + 50;
    const minY = Math.min(...ys) - 50;
    const maxY = Math.max(...ys) + 50;

    const viewBox = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
    console.log('[SeatMap] Calculated viewBox from scaled seats:', viewBox, { minX, maxX, minY, maxY, seatCount: seats.length });
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
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Mini-Map Overview */}
      {sections.length > 0 && (() => {
        // Calculate bounds from all sections
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        sections.forEach(section => {
          if (section.bounds) {
            minX = Math.min(minX, section.bounds.minX || 0);
            minY = Math.min(minY, section.bounds.minY || 0);
            maxX = Math.max(maxX, section.bounds.maxX || 0);
            maxY = Math.max(maxY, section.bounds.maxY || 0);
          }
        });
        const totalWidth = maxX - minX || 1000;
        const totalHeight = maxY - minY || 1000;
        const scale = Math.min(192 / totalWidth, 144 / totalHeight) || 0.1;

        return (
          <div className="absolute top-4 right-4 z-10 w-48 h-36 rounded-lg border overflow-hidden shadow-lg" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <svg width="100%" height="100%" viewBox={`0 0 ${totalWidth * scale} ${totalHeight * scale}`} preserveAspectRatio="xMidYMid meet">
              {/* Render sections in mini-map */}
              {sections.map((section) => {
                if (section.bounds) {
                  const { minX: sMinX, minY: sMinY, maxX: sMaxX, maxY: sMaxY } = section.bounds;
                  const isActive = selectedSection === section.id;
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
                    />
                  );
                }
                return null;
              })}
              {/* Section labels */}
              {sections.map((section) => {
                if (section.bounds) {
                  const { minX: sMinX, minY: sMinY, maxX: sMaxX, maxY: sMaxY } = section.bounds;
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
              const viewBoxParts = viewBox.split(' ').map(Number);
              const viewBoxX = viewBoxParts[0];
              const viewBoxY = viewBoxParts[1];
              const viewBoxWidth = viewBoxParts[2];
              const viewBoxHeight = viewBoxParts[3];

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
            Available
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ background: '#3b82f6' }}></div>
          <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
            Selected
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ background: '#ef4444' }}></div>
          <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
            Occupied
          </span>
        </div>
      </div>

      {/* SVG Container */}
      <svg
        ref={svgRef}
        viewBox={getViewBox()}
        className="w-full h-full"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
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

              console.log('[SeatMap] Rendering background (CMS match):', {
                position: { x: bgX, y: bgY },
                naturalSize: { width: naturalWidth, height: naturalHeight },
                scaledSize: { width: bgWidth, height: bgHeight },
                scale: bgScale,
                viewBox: svgConfig.viewBox
              });

              return (
                <g opacity={1}>
                  <image
                    href={svgImage || undefined}
                    x={bgX}
                    y={bgY}
                    width={bgWidth}
                    height={bgHeight}
                    preserveAspectRatio="none"
                    onLoad={() => console.log('[SeatMap] Background image loaded successfully')}
                    onError={(e) => console.error('[SeatMap] Background image failed to load', e)}
                  />
                </g>
              );
            })()
          )}

          {/* Section Overlays */}
          {sections.map((section) => {
            const isSelected = selectedSection === section.id;
            const handleClick = () => {
              if (onSectionClick) {
                onSectionClick(section.id);
              } else if (onToggleSeats) {
                onToggleSeats();
              }
            };

            if (section.polygon && section.polygon.length > 0) {
              // Render polygon section
              const points = section.polygon.map(p => `${p.x},${p.y}`).join(' ');
              return (
                <polygon
                  key={section.id}
                  points={points}
                  fill={section.color || '#2196F3'}
                  fillOpacity={isSelected ? SECTION_OPACITY * 1.5 : SECTION_OPACITY}
                  stroke={section.color || '#2196F3'}
                  strokeWidth={isSelected ? 3 : 2}
                  onClick={handleClick}
                  style={{ cursor: (onSectionClick || onToggleSeats) ? 'pointer' : 'default' }}
                />
              );
            } else if (section.bounds) {
              // Render rectangle section
              const { minX, minY, maxX, maxY } = section.bounds;
              return (
                <rect
                  key={section.id}
                  x={minX}
                  y={minY}
                  width={maxX - minX}
                  height={maxY - minY}
                  fill={section.color || '#2196F3'}
                  fillOpacity={isSelected ? SECTION_OPACITY * 1.5 : SECTION_OPACITY}
                  stroke={section.color || '#2196F3'}
                  strokeWidth={isSelected ? 3 : 2}
                  onClick={handleClick}
                  style={{ cursor: (onSectionClick || onToggleSeats) ? 'pointer' : 'default' }}
                />
              );
            }
            return null;
          })}

          {/* Section Labels */}
          {!showSeats && sections.map((section) => {
            if (section.bounds) {
              const { minX, minY, maxX, maxY } = section.bounds;
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
            const scaledPos = getScaledSeatPosition(seat.x, seat.y);
            const seatX = scaledPos.x + seatOffsetX;
            const seatY = scaledPos.y + seatOffsetY;

            return (
              <g key={seat.placeId}>
                <circle
                  cx={seatX}
                  cy={seatY}
                  r={SEAT_RADIUS}
                  fill={color}
                  stroke={isSelected || isHovered ? '#ffffff' : 'none'}
                  strokeWidth={isSelected || isHovered ? 2 : 0}
                  opacity={seat.status === 'sold' ? 0.5 : 1}
                  onClick={() => {
                    if (!readOnly && seat.status === 'available' && onSeatClick) {
                      onSeatClick(seat.placeId, seat);
                    }
                  }}
                  onMouseEnter={() => {
                    setHoveredSeat(seat.placeId);
                    if (onSeatHover) {
                      onSeatHover(seat.placeId);
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredSeat(null);
                    if (onSeatHover) {
                      onSeatHover(null);
                    }
                  }}
                  style={{
                    cursor: readOnly || seat.status !== 'available' ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                />
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
                {/* Tooltip for hovered seat */}
                {isHovered && seat.row && seat.seat && (
                  <g>
                    {/* Tooltip background */}
                    <rect
                      x={seatX - 55}
                      y={seatY - SEAT_RADIUS - 50}
                      width="110"
                      height="40"
                      rx="4"
                      fill="rgba(0, 0, 0, 0.85)"
                      pointerEvents="none"
                    />
                    {/* Seat info */}
                    <text
                      x={seatX}
                      y={seatY - SEAT_RADIUS - 30}
                      textAnchor="middle"
                      fontSize="13"
                      fill="white"
                      fontWeight="500"
                      pointerEvents="none"
                    >
                      {seat.row} - Seat {seat.seat}
                    </text>
                    {/* Price */}
                    {seat.price && (
                      <text
                        x={seatX}
                        y={seatY - SEAT_RADIUS - 15}
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
                      points={`${seatX - 8},${seatY - SEAT_RADIUS - 10} ${seatX + 8},${seatY - SEAT_RADIUS - 10} ${seatX},${seatY - SEAT_RADIUS}`}
                      fill="rgba(0, 0, 0, 0.85)"
                      pointerEvents="none"
                    />
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default SeatMap;

