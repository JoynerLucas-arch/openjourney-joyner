"use client";

import { PromptBar } from "@/components/prompt-bar";
import { ContentGrid } from "@/components/content-grid";
import { useState, useCallback } from "react";

export default function Home() {
  const [generateHandler, setGenerateHandler] = useState<((type: "image" | "video", prompt: string) => void) | null>(null);


  const handleSetGenerator = useCallback((handler: (type: "image" | "video", prompt: string) => void) => {
    setGenerateHandler(() => handler);
  }, []);

  const handleSetImageToVideo = useCallback(() => {
    // Handler is set up in ContentGrid component
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed prompt bar at top */}
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <PromptBar onGenerate={generateHandler || undefined} />
      </div>
      
      {/* Main content area */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ContentGrid 
          onNewGeneration={handleSetGenerator}
          onImageToVideo={handleSetImageToVideo}
        />
      </main>
    </div>
  );
}
