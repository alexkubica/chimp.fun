"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { reactionsMap } from "@/consts";
import { PresetSelectorProps } from "../types";

/**
 * Preset Selector Component
 * Handles reaction preset selection and animation settings
 */
export function PresetSelector({
  selectedPreset,
  onPresetChange,
  onRandomPreset,
  playAnimation,
  onPlayAnimationChange,
  overlayEnabled,
  onOverlayEnabledChange,
  collectionName,
}: PresetSelectorProps) {
  const handlePresetChange = (val: string) => {
    onPresetChange(Number(val));
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="preset">Reaction Preset</Label>
      <div className="flex gap-2">
        <Select
          value={selectedPreset.toString()}
          onValueChange={handlePresetChange}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select preset" />
          </SelectTrigger>
          <SelectContent>
            {reactionsMap.map((reaction, index) => (
              <SelectItem key={index + 1} value={(index + 1).toString()}>
                {reaction.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="secondary" onClick={onRandomPreset}>
          🎲
        </Button>
      </div>

      {/* Animation Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="animated" className="text-sm">
          Animated (GIF)
        </Label>
        <Switch
          id="animated"
          checked={playAnimation}
          onCheckedChange={onPlayAnimationChange}
        />
      </div>

      {/* Watermark Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="watermark" className="text-sm">
          Include CHIMP.FUN watermark
        </Label>
        <Switch
          id="watermark"
          checked={overlayEnabled}
          onCheckedChange={onOverlayEnabledChange}
        />
      </div>

      {/* Collection Info */}
      <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
        Collection: {collectionName}
      </div>
    </div>
  );
}
