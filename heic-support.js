// HEIC Image Support for Wedding Website

// Function to check if a file is HEIC format
function isHeicFile(file) {
  // Check file extension
  const fileName = file.name.toLowerCase();
  const isHeicExtension = fileName.endsWith('.heic') || fileName.endsWith('.heif');
  
  // Check MIME type if available
  const isHeicMime = file.type === 'image/heic' || file.type === 'image/heif';
  
  return isHeicExtension || isHeicMime;
}

// Function to dynamically load heic2any library
function loadHeic2anyLibrary() {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof heic2any !== 'undefined') {
      resolve();
      return;
    }
    
    // Create script element
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load HEIC conversion library'));
    
    // Add to document
    document.head.appendChild(script);
  });
}

// Function to convert HEIC to JPEG using heic2any library
async function convertHeicToJpeg(heicFile) {
  try {
    // Dynamically load heic2any library if not already loaded
    await loadHeic2anyLibrary();
    
    // Convert HEIC to JPEG using the library
    const jpegBlob = await heic2any({
      blob: heicFile,
      toType: 'image/jpeg',
      quality: 0.92
    });
    
    // Create a new file with JPEG extension
    const jpegFile = new File([jpegBlob], heicFile.name.replace(/\.(heic|heif)$/i, '.jpg'), {
      type: 'image/jpeg',
      lastModified: Date.now()
    });
    
    return jpegFile;
  } catch (error) {
    throw new Error('Failed to convert HEIC image: ' + error.message);
  }
}

// Enhanced file handling with HEIC support
function handleFilesWithHeicSupport(files) {
  const validFiles = files.filter(file => {
    const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/');
    const isSmallEnough = file.size <= 10 * 1024 * 1024; // 10MB
    return isValidType && isSmallEnough;
  });
  
  // Process files with HEIC conversion if needed
  Promise.all(validFiles.map(async (file) => {
    if (isHeicFile(file)) {
      try {
        // Convert HEIC to JPEG
        const jpegFile = await convertHeicToJpeg(file);
        console.log('Successfully converted HEIC file:', file.name, 'to', jpegFile.name);
        return jpegFile;
      } catch (error) {
        console.warn('Failed to convert HEIC file:', file.name, error);
        // If conversion fails, keep original file
        return file;
      }
    }
    return file;
  })).then(processedFiles => {
    // Update the global selectedFiles array
    selectedFiles = [...selectedFiles, ...processedFiles];
    updateFilePreview();
  }).catch(error => {
    console.error('Error processing files:', error);
    // Fallback to original behavior
    selectedFiles = [...selectedFiles, ...validFiles];
    updateFilePreview();
  });
}