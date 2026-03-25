import { useState, useRef } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface CarouselProps {
  items: React.ReactNode[];
  itemsPerPage: number;
  renderItem: (item: any, index: number) => React.ReactNode;
  cols: number;
  rows?: number;
}

export default function Carousel({ items, itemsPerPage, renderItem, cols, rows }: CarouselProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const isDraggingRef = useRef(false);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const distance = dragStartX.current - endX;
    const isLeftSwipe = distance > 50;

    if (isLeftSwipe && currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    } else if (!isLeftSwipe && distance < -50 && currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }

    dragStartX.current = 0;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start drag if clicking on a button
    if ((e.target as HTMLElement).tagName === 'BUTTON' ||
        (e.target as HTMLElement).closest('button')) {
      return;
    }
    isDraggingRef.current = true;
    dragStartX.current = e.clientX;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;

    isDraggingRef.current = false;

    // Only treat as swipe if there was significant movement
    const distance = dragStartX.current - (e.clientX || 0);
    const isLeftSwipe = distance > 50;

    if (isLeftSwipe && currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    } else if (!isLeftSwipe && distance < -50 && currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }

    dragStartX.current = 0;
  };

  const gridColsClass = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  }[cols] || "grid-cols-4";

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`cursor-grab ${rows ? "flex flex-col flex-1 min-h-0" : ""}`}
      style={{ userSelect: "auto" }}
    >
      {/* Grid */}
      <div
        className={`grid gap-1 ${gridColsClass} ${rows ? "flex-1 min-h-0" : ""}`}
        style={rows ? { gridTemplateRows: `repeat(${rows}, 1fr)` } : undefined}
      >
        {currentItems.map((item, index) => renderItem(item, startIndex + index))}
      </div>

      {/* Page Indicators - Always reserve height when rows mode */}
      <div className={`flex items-center justify-between flex-shrink-0 ${rows ? "h-6 mt-1" : (totalPages <= 1 ? "hidden" : "mt-1")}`}>
        {totalPages > 1 && (
          <>
            <div className="w-6 flex justify-center">
              {currentPage > 0 && (
                <ChevronLeft size={14} className="text-slate-500" />
              )}
            </div>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentPage ? "bg-theme-600" : "bg-slate-300"
                  }`}
                />
              ))}
            </div>
            <div className="w-6 flex justify-center">
              {currentPage < totalPages - 1 && (
                <ChevronRight size={14} className="text-slate-500" />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
