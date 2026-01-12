"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DownloadIcon, ExpandIcon, ClockIcon, TrashIcon } from "lucide-react";
import { motion } from "framer-motion";
import { LightboxModal } from "@/components/lightbox-modal";
import Image from "next/image";
import Hls from "hls.js";

interface VideoGeneration {
  id: string;
  prompt: string;
  videos: Array<{
    id?: string;
    url: string;
    isSample?: boolean;
  }>;
  timestamp: Date;
  isLoading: boolean;
  sourceImage?: string; // For image-to-video conversions
  isSample?: boolean;
}

interface VideoGridProps {
  generation: VideoGeneration;
  onViewFullscreen?: (generationId: string, videoIndex: number) => void;
  onDelete?: (mediaId: string, type: 'image' | 'video') => void;
}

export function VideoGrid({ generation, onViewFullscreen, onDelete }: VideoGridProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const hlsInstances = useRef<(Hls | null)[]>([]);

  useEffect(() => {
    // Initialize HLS for .m3u8 sources
    generation.videos.forEach((videoData, index) => {
      const video = videoRefs.current[index];
      if (!video) return;

      const url = typeof videoData === 'string' ? videoData : videoData.url;
      const isHls = url.includes(".m3u8");

      if (isHls) {
        if (Hls.isSupported()) {
          // Destroy previous instance if any
          hlsInstances.current[index]?.destroy();
          const hls = new Hls({ enableWorker: true });
          hls.loadSource(url);
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
          hlsInstances.current[index] = hls;
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari native HLS support
          video.src = url;
        }
      } else {
        // Non-HLS formats (e.g., mp4)
        video.src = url;
      }
    });

    return () => {
      hlsInstances.current.forEach((hls) => hls?.destroy());
      hlsInstances.current = [];
    };
  }, [generation.videos]);

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "刚刚";
    if (diffInMinutes < 60) return `${diffInMinutes}分钟前`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}小时前`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}天前`;
  };

  const handleDownload = async (videoData: { id?: string; url: string; isSample?: boolean }, index: number) => {
    try {
      const videoUrl = videoData.url;
      const a = document.createElement('a');
      a.href = videoUrl;
      const ext = videoUrl.includes('.m3u8') ? 'm3u8' : 'mp4';
      a.download = `generated-video-${index + 1}.${ext}`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleViewFullscreen = (index: number) => {
    if (onViewFullscreen) {
      onViewFullscreen(generation.id, index);
    } else {
      setLightboxIndex(index);
      setLightboxOpen(true);
    }
  };

  const handleDelete = async (videoData: { id?: string; url: string; isSample?: boolean }, index: number) => {
    // Skip sample videos
    if (videoData.isSample) {
      console.log('Cannot delete sample videos');
      return;
    }

    // Extract filename from URL (this is the actual filename we need for deletion)
    const filename = videoData.url.split('/').pop();
    if (!filename) return;

    if (onDelete) {
      onDelete(filename, 'video');
    }
  };

  const handleRowMouseEnter = () => {
    // Play all videos with error handling
    videoRefs.current.forEach(async (video) => {
      if (video && video.paused && video.readyState >= 3) {
        try {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            await playPromise;
          }
        } catch (error) {
          // Ignore AbortError and other play interruptions
          if ((error as { name: string }).name !== 'AbortError' && (error as { name: string }).name !== 'NotAllowedError') {
            console.warn('Video play failed:', error);
          }
        }
      }
    });
  };

  const handleRowMouseLeave = () => {
    // Pause all videos
    videoRefs.current.forEach((video) => {
      if (video && !video.paused) {
        video.pause();
      }
    });
  };

  // Convert videos to lightbox format
  const lightboxItems = generation.videos.map((videoData, index) => ({
    type: "video" as const,
    url: videoData.url,
    alt: `Generated video ${index + 1} from: ${generation.prompt}`
  }));

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Videos grid - left side */}
      <div 
        className="flex-1"
        onMouseEnter={handleRowMouseEnter}
        onMouseLeave={handleRowMouseLeave}
      >
        <div className={generation.videos.length === 1 ? "max-w-full" : "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"}>
          {generation.videos.map((videoData, index) => {
            const videoUrl = typeof videoData === 'string' ? videoData : videoData.url;
            return (
              <motion.div
                key={index}
                className="relative group cursor-pointer"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                onClick={() => handleViewFullscreen(index)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="overflow-hidden aspect-video border-border/50 relative">
                  {generation.isLoading ? (
                    <div className="absolute inset-0">
                      <Skeleton className="w-full h-full">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
                      </Skeleton>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="absolute inset-0"
                    >
                      {/* Video player */}
                      <video 
                        ref={(el) => { 
                          videoRefs.current[index] = el;
                          if (el) {
                            el.onloadeddata = () => {
                              // Video is ready to play
                            };
                            el.onerror = () => {
                              console.warn(`Video failed to load: ${videoUrl}`);
                            };
                          }
                        }}
                        className="absolute inset-0 w-full h-full object-cover"
                        poster={generation.sourceImage}
                        preload="metadata"
                        muted
                        loop
                        playsInline
                      />
                      
                      {/* Controls at bottom - only visible on hover */}
                      <motion.div
                        className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 flex gap-1 sm:gap-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: hoveredIndex === index ? 1 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(typeof videoData === 'string' ? { url: videoData } : videoData, index);
                          }}
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                        >
                          <DownloadIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewFullscreen(index);
                          }}
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                        >
                          <ExpandIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                        {!generation.isSample && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(typeof videoData === 'string' ? { url: videoData } : videoData, index);
                            }}
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                          >
                            <TrashIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        )}
                      </motion.div>
                    </motion.div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Prompt information - right side */}
      <div className="w-full lg:w-80 flex-shrink-0">
        <div className="lg:sticky lg:top-24">
          <div className="space-y-3">
            {/* Prompt */}
            <div>
              <h3 className="font-medium text-foreground text-lg leading-relaxed">
                {generation.prompt}
              </h3>
            </div>
            
            {/* Format badge */}
            <div className={generation.isSample ? "flex gap-2" : ""}>
              <Badge variant="outline" className="text-xs">
                视频
              </Badge>
              {generation.isSample && (
                <Badge variant="secondary" className="text-xs">
                  示例
                </Badge>
              )}
            </div>
            
            {/* Show source image thumbnail if it's an image-to-video conversion */}
            {generation.sourceImage && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">源图片:</div>
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                  <Image
                    src={generation.sourceImage}
                    alt="Source image"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}
            
            {/* Time generated */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ClockIcon className="w-3 h-3" />
              <span className="whitespace-nowrap">{formatTimeAgo(generation.timestamp)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <LightboxModal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        items={lightboxItems}
        initialIndex={lightboxIndex}
      />
    </div>
  );
}