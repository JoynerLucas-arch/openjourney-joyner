"use client";

import { useState, useEffect } from "react";
import { ImageGrid } from "@/components/image-grid";
import { VideoGrid } from "@/components/video-grid";
import { LoadingGrid } from "@/components/loading-grid";
import { ApiKeyDialog } from "@/components/api-key-dialog";
import { FocusedMediaView } from "@/components/focused-media-view";
import { motion } from "framer-motion";

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
  sourceImage?: string;
  isSample?: boolean;
}

interface LoadingGeneration {
  id: string;
  prompt: string;
  type: "image" | "video";
  timestamp: Date;
  isLoading: true;
  sourceImage?: string;
}

type Generation = ImageGeneration | VideoGeneration | LoadingGeneration;

// Helper function to convert scanned files to generation format
const convertFilesToGenerations = (files: any[]): Generation[] => {
  const generationMap = new Map<string, Generation>();
  
  files.forEach((file) => {
    // Extract prompt from filename or use default
    const prompt = extractPromptFromFilename(file.filename) || '已保存的生成内容';
    
    // Create a unique generation ID based on timestamp and prompt
    const generationId = `saved-${file.timestamp}-${prompt.substring(0, 20)}`;
    
    if (file.type === 'image') {
      if (generationMap.has(generationId)) {
        // Add to existing image generation
        const existing = generationMap.get(generationId) as ImageGeneration;
        existing.images.push({
          id: file.id,
          url: file.url,
          imageBytes: undefined // No base64 data for saved files
        });
      } else {
        // Create new image generation
        const imageGeneration: ImageGeneration = {
          id: generationId,
          prompt,
          images: [{
            id: file.id,
            url: file.url,
            imageBytes: undefined
          }],
          timestamp: new Date(file.timestamp),
          isLoading: false
        };
        generationMap.set(generationId, imageGeneration);
      }
    } else if (file.type === 'video') {
      // Create new video generation (videos are typically individual)
      const videoGeneration: VideoGeneration = {
        id: `${generationId}-video`,
        prompt,
        videos: [{ id: file.id, url: file.url }],
        timestamp: new Date(file.timestamp),
        isLoading: false
      };
      generationMap.set(`${generationId}-video`, videoGeneration);
    }
  });
  
  return Array.from(generationMap.values());
};

// Helper function to extract prompt from filename
const extractPromptFromFilename = (filename: string): string | undefined => {
  // Extract prompt from filename pattern: generated_xxx_timestamp_prompt.ext
  const match = filename.match(/generated_(?:image|video)_[^_]+_(.+)\.[^.]+$/);
  if (match) {
    // Convert underscores back to spaces and decode
    return match[1].replace(/_/g, ' ');
  }
  return undefined;
};

// Sample data for demonstration with real generated content
const createSampleGenerations = (): Generation[] => [
  // Video generation (most recent)
  {
    id: "sample-video-1",
    prompt: "a race car formula 1 style in a highspeed track",
    videos: [
      { url: "/sample-videos/video-1.mp4", isSample: true },
      { url: "/sample-videos/video-2.mp4", isSample: true }
    ],
    timestamp: new Date(Date.now() - 1000 * 60 * 2), // 2 minutes ago
    isLoading: false,
    isSample: true
  } as VideoGeneration,
  // Image generation 
  {
    id: "sample-image-1",
    prompt: "A majestic ice warrior in blue armor standing in a snowy landscape",
    images: [
      { id: "sample-1", url: "/sample-images/generated-image-1.png", isSample: true },
      { id: "sample-2", url: "/sample-images/generated-image-2.png", isSample: true }, 
      { id: "sample-3", url: "/sample-images/generated-image-3.png", isSample: true },
      { id: "sample-4", url: "/sample-images/generated-image-4.png", isSample: true }
    ],
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    isLoading: false
  } as ImageGeneration
];

