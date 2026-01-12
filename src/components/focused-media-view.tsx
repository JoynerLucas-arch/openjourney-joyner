"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Hls from 'hls.js';

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt: string;
  timestamp: Date;
  sourceImage?: string;
}

interface FocusedMediaViewProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItems: MediaItem[];
  initialIndex: number;
  onImageToVideo?: (imageUrl: string, imageBytes: string, prompt: string) => void;
}

export function FocusedMediaView({
  isOpen,
  onClose,
  mediaItems,
  initialIndex,
  onImageToVideo
}: FocusedMediaViewProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const filmStripRef = useRef<HTMLDivElement>(null);
  const currentItem = mediaItems[currentIndex];

  const mainVideoRef = useRef<HTMLVideoElement | null>(null);
  const sidebarVideoRef = useRef<HTMLVideoElement | null>(null);
  const hlsMainRef = useRef<Hls | null>(null);
  const hlsSidebarRef = useRef<Hls | null>(null);

  // Update current index when initial index changes
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Setup HLS for current video when item changes
  useEffect(() => {
    const setupHls = (videoEl: HTMLVideoElement | null, url: string | undefined, hlsRef: React.MutableRefObject<Hls | null>) => {
      // Cleanup previous
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (!videoEl || !url) return;

      const isHls = url.includes('.m3u8');
      if (isHls) {
        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true });
          hls.loadSource(url);
          hls.attachMedia(videoEl);
          hls.on(Hls.Events.ERROR, function (event, data) {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError();
                  break;
                default:
                  hls.destroy();
                  break;
              }
            }
          });
          hlsRef.current = hls;
        } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
          videoEl.src = url;
        }
      } else {
        // Non-HLS
        videoEl.src = url;
      }
    };

    if (!isOpen) return;
    const url = currentItem?.url;
    setupHls(mainVideoRef.current, url, hlsMainRef);
    setupHls(sidebarVideoRef.current, url, hlsSidebarRef);

    return () => {
      hlsMainRef.current?.destroy();
      hlsMainRef.current = null;
      hlsSidebarRef.current?.destroy();
      hlsSidebarRef.current = null;
    };
  }, [isOpen, currentItem]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          setCurrentIndex((prev) => Math.max(0, prev - 1));
          break;
        case 'ArrowRight':
          setCurrentIndex((prev) => Math.min(mediaItems.length - 1, prev + 1));
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, mediaItems.length]);

  // Scroll film strip to current item, with a center focus
  useEffect(() => {
    if (filmStripRef.current && isOpen && mediaItems.length > 0) {
      const currentThumb = filmStripRef.current.children[currentIndex] as HTMLElement;
      if (currentThumb) {
        currentThumb.scrollIntoView({
          behavior: 'auto', // Scroll instantly, let Framer Motion handle the animation
          block: 'center',
          inline: 'center'
        });
      }
    }
  }, [currentIndex, isOpen, mediaItems.length]);

  // Handle page-level wheel scroll with smooth sensitivity
  useEffect(() => {
    if (!isOpen) return;

    let accumulatedDelta = 0;
    const scrollThreshold = 100; // Threshold before triggering navigation
    let isScrolling = false;

    const handlePageWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // Accumulate scroll delta
      accumulatedDelta += e.deltaY;
      
      // Only navigate when we've accumulated enough scroll
      if (Math.abs(accumulatedDelta) >= scrollThreshold && !isScrolling) {
        isScrolling = true;
        
        const direction = accumulatedDelta > 0 ? 1 : -1;
        setCurrentIndex((prev) => {
          const newIndex = prev + direction;
          return Math.max(0, Math.min(mediaItems.length - 1, newIndex));
        });
        
        // Reset accumulated delta
        accumulatedDelta = 0;
        
        // Prevent rapid consecutive scrolls
        setTimeout(() => {
          isScrolling = false;
        }, 150);
      }
    };

    // Add wheel event listener to the entire document
    document.addEventListener('wheel', handlePageWheel, { passive: false });
    
    return () => {
      document.removeEventListener('wheel', handlePageWheel);
    };
  }, [isOpen, mediaItems.length]);

  const handleDownload = () => {
    if (!currentItem) return;
    
    const link = document.createElement('a');
    link.href = currentItem.url;
    const isHls = currentItem.url.includes('.m3u8');
    link.download = `${currentItem.type}_${currentItem.id}.${currentItem.type === 'video' ? (isHls ? 'm3u8' : 'mp4') : 'png'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  if (!isOpen || !currentItem) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background"
      >
        {/* Mobile Layout - Stacked vertically */}
        <div className="flex flex-col h-full md:hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {currentItem.type === 'image' ? '图片' : '视频'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} / {mediaItems.length}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Media Display */}
          <div className="flex-1 flex items-center justify-center p-4 min-h-0">
            <div className="w-full h-full max-w-4xl max-h-full relative">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full flex items-center justify-center"
              >
                {currentItem.type === 'image' ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={currentItem.url}
                      alt={currentItem.prompt}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 80vw"
                    />
                  </div>
                ) : (
                  <video
                    ref={mainVideoRef}
                    controls
                    autoPlay
                    loop
                    className="max-w-full max-h-full object-contain"
                  />
                )}
              </motion.div>
            </div>
          </div>

          {/* Metadata Panel */}
          <div className="border-t bg-card p-4 space-y-4">
            <div>
              <h3 className="font-medium mb-2">提示词</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {currentItem.prompt}
              </p>
            </div>
            
            {currentItem.sourceImage && (
              <div>
                <div className="text-sm font-medium mb-2">源图片</div>
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                  <Image
                    src={currentItem.sourceImage}
                    alt="Source image"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Layout - Split view */}
        <div className="hidden md:flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {currentItem.type === 'image' ? '图片' : '视频'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} / {mediaItems.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" /> 下载
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex min-h-0">
            {/* Large Media Display */}
            <div className="flex-1 flex items-center justify-center p-8 min-h-0">
              <div className="w-full h-full max-w-5xl max-h-full relative">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full flex items-center justify-center"
                >
                  {currentItem.type === 'image' ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={currentItem.url}
                        alt={currentItem.prompt}
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, 60vw"
                      />
                    </div>
                  ) : (
                    <video
                      ref={mainVideoRef}
                      controls
                      autoPlay
                      loop
                      className="max-w-full max-h-full object-contain"
                    />
                  )}
                </motion.div>
              </div>
            </div>

            {/* Sidebar and Film Strip */}
            <div className="w-96 border-l flex flex-col min-h-0">
              {/* Navigation */}
              <div className="flex items-center justify-between p-4 border-b">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentIndex + 1} / {mediaItems.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentIndex((prev) => Math.min(mediaItems.length - 1, prev + 1))}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>

              {/* Film Strip */}
              <div ref={filmStripRef} className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
                {mediaItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer border ${index === currentIndex ? 'border-primary' : 'border-transparent hover:bg-muted/50'}`}
                    onClick={() => setCurrentIndex(index)}
                  >
                    <div className="w-16 h-10 relative flex-shrink-0">
                      {item.type === 'image' ? (
                        <Image
                          src={item.url}
                          alt={item.prompt}
                          fill
                          className="object-cover rounded-sm"
                        />
                      ) : (
                        <video
                          ref={index === currentIndex ? sidebarVideoRef : null}
                          src={undefined}
                          className="w-full h-full object-cover rounded-sm"
                          muted
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.prompt}</div>
                      <div className="text-xs text-muted-foreground truncate">{new Date(item.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}