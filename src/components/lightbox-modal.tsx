"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DownloadIcon, XIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Hls from "hls.js";

interface LightboxItem {
  type: "image" | "video";
  url: string;
  alt?: string;
}

interface LightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: LightboxItem[];
  initialIndex: number;
}

export function LightboxModal({ isOpen, onClose, items, initialIndex }: LightboxModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  }, [items.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  }, [items.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, goToPrevious, goToNext, onClose]);

  const handleDownload = () => {
    const currentItem = items[currentIndex];
    const a = document.createElement('a');
    a.href = currentItem.url;
    const isHls = currentItem.url.includes('.m3u8');
    a.download = `generated-${currentItem.type}-${currentIndex + 1}.${currentItem.type === 'image' ? 'png' : (isHls ? 'm3u8' : 'mp4')}`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Setup HLS when current item changes
  useEffect(() => {
    const currentItem = items[currentIndex];

    // Cleanup previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (!currentItem || currentItem.type !== 'video') return;

    const video = videoRef.current;
    if (!video) return;

    const isHls = currentItem.url.includes('.m3u8');

    if (isHls) {
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hls.loadSource(currentItem.url);
        hls.attachMedia(video);
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
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = currentItem.url;
      }
    } else {
      // Non-HLS
      video.src = currentItem.url;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [items, currentIndex]);

  if (!isOpen || items.length === 0) return null;

  const currentItem = items[currentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="bg-black/90" />
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-0 bg-transparent">
        <DialogTitle className="sr-only">
          {currentItem.type === "image" ? "Generated Image Viewer" : "Generated Video Viewer"}
        </DialogTitle>
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
          >
            <XIcon className="w-6 h-6" />
          </Button>

          {/* Download button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="absolute top-4 right-16 z-50 text-white hover:bg-white/20"
          >
            <DownloadIcon className="w-6 h-6" />
          </Button>

          {/* Navigation arrows */}
          {items.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20"
              >
                <ChevronLeftIcon className="w-8 h-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20"
              >
                <ChevronRightIcon className="w-8 h-8" />
              </Button>
            </>
          )}

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="relative max-w-full max-h-full"
            >
              {currentItem.type === "image" ? (
                <div className="relative max-w-[90vw] max-h-[90vh]">
                  <Image
                    src={currentItem.url}
                    alt={currentItem.alt || `Image ${currentIndex + 1}`}
                    width={1024}
                    height={1024}
                    className="max-w-full max-h-[90vh] object-contain"
                  />
                </div>
              ) : (
                <div className="relative max-w-[90vw] max-h-[90vh]">
                  <video 
                    ref={videoRef}
                    controls
                    autoPlay
                    loop
                    className="max-w-full max-h-[90vh] object-contain"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Image counter */}
          {items.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
              <div className="bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {currentIndex + 1} / {items.length}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}