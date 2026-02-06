"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ClockIcon } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { LightboxModal } from "@/components/lightbox-modal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ImageGeneration {
  id: string;
  prompt: string;
  images: Array<{
    id?: string;
    url: string;
    imageBytes?: string;
    isSample?: boolean;
  }>;
  timestamp: Date;
  isLoading: boolean;
}

interface ImageGridProps {
  generation: ImageGeneration;
  onImageToVideo?: (imageUrl: string, imageBytes: string, prompt: string) => void;
  onViewFullscreen?: (generationId: string, imageIndex: number) => void;
  onDelete?: (mediaId: string, type: 'image' | 'video') => void;
}

export function ImageGrid({ generation, onImageToVideo, onViewFullscreen, onDelete }: ImageGridProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [convertingToVideo, setConvertingToVideo] = useState<number | null>(null);

  const isSingleImage = generation.images.length === 1;

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

  const handleDownload = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-image-${index + 1}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleConvertToVideo = async (imageData: { url: string; imageBytes?: string; isSample?: boolean }, index: number) => {
    if (!onImageToVideo) {
      console.error('Image to video conversion handler not available');
      return;
    }

    // Skip sample images
    if (imageData.isSample) {
      console.error('Image to video conversion not available for sample images');
      return;
    }

    try {
      setConvertingToVideo(index);
      
      let imageBytes = imageData.imageBytes;
      
      // If no imageBytes (local saved image), fetch and convert to base64
      if (!imageBytes) {
        try {
          const response = await fetch(imageData.url);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          imageBytes = Buffer.from(arrayBuffer).toString('base64');
        } catch (fetchError) {
          console.error('Failed to fetch image for conversion:', fetchError);
          return;
        }
      }
      
      // Trigger the parent handler to create a new video generation row
      onImageToVideo(imageData.url, imageBytes, generation.prompt);
      
    } catch (error) {
      console.error('Video conversion failed:', error);
    } finally {
      setConvertingToVideo(null);
    }
  };

  const handleDelete = async (imageData: { id?: string; url: string; imageBytes?: string; isSample?: boolean }) => {
    // Skip sample images
    if (imageData.isSample) {
      console.log('Cannot delete sample images');
      return;
    }

    // Extract filename from URL (this is the actual filename we need for deletion)
    const filename = imageData.url.split('/').pop();
    if (!filename) return;

    if (onDelete) {
      onDelete(filename, 'image');
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

  // Convert images to lightbox format
  const lightboxItems = generation.images.map((imageData, index) => ({
    type: "image" as const,
    url: imageData.url,
    alt: `Generated image ${index + 1} from: ${generation.prompt}`
  }));

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Images grid - left side */}
      <div className="flex-1">
        <div className={isSingleImage ? "max-w-full" : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"}>
          {generation.images.map((imageData, index) => (
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
              <Card className={`overflow-hidden ${isSingleImage ? 'aspect-video' : 'aspect-square'} border-border/50 relative`}>
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
                    <Image
                      src={imageData.url}
                      alt={`Generated image ${index + 1}`}
                      fill
                      sizes={isSingleImage ? "100vw" : "(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"}
                      className="object-cover w-full h-full"
                      quality={95}
                      priority={index === 0}
                    />
                    
                    {                    /* Hover overlay */}
                    <motion.div
                      className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 rounded-lg"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: hoveredIndex === index ? 1 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                                            <div className="flex flex-col gap-1 sm:gap-2">
                        <div className="flex gap-1 sm:gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(imageData.url, index);
                            }}
                            className="h-6 sm:h-7 px-2 sm:px-3 text-xs font-medium flex-1"
                          >
                            下载
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewFullscreen(index);
                            }}
                            className="h-6 sm:h-7 px-2 sm:px-3 text-xs font-medium flex-1"
                          >
                            展开
                          </Button>
                          {!imageData.isSample && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(imageData, index);
                              }}
                              className="h-6 sm:h-7 px-2 sm:px-3 text-xs font-medium flex-1"
                            >
                              删除
                            </Button>
                          )}
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="w-full">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleConvertToVideo(imageData, index);
                                  }}
                                  disabled={convertingToVideo === index || imageData.isSample}
                                  className="h-6 sm:h-7 px-2 sm:px-3 text-xs font-medium w-full"
                                >
                                  {convertingToVideo === index ? '转换中...' : '制作动画'}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {(convertingToVideo === index || imageData.isSample) && (
                              <TooltipContent side="bottom">
                                <p>
                                  {convertingToVideo === index 
                                    ? '正在转换为视频...'
                                    : "无法为示例图片制作动画，请生成您自己的图片来尝试"
                                  }
                                </p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          ))}
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
            <div className={generation.images.some(img => img.isSample) ? "flex gap-2" : ""}>
              <Badge variant="outline" className="text-xs">
                图片
              </Badge>
              {generation.images.some(img => img.isSample) && (
                <Badge variant="secondary" className="text-xs">
                  示例
                </Badge>
              )}
            </div>
            
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
