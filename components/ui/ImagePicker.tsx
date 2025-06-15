import React, { useRef, useState, useCallback } from "react";
import { Input } from "./input";
import { Button } from "./button";
import { Label } from "./label";

interface ImagePickerProps {
  id?: string;
  label?: string;
  onFileChange: (file: File | null) => void;
  className?: string;
  accept?: string;
}

export function ImagePicker({
  id = "image-picker",
  label,
  onFileChange,
  className = "",
  accept = "image/*",
}: ImagePickerProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setPreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);
        onFileChange(file);
      } else {
        setPreview(null);
        onFileChange(null);
      }
    },
    [onFileChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          setPreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);
        onFileChange(file);
      }
    },
    [onFileChange],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleButtonClick = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    inputRef.current?.click();
  }, []);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div
        className="border border-dashed border-muted-foreground rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer bg-muted/50 hover:bg-muted"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleButtonClick}
        tabIndex={0}
        role="button"
        aria-label="Upload image"
      >
        {preview ? (
          <img src={preview} alt="Preview" className="max-h-40 rounded mb-2" />
        ) : (
          <span className="text-muted-foreground mb-2">
            Click or drag an image here
          </span>
        )}
        <Input
          id={id}
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleInputChange}
        />
        <Button
          type="button"
          variant="outline"
          className="mt-2"
          onClick={function handleButtonClickWrapper(e) {
            handleButtonClick(e);
          }}
        >
          Choose File
        </Button>
      </div>
    </div>
  );
}
