import { useState, useCallback, useMemo } from 'react';
import { SensorReading } from '../types/sensor';

export interface GridConfig {
  viewBoxWidth: number;
  viewBoxHeight: number;
  padding: number;
  gridMinX: number;
  gridMaxX: number;
  gridMinY: number;
  gridMaxY: number;
}

const DEFAULT_CONFIG: GridConfig = {
  viewBoxWidth: 600,
  viewBoxHeight: 600,
  padding: 40,
  gridMinX: 0,
  gridMaxX: 60,
  gridMinY: 0,
  gridMaxY: 60,
};

export function useSurveyGrid(config: Partial<GridConfig> = {}) {
  const mergedConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeLayers, setActiveLayers] = useState({
    normal: true,
    weak: true,
    strong: true,
  });

  const { viewBoxWidth, viewBoxHeight, padding, gridMinX, gridMaxX, gridMinY, gridMaxY } = mergedConfig;
  const innerWidth = viewBoxWidth - padding * 2;
  const innerHeight = viewBoxHeight - padding * 2;

  // Converts Cartesian survey (X, Y) to SVG coordinates (origin bottom-left in survey space)
  const mapToSvg = useCallback(
    (x: number, y: number): { svgX: number; svgY: number } => {
      const normX = (x - gridMinX) / (gridMaxX - gridMinX || 1);
      const normY = (y - gridMinY) / (gridMaxY - gridMinY || 1);

      const svgX = padding + normX * innerWidth;
      // Invert Y so that Y=0 is at the bottom
      const svgY = viewBoxHeight - padding - normY * innerHeight;

      return { svgX, svgY };
    },
    [gridMinX, gridMaxX, gridMinY, gridMaxY, padding, innerWidth, innerHeight, viewBoxHeight]
  );

  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 4.0));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.25, 0.75));
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const centerOnPoint = useCallback(
    (reading: SensorReading) => {
      const { svgX, svgY } = mapToSvg(reading.x, reading.y);
      const centerX = viewBoxWidth / 2;
      const centerY = viewBoxHeight / 2;
      setPan({
        x: centerX - svgX * zoom,
        y: centerY - svgY * zoom,
      });
    },
    [mapToSvg, viewBoxWidth, viewBoxHeight, zoom]
  );

  const toggleLayer = useCallback((layer: 'normal' | 'weak' | 'strong') => {
    setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  return {
    config: mergedConfig,
    zoom,
    pan,
    setPan,
    setZoom,
    mapToSvg,
    zoomIn,
    zoomOut,
    resetView,
    centerOnPoint,
    activeLayers,
    toggleLayer,
  };
}
