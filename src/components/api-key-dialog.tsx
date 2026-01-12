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
  const [imageSecretKey, setImageSecretKey] = useState('');
  
  // Video generation credentials
  const [videoAccessKey, setVideoAccessKey] = useState('');
  const [videoSecretKey, setVideoSecretKey] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('image');

  const handleSave = async () => {
    // Check if at least one set of credentials is provided
    const hasImageCredentials = imageAccessKey.trim() && imageSecretKey.trim();
    const hasVideoCredentials = videoAccessKey.trim() && videoSecretKey.trim();
    
    if (!hasImageCredentials && !hasVideoCredentials) {
      return;
    }
    
    setIsLoading(true);
    try {
      // Save image credentials if provided
      if (hasImageCredentials) {
        localStorage.setItem('jimeng_image_access_key', imageAccessKey.trim());
        localStorage.setItem('jimeng_image_secret_key', imageSecretKey.trim());
      }
      
      // Save video credentials if provided
      if (hasVideoCredentials) {
        localStorage.setItem('jimeng_video_access_key', videoAccessKey.trim());
        localStorage.setItem('jimeng_video_secret_key', videoSecretKey.trim());
      }
      
      // Close dialog and notify parent
      onOpenChange(false);
      onApiKeySaved();
      
      // Reset form
      setImageAccessKey('');
      setImageSecretKey('');
      setVideoAccessKey('');
      setVideoSecretKey('');
    } catch (error) {
      console.error('Error saving JiMeng AI credentials:', error);
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
            即梦AI凭证配置
          </DialogTitle>
          <DialogDescription className="text-center">
            您可以分别配置图片生成和视频生成的API凭证。
          </DialogDescription>
          <p className="text-sm text-muted-foreground text-center">
            请从火山引擎控制台获取您的API凭证
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Link to Volcano Engine Console */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.open('https://console.volcengine.com/iam/keymanage/', '_blank')}
          >
            <ExternalLinkIcon className="w-4 h-4 mr-2" />
            获取火山引擎API凭证
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
                  <Label htmlFor="image-access-key">图片生成 Access Key:</Label>
                  <Input
                    id="image-access-key"
                    type="text"
                    placeholder="AKLT..."
                    value={imageAccessKey}
                    onChange={(e) => setImageAccessKey(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image-secret-key">图片生成 Secret Key:</Label>
                  <Input
                    id="image-secret-key"
                    type="password"
                    placeholder="请输入Secret Key"
                    value={imageSecretKey}
                    onChange={(e) => setImageSecretKey(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="video" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="video-access-key">视频生成 Access Key:</Label>
                  <Input
                    id="video-access-key"
                    type="text"
                    placeholder="AKLT..."
                    value={videoAccessKey}
                    onChange={(e) => setVideoAccessKey(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="video-secret-key">视频生成 Secret Key:</Label>
                  <Input
                    id="video-secret-key"
                    type="password"
                    placeholder="请输入Secret Key"
                    value={videoSecretKey}
                    onChange={(e) => setVideoSecretKey(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isLoading || (
              (!imageAccessKey.trim() || !imageSecretKey.trim()) && 
              (!videoAccessKey.trim() || !videoSecretKey.trim())
            )}
            className="w-full"
          >
            {isLoading ? '保存中...' : '保存即梦AI凭证'}
          </Button>

          {/* Help Text */}
          <p className="text-xs text-muted-foreground text-center">
            您的即梦AI凭证将安全地存储在本地浏览器中，不会发送到其他地方。您可以只配置其中一种类型的凭证。
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}