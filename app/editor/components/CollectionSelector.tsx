"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { collectionsMetadata } from "@/consts";
import { CollectionSelectorProps } from "../types";

export function CollectionSelector({
  selectedIndex,
  onSelectionChange,
  onClearWalletSelection,
}: CollectionSelectorProps) {
  
  function handleCollectionChange(val: string) {
    const newCollectionIndex = Number(val);
    onSelectionChange(newCollectionIndex);
    onClearWalletSelection(); // Clear wallet selection when manually changing collection
  }

  function handleRandomCollection() {
    const randomIndex = Math.floor(Math.random() * collectionsMetadata.length);
    onSelectionChange(randomIndex);
    onClearWalletSelection(); // Clear wallet selection when randomly changing collection
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="collection">Collection</Label>
      <div className="flex gap-2">
        <SearchableSelect
          items={collectionsMetadata}
          value={selectedIndex.toString()}
          onValueChange={handleCollectionChange}
          getItemValue={(collection) =>
            collectionsMetadata.indexOf(collection).toString()
          }
          getItemLabel={(collection) => collection.name}
          getItemKey={(collection) => collection.name}
          placeholder="Select collection"
          searchPlaceholder="Search collections... (e.g. 'doo' for Doodles)"
          className="flex-1 min-w-0 w-full"
          fuseOptions={{
            keys: ["name"],
            threshold: 0.3,
            includeScore: true,
          }}
        />
        <Button variant="secondary" onClick={handleRandomCollection}>
          🎲
        </Button>
      </div>
    </div>
  );
}