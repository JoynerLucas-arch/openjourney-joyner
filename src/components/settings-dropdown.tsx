"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsIcon, KeyIcon } from "lucide-react";
import { ApiKeyDialog } from "@/components/api-key-dialog";

export function SettingsDropdown() {
  const [imageAccessKey, setImageAccessKey] = useState("");
  const [videoAccessKey, setVideoAccessKey] = useState("");
  const [videoModel, setVideoModel] = useState("wan2.6-t2v");
  const [darkMode, setDarkMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);

  useEffect(() => {
    // Function to load credentials from localStorage
    const loadCredentials = () => {
      const savedImageAccessKey = localStorage.getItem("aliyun_image_api_key");
      const savedVideoAccessKey = localStorage.getItem("aliyun_video_api_key");
      const savedVideoModel = localStorage.getItem("aliyun_t2v_model");
      setImageAccessKey(savedImageAccessKey || "");
      setVideoAccessKey(savedVideoAccessKey || "");
      setVideoModel(savedVideoModel || "wan2.6-t2v");
    };

    // Load saved credentials from localStorage
    loadCredentials();

    // Load saved dark mode preference
    const savedDarkMode = localStorage.getItem("openjourney-dark-mode");
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === "true");
    }

    // Listen for credentials updates from other components (like the dialog)
    const handleCredentialsUpdate = () => {
      loadCredentials();
    };

    window.addEventListener('apiKeyUpdated', handleCredentialsUpdate);

    // Cleanup event listener
    return () => {
      window.removeEventListener('apiKeyUpdated', handleCredentialsUpdate);
    };
  }, []);

  useEffect(() => {
    // Apply dark mode to document
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const handleOpenApiKeyDialog = () => {
    setShowApiKeyDialog(true);
  };

  const handleDarkModeToggle = (checked: boolean) => {
    setDarkMode(checked);
    localStorage.setItem("openjourney-dark-mode", checked.toString());
    
    if (checked) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleClearCredentials = () => {
    setImageAccessKey("");
    setVideoAccessKey("");
    localStorage.removeItem("aliyun_image_api_key");
    localStorage.removeItem("aliyun_video_api_key");
    localStorage.removeItem("aliyun_t2v_model");
    localStorage.removeItem("jimeng_image_access_key");
    localStorage.removeItem("jimeng_image_secret_key");
    localStorage.removeItem("jimeng_video_access_key");
    localStorage.removeItem("jimeng_video_secret_key");
    localStorage.removeItem("jimeng_video_model");
    setVideoModel("wan2.6-t2v");
    setSaveStatus("阿里云百炼API Key已清除");
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleVideoModelChange = (value: string) => {
    console.log(`视频模型已切换: ${value}`);
    setVideoModel(value);
    localStorage.setItem("aliyun_t2v_model", value);
    // Trigger a custom event to notify other components
    window.dispatchEvent(new CustomEvent('videoModelUpdated', { detail: { model: value } }));
  };

  const handleApiKeySaved = () => {
    setSaveStatus("阿里云百炼API Key保存成功!");
    setTimeout(() => setSaveStatus(null), 3000);
    // Trigger a custom event to notify other components
    window.dispatchEvent(new CustomEvent('apiKeyUpdated'));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <SettingsIcon className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-4">
        <div className="space-y-4">
          {/* JiMeng AI Credentials Section */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              阿里云百炼API Key
            </Label>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenApiKeyDialog}
                className="w-full justify-start text-xs h-8"
              >
                <KeyIcon className="w-3 h-3 mr-2" />
                配置API凭证
              </Button>
              
              {/* Credentials Status */}
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>图片生成:</span>
                  <span className={imageAccessKey ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                    {imageAccessKey ? "已配置" : "未配置"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>视频生成:</span>
                  <span className={videoAccessKey ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                    {videoAccessKey ? "已配置" : "未配置"}
                  </span>
                </div>
              </div>
              
              {(imageAccessKey || videoAccessKey) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearCredentials}
                  className="text-xs h-7 w-full"
                >
                  清除所有凭证
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              从{" "}
              <a
                href="https://bailian.console.aliyun.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                阿里云百炼控制台
              </a>
              {" "}获取您的API凭证
            </p>
            {saveStatus && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {saveStatus}
              </p>
            )}
          </div>

          <DropdownMenuSeparator />

          {/* Video Model Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              视频生成模型
            </Label>
            <Select value={videoModel} onValueChange={handleVideoModelChange}>
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue placeholder="选择视频模型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wan2.6-t2v">
                  通义万相 视频 2.6
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              选择视频生成模型
            </p>
          </div>

          <DropdownMenuSeparator />

          {/* Dark Mode Section */}
          <div className="flex items-center justify-between py-2">
            <Label htmlFor="dark-mode" className="text-sm font-medium">
              深色模式
            </Label>
            <Switch
              id="dark-mode"
              checked={darkMode}
              onCheckedChange={handleDarkModeToggle}
            />
          </div>

        </div>
      </DropdownMenuContent>
      
      <ApiKeyDialog
         open={showApiKeyDialog}
         onOpenChange={setShowApiKeyDialog}
         onApiKeySaved={handleApiKeySaved}
       />
    </DropdownMenu>
  );
}
