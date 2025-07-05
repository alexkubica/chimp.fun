"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { reactionsMap } from "@/consts";
import { PresetSelectorProps } from "../types";

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
  
  function handleReaction(val: string) {
    onPresetChange(Number(val));
  }

  function handleRandomReaction() {
    const randomReaction = Math.floor(Math.random() * reactionsMap.length) + 1;
    onPresetChange(randomReaction);
  }

  const showAnimationToggle = ["Chimpers", "Chimpers Genesis"].includes(collectionName);

  return (
    <div className="flex flex-col gap-2">
      <Label>Preset</Label>
      <div className="flex gap-2 items-center w-full">
        <div className="flex-1 min-w-0 w-full">
          <SearchableSelect
            items={reactionsMap}
            value={selectedPreset.toString()}
            onValueChange={handleReaction}
            getItemValue={(reaction) =>
              (reactionsMap.indexOf(reaction) + 1).toString()
            }
            getItemLabel={(reaction) => reaction.title}
            getItemKey={(reaction) => reaction.title}
            placeholder="Select Preset"
            searchPlaceholder="Search presets... (e.g. 'gm' for GM!)"
            className="flex-1 min-w-0 w-full"
            fuseOptions={{
              keys: ["title"],
              threshold: 0.3,
              includeScore: true,
            }}
          />
        </div>
        <Button variant="secondary" onClick={handleRandomReaction}>
          🎲
        </Button>
      </div>
      
      {/* Animation toggle for supported collections */}
      {showAnimationToggle && (
        <div className="flex items-center space-x-2 w-full">
          <Switch
            id="playAnimation"
            checked={playAnimation}
            onCheckedChange={onPlayAnimationChange}
          />
          <Label htmlFor="playAnimation">Animation</Label>
        </div>
      )}
      
      {/* Watermark toggle */}
      <div className="flex items-center space-x-2 w-full">
        <Switch
          id="overlayEnabled"
          checked={overlayEnabled}
          onCheckedChange={onOverlayEnabledChange}
        />
        <Label htmlFor="overlayEnabled">Watermark</Label>
      </div>
    </div>
  );
}