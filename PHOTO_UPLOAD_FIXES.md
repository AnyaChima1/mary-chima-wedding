# Photo Upload Fixes

This document describes the fixes implemented to resolve the photo upload issues on the wedding website.

## Issues Fixed

### 1. Double Dialog Box Issue
**Problem**: When users clicked the "Upload Files" button, the file selection dialog would appear twice - once from the user's click and again from an automatic trigger in the code.

**Solution**: Removed the automatic file input click in the [selectUploadMethod](file:///Users/macair/Downloads/Mary_Chima_Wedding_Site/script.js#L1428-L1469) function. Users now only see the dialog once when they manually click the upload area or file input.

**Files Modified**: 
- `script.js` - Removed automatic click in [selectUploadMethod](file:///Users/macair/Downloads/Mary_Chima_Wedding_Site/script.js#L1428-L1469) function

### 2. HEIC Image Support for iPhone
**Problem**: iPhone users were unable to upload HEIC format images, which is the default format for photos taken on newer iPhones.

**Solution**: Added HEIC to JPEG conversion functionality that automatically converts HEIC files to JPEG format before upload, ensuring compatibility across all devices and browsers.

**Files Added**:
- `heic-support.js` - Contains HEIC detection and conversion functions
- Updated `index.html` to include the new script

**Functions Added**:
- `isHeicFile(file)` - Detects if a file is in HEIC format
- `convertHeicToJpeg(heicFile)` - Converts HEIC files to JPEG using canvas
- `handleFilesWithHeicSupport(files)` - Enhanced file handling with HEIC conversion

## Implementation Details

### Double Dialog Fix
The fix was simple but effective - we removed these lines from the [selectUploadMethod](file:///Users/macair/Downloads/Mary_Chima_Wedding_Site/script.js#L1428-L1469) function:

```javascript
// Automatically open file picker when file method is selected
setTimeout(() => {
  const fileInput = document.getElementById('photo-files');
  if (fileInput) {
    fileInput.click();
  }
}, 100);
```

### HEIC Support Implementation
The HEIC support works by:

1. **Detection**: The `isHeicFile()` function checks if a file has a `.heic` or `.heif` extension or MIME type
2. **Conversion**: The `convertHeicToJpeg()` function uses the browser's canvas API to convert HEIC images to JPEG format
3. **Integration**: The `handleFilesWithHeicSupport()` function processes all selected files, converting HEIC files while leaving other formats unchanged

## Testing

To test the fixes:

1. **Double Dialog Fix**: Click the "Upload Files" option and verify that the file selection dialog only appears once
2. **HEIC Support**: Try uploading HEIC files from an iPhone or rename a JPEG file to have a `.heic` extension to test the conversion

A test file `test-heic.html` is included for testing HEIC conversion functionality in isolation.

## Browser Compatibility

The HEIC conversion uses standard web APIs (canvas, Blob, File) that are supported in all modern browsers:
- Chrome 50+
- Firefox 42+
- Safari 11+
- Edge 79+

For older browsers that don't support these APIs, the system gracefully falls back to the original behavior.

## Performance Considerations

The HEIC conversion process:
- Only processes files identified as HEIC format
- Uses efficient canvas operations for conversion
- Maintains image quality at 92% JPEG compression
- Processes files asynchronously to avoid blocking the UI
- Has reasonable error handling that falls back to original files if conversion fails