document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('file-upload');
    const uploadBtn = document.getElementById('upload-btn');
    const filesList = document.getElementById('files-list');
    const template = document.getElementById('file-item-template');
    let files = [];
    
    const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024;
    
    function getFileIcon(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        
        // Image files
        if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(extension)) {
            return 'bx-image';
        }
        
        // Document files
        if (['doc', 'docx', 'pdf', 'txt', 'rtf', 'odt', 'md'].includes(extension)) {
            return 'bx-file-doc';
        }
        
        // Spreadsheet files
        if (['xls', 'xlsx', 'csv', 'ods'].includes(extension)) {
            return 'bx-spreadsheet';
        }
        
        // Presentation files
        if (['ppt', 'pptx', 'odp', 'key'].includes(extension)) {
            return 'bx-slideshow';
        }
        
        // Archive files
        if (['zip', 'rar', 'tar', 'gz', '7z', 'iso'].includes(extension)) {
            return 'bx-archive';
        }
        
        // Audio files
        if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(extension)) {
            return 'bx-music';
        }
        
        // Video files
        if (['mp4', 'avi', 'mov', 'wmv', 'mkv', 'flv', 'webm'].includes(extension)) {
            return 'bx-video';
        }
        
        // Code files
        if (['html', 'css', 'js', 'php', 'py', 'java', 'cpp', 'h', 'c', 'cs', 'rb', 'go', 'ts', 'json', 'xml'].includes(extension)) {
            return 'bx-code-alt';
        }
        
        // Font files
        if (['ttf', 'otf', 'woff', 'woff2', 'eot'].includes(extension)) {
            return 'bx-font';
        }
        
        // Default icon for unknown file types
        return 'bx-file';
    }

    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function createFileItem(file) {
        const fileItem = template.content.cloneNode(true);
        const container = fileItem.querySelector('.file-item');
        container.querySelector('.file-name').textContent = file.name;
        container.querySelector('.file-size').textContent = formatBytes(file.size);
        
        // Set dynamic file icon
        const fileIconElement = container.querySelector('.file-icon');
        const iconClass = getFileIcon(file.name);
        fileIconElement.classList.remove('bx-file');
        fileIconElement.classList.add(iconClass);
        
        if (file.size > MAX_FILE_SIZE) {
            container.querySelector('.file-status').textContent = 'Too Large';
            container.querySelector('.file-status').classList.add('text-red-400');
            container.dataset.error = `File size exceeds ${formatBytes(MAX_FILE_SIZE)} limit`;
        } else {
            container.querySelector('.file-status').textContent = 'Ready';
        }
        
        container.querySelector('.progress-bar').style.width = '0%';
        container.querySelector('.remove-file').addEventListener('click', () => {
            container.remove();
            files = files.filter(f => f !== file);
            if (files.length === 0) {
                uploadBtn.classList.add('hidden');
            }
        });
        return container;
    }

    function handleFiles(newFiles) {
        const validFiles = Array.from(newFiles).filter(file => {
            return true;
        });
        
        files = [...files, ...validFiles];
        
        files.forEach(file => {
            if (!filesList.querySelector(`[data-name="${file.name}"]`)) {
                const fileItem = createFileItem(file);
                fileItem.dataset.name = file.name;
                filesList.appendChild(fileItem);
            }
        });
        
        const hasValidFiles = files.some(file => file.size <= MAX_FILE_SIZE);
        if (hasValidFiles) {
            uploadBtn.classList.remove('hidden');
        } else {
            uploadBtn.classList.add('hidden');
        }
    }

    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    uploadBtn.addEventListener('click', async () => {
        uploadBtn.disabled = true;
        uploadBtn.classList.add('opacity-50');
        
        const pendingFiles = files.filter(file => {
            const fileItem = filesList.querySelector(`[data-name="${file.name}"]`);
            return !fileItem.dataset.uploaded && !fileItem.dataset.error && file.size <= MAX_FILE_SIZE;
        });
        
        if (pendingFiles.length === 0) {
            uploadBtn.disabled = false;
            uploadBtn.classList.remove('opacity-50');
            return;
        }
        
        for (let i = 0; i < pendingFiles.length; i++) {
            const file = pendingFiles[i];
            const fileItem = filesList.querySelector(`[data-name="${file.name}"]`);
            
            await uploadSingleFile(file, fileItem);
            
            if (i === pendingFiles.length - 1) {
                uploadBtn.disabled = false;
                uploadBtn.classList.remove('opacity-50');
                
                const remainingValidFiles = files.some(f => {
                    const item = filesList.querySelector(`[data-name="${f.name}"]`);
                    return !item.dataset.uploaded && !item.dataset.error && f.size <= MAX_FILE_SIZE;
                });
                
                if (!remainingValidFiles) {
                    uploadBtn.classList.add('hidden');
                }
            }
        }
    });

    async function uploadSingleFile(file, fileItem) {
        const progressBar = fileItem.querySelector('.progress-bar');
        const status = fileItem.querySelector('.file-status');
        const urlSection = fileItem.querySelector('.url-section');
        const urlInput = urlSection.querySelector('input');
        const copyBtn = fileItem.querySelector('.copy-url');
        const fileProgress = fileItem.querySelector('.file-progress');
        
        if (file.size > MAX_FILE_SIZE) {
            status.textContent = 'Too Large';
            status.classList.add('text-red-400');
            fileItem.dataset.error = `File exceeds the ${formatBytes(MAX_FILE_SIZE)} limit`;
            return;
        }
        
        status.textContent = 'Preparing...';
        progressBar.style.width = '0%';
        
        try {
            const formData = new FormData();
            formData.append('file', file, file.name);
            
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    progressBar.style.width = `${percentComplete}%`;
                    status.textContent = `Uploading... ${percentComplete}%`;
                }
            });
            
            const uploadPromise = new Promise((resolve, reject) => {
                xhr.onload = function() {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            resolve(JSON.parse(xhr.responseText));
                        } catch (e) {
                            reject(new Error('Invalid JSON response from server.'));
                        }
                    } else {
                        let errorDetail = xhr.responseText;
                        try {
                            const errorJson = JSON.parse(xhr.responseText);
                            errorDetail = errorJson.message || errorJson.error || xhr.responseText;
                        } catch (e) {
                            // ignore if response is not json
                        }
                        reject(new Error(`Upload failed: ${xhr.status} ${errorDetail}`));
                    }
                };
                
                xhr.onerror = function() {
                    reject(new Error('Network error during upload.'));
                };

                xhr.open('POST', '/upload', true);
                xhr.send(formData);
            });
            
            const data = await uploadPromise;
            
            if (data.url) {
                fileItem.dataset.uploaded = 'true';
                
                status.textContent = 'Complete';
                progressBar.style.width = '100%';
                fileProgress.classList.remove('loading-shimmer');
                
                urlSection.classList.remove('hidden');
                urlInput.value = data.url;
                
                setupCopyButton(copyBtn, urlInput);
            } else {
                throw new Error('Upload response did not contain a URL.');
            }
        } catch (error) {
            status.textContent = 'Failed';
            status.classList.add('text-red-400');
            fileProgress.classList.remove('loading-shimmer');
            fileItem.dataset.error = error.message;
            console.error('Upload error:', error);
        }
    }

    function setupCopyButton(copyBtn, urlInput) {
        copyBtn.addEventListener('click', () => {
            urlInput.select();
            document.execCommand('copy');
            
            const originalContent = copyBtn.innerHTML;
            
            copyBtn.classList.add('bg-green-800');
            copyBtn.classList.remove('bg-white/5', 'hover:bg-white/10');
            copyBtn.innerHTML = '<i class="bx bx-check text-xs mr-1"></i>Copied';
            
            setTimeout(() => {
                
                copyBtn.classList.remove('bg-green-800');
                copyBtn.classList.add('bg-white/5', 'hover:bg-white/10');
                copyBtn.innerHTML = originalContent;
            }, 1500);
        });
    }

    
    const dropZone = document.getElementById('drop-zone');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('border-white/30');
            dropZone.classList.add('bg-[#161616]');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('border-white/30');
            dropZone.classList.remove('bg-[#161616]');
        }, false);
    });
    
    dropZone.addEventListener('drop', (e) => {
        handleFiles(e.dataTransfer.files);
    });
});
