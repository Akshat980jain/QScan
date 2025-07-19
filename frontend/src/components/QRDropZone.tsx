import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image } from 'lucide-react';

export function QRDropZone() {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      // Here you would implement QR code scanning from the dropped image
      // For now, we'll just log the file
      console.log('Dropped file:', file);
      
      // In a real implementation, you would:
      // 1. Read the file as an image
      // 2. Use a QR code scanning library to decode it
      // 3. Save the decoded content to the library
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']
    },
    multiple: true
  });

  return (
    <div className="mb-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-orange-500 bg-orange-50'
            : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center">
          <div className="p-3 bg-orange-100 rounded-full mb-4">
            {isDragActive ? (
              <Upload className="w-8 h-8 text-orange-600" />
            ) : (
              <Image className="w-8 h-8 text-orange-600" />
            )}
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            {isDragActive ? 'Drop QR images here' : 'Scan QR codes from images'}
          </h3>
          <p className="text-gray-500 text-sm">
            Drag & drop QR code images here, or click to select files
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Supports PNG, JPG, JPEG, GIF, BMP, WebP
          </p>
        </div>
      </div>
    </div>
  );
}