export function ContentGrid({ 
  onNewGeneration,
  onImageToVideo 
}: { 
  onNewGeneration?: (handler: (type: "image" | "video", prompt: string) => void) => void;
  onImageToVideo?: (handler: (imageUrl: string, imageBytes: string, prompt: string) => void) => void;
}) {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [focusedView, setFocusedView] = useState<{
    isOpen: boolean;
    mediaItems: Array<{
      id: string;
      type: 'image' | 'video';
      url: string;
      prompt: string;
      timestamp: Date;
      sourceImage?: string;
    }>;
    initialIndex: number;
  }>({ isOpen: false, mediaItems: [], initialIndex: 0 });

  // Initialize with sample data after mount to avoid hydration issues
  useEffect(() => {
    // Load sample generations and saved files
    const loadInitialData = async () => {
      try {
        // Load sample generations
        const sampleGenerations = createSampleGenerations();
        
        // Load saved files from disk
        const response = await fetch('/api/scan-generated');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.files.length > 0) {
            // Convert saved files to generation format
            const savedGenerations = convertFilesToGenerations(data.files);
            // Combine with sample data and sort by timestamp (newest first)
            const allGenerations = [...savedGenerations, ...sampleGenerations];
            allGenerations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            setGenerations(allGenerations);
          } else {
            setGenerations(sampleGenerations);
          }
        } else {
          console.warn('Failed to load saved files, using sample data only');
          setGenerations(sampleGenerations);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
        setGenerations(createSampleGenerations());
      }
    };
    
    loadInitialData();
  }, []);

  // Helper function to gather all media items from generations
  const getAllMediaItems = () => {
    const mediaItems: Array<{
      id: string;
      type: 'image' | 'video';
      url: string;
      prompt: string;
      timestamp: Date;
      sourceImage?: string;
    }> = [];

    generations.forEach((generation) => {
      if (!generation.isLoading) {
        if ('images' in generation) {
          // Image generation
          generation.images.forEach((image, index) => {
            mediaItems.push({
              id: `${generation.id}-img-${index}`,
              type: 'image',
              url: image.url,
              prompt: generation.prompt,
              timestamp: generation.timestamp,
            });
          });
        } else if ('videos' in generation) {
          // Video generation
          generation.videos.forEach((video, index) => {
            const videoUrl = typeof video === 'string' ? video : video.url;
            mediaItems.push({
              id: `${generation.id}-vid-${index}`,
              type: 'video',
              url: videoUrl,
              prompt: generation.prompt,
              timestamp: generation.timestamp,
              sourceImage: generation.sourceImage,
            });
          });
        }
      }
    });

    // Sort by timestamp (newest first)
    return mediaItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  // Function to open focused view
  const openFocusedView = (generationId: string, itemIndex: number) => {
    const allMediaItems = getAllMediaItems();
    
    // Find the specific item index in the global list
    let globalIndex = 0;
    for (let i = 0; i < generations.length; i++) {
      const gen = generations[i];
      if (gen.isLoading) continue;
      
      if (gen.id === generationId) {
        globalIndex += itemIndex;
        break;
      }
      
      if ('images' in gen) {
        globalIndex += gen.images.length;
      } else if ('videos' in gen) {
        globalIndex += gen.videos.length;
      }
    }

    setFocusedView({
      isOpen: true,
      mediaItems: allMediaItems,
      initialIndex: globalIndex,
    });
  };

  const handleNewGeneration = async (type: "image" | "video", prompt: string) => {
    // Get user's credentials from localStorage based on generation type
    const accessKey = type === "image" 
      ? localStorage.getItem("jimeng_image_access_key")
      : localStorage.getItem("jimeng_video_access_key");
    const secretKey = type === "image" 
      ? localStorage.getItem("jimeng_image_secret_key")
      : localStorage.getItem("jimeng_video_secret_key");
    
    const loadingGeneration: LoadingGeneration = {
      id: `loading-${Date.now()}`,
      prompt,
      type,
      timestamp: new Date(),
      isLoading: true
    };

    // Add new loading generation at the top
    setGenerations(prev => [loadingGeneration, ...prev]);

    try {
      if (type === "image") {
        // Call JiMeng AI API
        const response = await fetch('/api/generate-images', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt, accessKey, secretKey }),
        });

        const data = await response.json();

        if (data.success) {
          const completedGeneration: ImageGeneration = {
            id: loadingGeneration.id,
            prompt: loadingGeneration.prompt,
            images: data.images.map((img: { id: string; url: string; imageBytes: string }) => ({
              id: img.id,
              url: img.url,
              imageBytes: img.imageBytes
            })),
            timestamp: loadingGeneration.timestamp,
            isLoading: false
          };

          setGenerations(prev => prev.map(gen => 
            gen.id === loadingGeneration.id ? completedGeneration : gen
          ));
        } else {
          throw new Error(data.error || '图片生成失败');
        }
      } else {
        // Call JiMeng AI API for text-to-video
        // Get selected video model from localStorage
        const selectedModel = localStorage.getItem("jimeng_video_model") || "jimeng_t2v_v30_1080p";
        
        const response = await fetch('/api/generate-videos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt, accessKey, secretKey, model: selectedModel }),
        });

        const data = await response.json();

        if (data.success) {
          const completedGeneration: VideoGeneration = {
            id: loadingGeneration.id,
            prompt: loadingGeneration.prompt,
            videos: data.videos.map((vid: { id: string; url: string }) => ({
              id: vid.id,
              url: vid.url
            })),
            timestamp: loadingGeneration.timestamp,
            isLoading: false
          };

          setGenerations(prev => prev.map(gen => 
            gen.id === loadingGeneration.id ? completedGeneration : gen
          ));
        } else {
          throw new Error(data.error || '视频生成失败');
        }
      }
    } catch (error) {
      console.error('Generation failed:', error);
      // Remove the loading generation on error
      setGenerations(prev => prev.filter(gen => gen.id !== loadingGeneration.id));
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : '生成失败';
      if (errorMessage.includes('API') || errorMessage.includes('credentials')) {
        setShowApiKeyDialog(true);
      } else {
        alert(`生成失败: ${errorMessage}`);
      }
    }
  };

  const handleImageToVideo = async (imageUrl: string, imageBytes: string, prompt: string) => {
    // Get user's credentials from localStorage for video generation
    const accessKey = localStorage.getItem("jimeng_video_access_key");
    const secretKey = localStorage.getItem("jimeng_video_secret_key");
    // Get selected video model from localStorage
    const selectedModel = localStorage.getItem("jimeng_video_model") || "jimeng_i2v_first_v30_1080";
    
    const loadingGeneration: LoadingGeneration = {
      id: `video-loading-${Date.now()}`,
      prompt: `${prompt} - animated video`,
      type: "video",
      timestamp: new Date(),
      isLoading: true,
      sourceImage: imageUrl
    };

    // Add new loading generation at the top
    setGenerations(prev => [loadingGeneration, ...prev]);

    try {
      const response = await fetch('/api/image-to-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: `${prompt} - animated video`,
          imageBytes,
          accessKey,
          secretKey,
          model: selectedModel
        }),
      });

      const data = await response.json();

      if (data.success) {
        const completedGeneration: VideoGeneration = {
          id: loadingGeneration.id,
          prompt: loadingGeneration.prompt,
          videos: data.videos.map((vid: { id: string; url: string }) => ({
            id: vid.id,
            url: vid.url
          })),
          timestamp: loadingGeneration.timestamp,
          isLoading: false,
          sourceImage: imageUrl
        };

        setGenerations(prev => prev.map(gen => 
          gen.id === loadingGeneration.id ? completedGeneration : gen
        ));
      } else {
          throw new Error(data.error || '视频转换失败');
        }
    } catch (error) {
      console.error('Video conversion failed:', error);
      // Remove the loading generation on error
      setGenerations(prev => prev.filter(gen => gen.id !== loadingGeneration.id));
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : '视频转换失败';
      if (errorMessage.includes('API') || errorMessage.includes('credentials')) {
        setShowApiKeyDialog(true);
      } else {
        alert(`视频转换失败: ${errorMessage}`);
      }
    }
  };

  // Handle delete functionality
  const handleDelete = async (mediaId: string, type: 'image' | 'video') => {
    try {
      const response = await fetch(`/api/media/delete?id=${mediaId}&type=${type}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh the media list by reloading from disk
        try {
          const response = await fetch('/api/scan-generated');
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              // Convert saved files to generation format
              const savedGenerations = convertFilesToGenerations(data.files);
              // Combine with sample data, with saved files first
              const sampleGenerations = createSampleGenerations();
              const allGenerations = [...savedGenerations, ...sampleGenerations];
              // Sort by timestamp (newest first)
              allGenerations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
              setGenerations(allGenerations);
            }
          }
        } catch (refreshError) {
          console.error('Error refreshing media list:', refreshError);
          // Fallback to manual state update if refresh fails
          setGenerations(prev => {
            return prev.map(generation => {
              if (!generation.isLoading) {
                if ('images' in generation && type === 'image') {
                  // Remove the deleted image from the generation
                  const updatedImages = generation.images.filter(img => {
                    // Use the ID directly if available, otherwise extract from URL
                    const imgId = img.id || 
                      (img.url.includes('generated-images') ? 
                        img.url.split('/').pop()?.split('.')[0] : mediaId);
                    return imgId !== mediaId;
                  });
                  // If no images left, remove the entire generation
                  if (updatedImages.length === 0) {
                    return null;
                  }
                  return { ...generation, images: updatedImages };
                } else if ('videos' in generation && type === 'video') {
                  // Remove the deleted video from the generation
                  const updatedVideos = generation.videos.filter(video => {
                    // Handle both string and object formats
                    const videoUrl = typeof video === 'string' ? video : video.url;
                    const videoId = typeof video === 'object' && video.id ? 
                      video.id : 
                      (videoUrl.includes('generated-videos') ? 
                        videoUrl.split('/').pop()?.split('.')[0] : mediaId);
                    return videoId !== mediaId;
                  });
                  // If no videos left, remove the entire generation
                  if (updatedVideos.length === 0) {
                    return null;
                  }
                  return { ...generation, videos: updatedVideos };
                }
              }
              return generation;
            }).filter(Boolean) as Generation[];
          });
        }
      } else {
        const errorData = await response.json();
        alert(`删除失败: ${errorData.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('删除失败，请稍后重试');
    }
  };

  // Use useEffect to avoid setState during render
  useEffect(() => {
    if (onNewGeneration) {
      onNewGeneration(handleNewGeneration);
    }
    if (onImageToVideo) {
      onImageToVideo(handleImageToVideo);
    }
  }, [onNewGeneration, onImageToVideo]);

  return (
    <>
      <div className="space-y-8">
      {generations.map((generation) => (
        <motion.div
          key={generation.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {generation.isLoading ? (
            <LoadingGrid 
              prompt={generation.prompt}
              type={"type" in generation ? generation.type : "image"}
              sourceImage={"sourceImage" in generation ? generation.sourceImage : undefined}
            />
          ) : "images" in generation ? (
            <ImageGrid 
              generation={generation}
              onImageToVideo={handleImageToVideo}
              onViewFullscreen={openFocusedView}
              onDelete={handleDelete}
            />
          ) : (
            <VideoGrid 
              generation={generation} 
              onViewFullscreen={openFocusedView}
              onDelete={handleDelete}
            />
          )}
        </motion.div>
      ))}
      
      {generations.length === 0 && (
        <div className="text-center py-16">
          <h3 className="text-lg font-medium mb-2">准备创造一些令人惊叹的内容吗？</h3>
          <p className="text-muted-foreground">
            使用上方的提示栏生成您的第一张图片或视频。
          </p>
        </div>
      )}
    </div>

      <ApiKeyDialog
        open={showApiKeyDialog}
        onOpenChange={setShowApiKeyDialog}
        onApiKeySaved={() => {
          console.log('Google Gemini API key saved successfully');
          // Trigger a custom event to notify settings dropdown to refresh
          window.dispatchEvent(new CustomEvent('apiKeyUpdated'));
        }}
      />

      <FocusedMediaView
        isOpen={focusedView.isOpen}
        onClose={() => setFocusedView(prev => ({ ...prev, isOpen: false }))}
        mediaItems={focusedView.mediaItems}
        initialIndex={focusedView.initialIndex}
        onImageToVideo={handleImageToVideo}
      />
    </>
  );
}