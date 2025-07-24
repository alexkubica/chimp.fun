"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import Fuse, { IFuseOptions } from "fuse.js";
import { Button } from "./button";
import { Input } from "./input";

interface MultiSearchableSelectProps<T> {
  items: T[];
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  getItemValue: (item: T) => string;
  getItemLabel: (item: T) => string;
  getItemKey: (item: T) => string;
  className?: string;
  disabled?: boolean;
  fuseOptions?: IFuseOptions<T>;
  maxDisplayItems?: number;
}

export function MultiSearchableSelect<T>({
  items,
  value,
  onValueChange,
  placeholder = "Select items...",
  searchPlaceholder = "Search...",
  getItemValue,
  getItemLabel,
  getItemKey,
  className = "",
  disabled = false,
  fuseOptions = {
    keys: ["name"],
    threshold: 0.3,
    includeScore: true,
  },
  maxDisplayItems = 3,
}: MultiSearchableSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize Fuse.js for fuzzy search
  const fuse = new Fuse(items, fuseOptions);

  // Filter items based on search term
  const filteredItems = searchTerm.trim()
    ? fuse.search(searchTerm).map((result) => result.item)
    : items;

  // Get selected items
  const selectedItems = items.filter((item) =>
    value.includes(getItemValue(item)),
  );

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleItemToggle = (item: T) => {
    const itemValue = getItemValue(item);
    const newValue = value.includes(itemValue)
      ? value.filter((v) => v !== itemValue)
      : [...value, itemValue];
    onValueChange(newValue);
  };

  const handleRemoveItem = (itemValue: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onValueChange(value.filter((v) => v !== itemValue));
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      setSearchTerm("");
    }
  };

  const displayText =
    selectedItems.length === 0
      ? placeholder
      : selectedItems.length <= maxDisplayItems
        ? selectedItems.map(getItemLabel).join(", ")
        : `${selectedItems.slice(0, maxDisplayItems).map(getItemLabel).join(", ")} +${selectedItems.length - maxDisplayItems} more`;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <Button
        type="button"
        variant="outline"
        className={`w-full justify-between text-left font-normal ${
          selectedItems.length === 0 ? "text-muted-foreground" : ""
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className="truncate flex items-center gap-1">
          {displayText}
          {selectedItems.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded">
              {selectedItems.length}
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </Button>

      {/* Selected items tags (when multiple selected) */}
      {selectedItems.length > 0 && selectedItems.length <= maxDisplayItems && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedItems.map((item) => {
            const itemValue = getItemValue(item);
            const itemLabel = getItemLabel(item);
            const itemKey = getItemKey(item);

            return (
              <div
                key={itemKey}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-md"
              >
                <span>{itemLabel}</span>
                <button
                  type="button"
                  onClick={(e) => handleRemoveItem(itemValue, e)}
                  className="hover:bg-primary/20 rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg">
          {/* Search Input */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-8"
              />
            </div>
          </div>

          {/* Clear/Select All buttons */}
          <div className="flex gap-2 p-2 border-b">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onValueChange([])}
              className="flex-1"
            >
              Clear All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onValueChange(items.map(getItemValue))}
              className="flex-1"
            >
              Select All
            </Button>
          </div>

          {/* Items List */}
          <div className="max-h-60 overflow-auto p-1">
            {filteredItems.length === 0 ? (
              <div className="py-2 px-3 text-sm text-muted-foreground">
                No items found
              </div>
            ) : (
              filteredItems.map((item) => {
                const itemValue = getItemValue(item);
                const itemLabel = getItemLabel(item);
                const itemKey = getItemKey(item);
                const isSelected = value.includes(itemValue);

                return (
                  <button
                    key={itemKey}
                    type="button"
                    className={`w-full text-left px-3 py-2 rounded-sm text-sm transition-colors hover:bg-accent hover:text-accent-foreground flex items-center gap-2 ${
                      isSelected
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground"
                    }`}
                    onClick={() => handleItemToggle(item)}
                  >
                    <div
                      className={`w-4 h-4 border rounded flex items-center justify-center ${
                        isSelected
                          ? "bg-primary border-primary"
                          : "border-muted-foreground"
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2 h-2 bg-primary-foreground rounded-sm" />
                      )}
                    </div>
                    {itemLabel}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
