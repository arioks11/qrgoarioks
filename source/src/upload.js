// Optional upload of a photo/video to the OWNER's Supabase Storage bucket.
// The returned public link is what gets encoded in the QR code.
export const MEDIA = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/webm': 'webm' };
export const MAX_BYTES = 50 * 1024 * 1024;

export function validateMedia(f, max = MAX_BYTES) {
  if (!f) return 'Choose a file.';
  if (!MEDIA[f.type]) return 'Only JPG, PNG, WebP, GIF, MP4 or WebM files are allowed.';
  if (!f.size) return 'The file is empty.';
  if (f.size > max) return 'The file is larger than ' + Math.round(max / 1048576) + ' MB.';
  return '';
}
export function readConfig(env) {
  const url = (env.VITE_SUPABASE_URL || '').replace(/\/+$/, ''), key = env.VITE_SUPABASE_ANON_KEY || '', bucket = env.VITE_SUPABASE_BUCKET || '';
  return /^https:\/\/[^/\s]+$/.test(url) && key && /^[\w.-]+$/.test(bucket) ? { url, key, bucket } : null;
}
export const objectPath = (type, id) => 'uploads/' + id + '.' + MEDIA[type];
export const publicUrl = (c, path) => `${c.url}/storage/v1/object/public/${c.bucket}/${path}`;

export function uploadMedia(c, file, onProgress) {
  return new Promise((resolve, reject) => {
    const path = objectPath(file.type, crypto.randomUUID()), x = new XMLHttpRequest();
    x.open('POST', `${c.url}/storage/v1/object/${c.bucket}/${path}`);
    x.setRequestHeader('apikey', c.key);
    x.setRequestHeader('Authorization', 'Bearer ' + c.key);
    x.setRequestHeader('Content-Type', file.type);
    x.setRequestHeader('x-upsert', 'false');
    x.upload.onprogress = e => e.lengthComputable && onProgress && onProgress(e.loaded / e.total);
    x.onload = () => (x.status >= 200 && x.status < 300 ? resolve(publicUrl(c, path)) : reject(new Error('Upload failed (' + x.status + '). Check your bucket and its policies.')));
    x.onerror = () => reject(new Error('Network error during upload.'));
    x.send(file);
  });
}
