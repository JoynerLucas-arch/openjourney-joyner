"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLinkIcon, KeyIcon, ImageIcon, VideoIcon } from 'lucide-react';

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApiKeySaved: () => void;
}

export function ApiKeyDialog({ open, onOpenChange, onApiKeySaved }: ApiKeyDialogProps) {
  // Image generation credentials
  const [imageAccessKey, setImageAccessKey] = useState('');
  
  // Video generation credentials
  const [videoAccessKey, setVideoAccessKey] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('image');

  const handleSave = async () => {
    // Check if at least one set of credentials is provided
    const hasImageCredentials = imageAccessKey.trim();
    const hasVideoCredentials = videoAccessKey.trim();
    
    if (!hasImageCredentials && !hasVideoCredentials) {
      return;
    }
    
    setIsLoading(true);
    try {
      // Save image credentials if provided
      if (hasImageCredentials) {
        localStorage.setItem('aliyun_image_api_key', imageAccessKey.trim());
      }
      
      // Save video credentials if provided
      if (hasVideoCredentials) {
        localStorage.setItem('aliyun_video_api_key', videoAccessKey.trim());
      }
      
      // Close dialog and notify parent
      onOpenChange(false);
      onApiKeySaved();
      
      // Reset form
      setImageAccessKey('');
      setVideoAccessKey('');
    } catch (error) {
      console.error('Error saving DashScope credentials:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="flex items-center justify-center gap-2 text-xl">
            <KeyIcon className="w-5 h-5" />
            阿里云百炼API Key配置
          </DialogTitle>
          <DialogDescription className="text-center">
            您可以分别配置图片生成和视频生成的API Key。
          </DialogDescription>
          <p className="text-sm text-muted-foreground text-center">
            请从阿里云百炼控制台获取您的API Key
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Link to Volcano Engine Console */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.open('https://bailian.console.aliyun.com/', '_blank')}
          >
            <ExternalLinkIcon className="w-4 h-4 mr-2" />
            获取阿里云百炼API Key
          </Button>

          {/* Tabs for Image and Video Credentials */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="image" className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                图片生成
              </TabsTrigger>
              <TabsTrigger value="video" className="flex items-center gap-2">
                <VideoIcon className="w-4 h-4" />
                视频生成
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="image" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="image-access-key">图片生成 API Key:</Label>
                  <Input
                    id="image-access-key"
                    type="text"
                    placeholder="sk-..."
                    value={imageAccessKey}
                    onChange={(e) => setImageAccessKey(e.target.value)}
                    className="font-mono text-sm"
                    onKeyDown={handleKeyDown}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="video" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="video-access-key">视频生成 API Key:</Label>
                  <Input
                    id="video-access-key"
                    type="text"
                    placeholder="sk-..."
                    value={videoAccessKey}
                    onChange={(e) => setVideoAccessKey(e.target.value)}
                    className="font-mono text-sm"
                    onKeyDown={handleKeyDown}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isLoading || (
              !imageAccessKey.trim() && !videoAccessKey.trim()
            )}
            className="w-full"
          >
            {isLoading ? '保存中...' : '保存阿里云百炼API Key'}
          </Button>

          {/* Help Text */}
          <p className="text-xs text-muted-foreground text-center">
            您的阿里云百炼API Key将安全地存储在本地浏览器中，不会发送到其他地方。您可以只配置其中一种类型的Key。
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
