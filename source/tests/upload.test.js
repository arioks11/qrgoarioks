import { describe, it, expect } from 'vitest';
import { validateMedia, readConfig, objectPath, publicUrl } from '../src/upload.js';
const f = (type, size) => ({ type, size });
describe('media upload helpers', () => {
  it('validates type and size', () => {
    expect(validateMedia(f('image/png', 10))).toBe('');
    expect(validateMedia(f('video/mp4', 10))).toBe('');
    expect(validateMedia(f('application/pdf', 10))).toMatch(/Only/);
    expect(validateMedia(f('image/svg+xml', 10))).toMatch(/Only/);
    expect(validateMedia(f('video/mp4', 0))).toMatch(/empty/);
    expect(validateMedia(f('video/mp4', 60 * 1048576))).toMatch(/larger/);
    expect(validateMedia(null)).toMatch(/Choose/);
  });
  it('reads config only when complete and https', () => {
    expect(readConfig({})).toBeNull();
    expect(readConfig({ VITE_SUPABASE_URL: 'http://x.co', VITE_SUPABASE_ANON_KEY: 'k', VITE_SUPABASE_BUCKET: 'b' })).toBeNull();
    expect(readConfig({ VITE_SUPABASE_URL: 'https://x.supabase.co/', VITE_SUPABASE_ANON_KEY: 'k', VITE_SUPABASE_BUCKET: 'qrgo' })).toEqual({ url: 'https://x.supabase.co', key: 'k', bucket: 'qrgo' });
  });
  it('builds safe paths and public URLs', () => {
    expect(objectPath('video/webm', 'abc')).toBe('uploads/abc.webm');
    expect(publicUrl({ url: 'https://x.supabase.co', bucket: 'qrgo' }, 'uploads/abc.png')).toBe('https://x.supabase.co/storage/v1/object/public/qrgo/uploads/abc.png');
  });
});
