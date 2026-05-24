import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react';

interface MediaItem {
  id: string;
  url: string;
  media_type: string;
  title?: string | null;
}

interface MediaLightboxProps {
  media: MediaItem[];
  initialIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MediaLightbox({ media, initialIndex, open, onOpenChange }: MediaLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const currentMedia = media[currentIndex];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return;
    
    if (e.key === 'Escape') {
      onOpenChange(false);
    } else if (e.key === 'ArrowLeft') {
      setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
    } else if (e.key === 'ArrowRight') {
      setCurrentIndex((prev) => (prev + 1) % media.length);
    }
  }, [open, media.length, onOpenChange]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open || !currentMedia) return null;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % media.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={() => onOpenChange(false)}
    >
      {/* Close button */}
      <button
        onClick={() => onOpenChange(false)}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        <X size={24} className="text-white" />
      </button>

      {/* Navigation arrows */}
      {media.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            className="absolute left-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronLeft size={32} className="text-white" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            className="absolute right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronRight size={32} className="text-white" />
          </button>
        </>
      )}

      {/* Media content */}
      <div 
        className="max-w-5xl max-h-[85vh] w-full h-full flex items-center justify-center p-4 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {currentMedia.media_type === 'image' && (
          <img
            src={currentMedia.url}
            alt={currentMedia.title || 'Media'}
            className="max-w-full max-h-full object-contain rounded-lg select-none"
            draggable={false}
          />
        )}
        {currentMedia.media_type === 'video' && (
          <video
            src={currentMedia.url}
            controls
            autoPlay
            className="max-w-full max-h-full rounded-lg"
          />
        )}
        {currentMedia.media_type === 'audio' && (
          <div className="w-full max-w-2xl rounded-lg bg-white p-6">
            <p className="mb-4 text-center font-medium text-gray-900">
              {currentMedia.title || 'Audio'}
            </p>
            <audio src={currentMedia.url} controls autoPlay className="w-full" />
          </div>
        )}
      </div>

      {/* Counter */}
      {media.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
          {currentIndex + 1} / {media.length}
        </div>
      )}

      {/* Slide indicators */}
      {media.length > 1 && media.length <= 10 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {media.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                index === currentIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}

      {/* Title */}
      {currentMedia.title && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-lg max-w-md text-center">
          {currentMedia.title}
        </div>
      )}
    </div>
  );
}
