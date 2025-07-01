"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";
import Fuse, { IFuseOptions } from "fuse.js";
import { Button } from "./button";
import { Input } from "./input";

interface SearchableSelectProps<T> {
  items: T[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  getItemValue: (item: T) => string;
  getItemLabel: (item: T) => string;
  getItemKey: (item: T) => string;
  className?: string;
  disabled?: boolean;
  fuseOptions?: IFuseOptions<T>;
}

export function SearchableSelect<T>({
  items,
  value,
  onValueChange,
  placeholder = "Select item...",
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
}: SearchableSelectProps<T>) {
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

  // Get selected item label
  const selectedItem = items.find((item) => getItemValue(item) === value);
  const selectedLabel = selectedItem ? getItemLabel(selectedItem) : placeholder;

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

  const handleItemSelect = (item: T) => {
    onValueChange(getItemValue(item));
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      setSearchTerm("");
    } else if (event.key === "Enter" && filteredItems.length > 0) {
      handleItemSelect(filteredItems[0]);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <Button
        type="button"
        variant="outline"
        className={`w-full justify-between text-left font-normal ${
          !selectedItem ? "text-muted-foreground" : ""
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </Button>

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
                const isSelected = itemValue === value;

                return (
                  <button
                    key={itemKey}
                    type="button"
                    className={`w-full text-left px-3 py-2 rounded-sm text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                      isSelected
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground"
                    }`}
                    onClick={() => handleItemSelect(item)}
                  >
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