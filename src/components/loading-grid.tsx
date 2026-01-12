"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { SparklesIcon, ClockIcon } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

interface LoadingGridProps {
  prompt: string;
  type: "image" | "video";
  sourceImage?: string;
}

export function LoadingGrid({ prompt, type, sourceImage }: LoadingGridProps) {
  const formatTimeAgo = () => "刚刚";

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Loading grid - left side */}
      <div className="flex-1">
        {type === "image" ? (
          <div className="max-w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="overflow-hidden aspect-video border-border/50 relative">
                <div className="absolute inset-0">
                  <Skeleton className="w-full h-full">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
                  </Skeleton>
                </div>
              </Card>
            </motion.div>
          </div>
        ) : (
          <div className="max-w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="overflow-hidden aspect-video border-border/50 relative">
                <div className="absolute inset-0">
                  <Skeleton className="w-full h-full">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
                  </Skeleton>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </div>

      {/* Prompt information - right side */}
      <div className="w-full lg:w-80 flex-shrink-0">
        <div className="lg:sticky lg:top-24">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <ClockIcon className="w-3 h-3" />
              <span className="whitespace-nowrap">{formatTimeAgo()}</span>
              <Badge variant="outline" className="text-xs">
                {type === "image" ? "图片" : "视频"}
              </Badge>
              <motion.div
                className="flex items-center gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <SparklesIcon className="w-3 h-3 animate-pulse text-primary" />
                <span className="text-xs text-primary">生成中...</span>
              </motion.div>
            </div>
            
            {/* Show source image thumbnail immediately for video loading */}
            {type === "video" && sourceImage && (
              <div className="mb-3">
                <div className="text-xs text-muted-foreground mb-2">源图片:</div>
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                  <Image
                    src={sourceImage}
                    alt="Source image"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}
            
            <div>
              <h3 className="font-medium text-foreground text-lg leading-relaxed">
                {prompt}
              </h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}