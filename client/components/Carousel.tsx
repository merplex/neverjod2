import { useState, useRef } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface CarouselProps {
  items: React.ReactNode[];
  itemsPerPage: number;
  renderItem: (item: any, index: number) => React.ReactNode;
  cols: number;
}

export default function Carousel({ items, itemsPerPage, renderItem, cols }: CarouselProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEnd(e.changedTouches[0].clientX);
    handleSwipe();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setTouchStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTouchEnd(e.clientX);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    handleSwipe();
  };

  const handleSwipe = () => {
    if (touchStart === 0) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50; // Swipe distance threshold

    if (isLeftSwipe && currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    } else if (!isLeftSwipe && distance < -50 && currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }

    // Reset touch values
    setTouchStart(0);
    setTouchEnd(0);
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
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={isDragging ? "cursor-grabbing" : "cursor-grab"}
      style={{ userSelect: isDragging ? "none" : "auto" }}
    >
      {/* Grid */}
      <div className={`grid gap-3 ${gridColsClass}`}>
        {currentItems.map((item, index) => renderItem(item, startIndex + index))}
      </div>

      {/* Page Indicators - Only show if more than 1 page */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          {/* Left Arrow - Show only if not on first page */}
          {currentPage > 0 && (
            <ChevronLeft size={14} className="text-slate-500" />
          )}

          {/* Dots - Centered */}
          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentPage ? "bg-indigo-600" : "bg-slate-300"
                }`}
              />
            ))}
          </div>

          {/* Right Arrow - Show only if not on last page */}
          {currentPage < totalPages - 1 && (
            <ChevronRight size={14} className="text-slate-500" />
          )}
        </div>
      )}
    </div>
  );
}
