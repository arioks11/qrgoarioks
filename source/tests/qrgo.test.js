import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { TYPES, isUrl } from '../src/payloads.js';
import { parseCSV } from '../src/csv.js';
import { clean } from '../src/utils.js';
const build = (id, v) => TYPES.find(t => t.id === id).build(v);
describe('validation', () => {
  it('accepts only http(s) URLs', () => {
    expect(isUrl('https://example.com/a?b=1')).toBe(true);
    for (const u of ['javascript:alert(1)', 'ftp://x.com', 'example.com', '']) expect(isUrl(u)).toBe(false);
  });
  it('url type throws on bad input', () => expect(() => build('url', { url: 'nope' })).toThrow());
  it('blocks unsafe custom schemes', () => {
    expect(() => build('custom', { c: ' JavaScript:alert(1)' })).toThrow();
    expect(build('custom', { c: 'myapp://x' })).toBe('myapp://x');
  });
  it('validates coordinates', () => {
    expect(build('geo', { lat: '51.7', lng: '19.4' })).toBe('geo:51.7,19.4');
    expect(() => build('geo', { lat: '91', lng: '0' })).toThrow();
    expect(() => build('geo', { lat: '', lng: '' })).toThrow();
  });
  it('rejects event ending before start', () => {
    expect(() => build('event', { t: 'x', s: '2026-01-02T10:00', e: '2026-01-02T09:00' })).toThrow();
    expect(build('event', { t: 'x', s: '2026-01-02T10:00', e: '2026-01-02T11:00' })).toContain('DTSTART:20260102T100000');
  });
});
describe('payloads', () => {
  it('escapes Wi-Fi special characters', () =>
    expect(build('wifi', { ssid: 'my;net', enc: 'WPA', pw: 'p:ss"word1' })).toBe('WIFI:T:WPA;S:my\\;net;P:p\\:ss\\"word1;;'));
  it('open and hidden Wi-Fi; short WPA password rejected', () => {
    expect(build('wifi', { ssid: 'a', enc: 'nopass', hid: 'on' })).toBe('WIFI:T:nopass;S:a;H:true;;');
    expect(() => build('wifi', { ssid: 'a', enc: 'WPA', pw: 'short' })).toThrow();
  });
  it('email, SMS, WhatsApp', () => {
    expect(build('email', { to: 'a@b.co', sub: 'Hi there', body: 'x&y' })).toBe('mailto:a@b.co?subject=Hi%20there&body=x%26y');
    expect(build('sms', { n: '+48 123 456 789', m: 'yo' })).toBe('SMSTO:+48123456789:yo');
    expect(build('wa', { n: '+48 123 456 789', m: 'a b' })).toBe('https://wa.me/48123456789?text=a%20b');
    expect(() => build('email', { to: 'bad' })).toThrow();
  });
  it('vCard', () => {
    const v = build('vcard', { fn: 'Ada', ln: 'Lovelace', org: 'A;B', em: 'a@b.co' });
    expect(v).toContain('FN:Ada Lovelace'); expect(v).toContain('ORG:A\\;B'); expect(v.startsWith('BEGIN:VCARD')).toBe(true);
    expect(() => build('vcard', {})).toThrow();
  });
});
describe('CSV and filenames', () => {
  it('parses quotes, commas, newlines and BOM', () =>
    expect(parseCSV('\uFEFFname,data\r\n"A, B","x ""q"""\n\nc,d')).toEqual([['name', 'data'], ['A, B', 'x "q"'], ['c', 'd']]));
  it('rejects malformed CSV', () => expect(() => parseCSV('a,"b')).toThrow(/Malformed/));
  it('sanitizes filenames', () => {
    expect(clean('https://Ex.com/a b?c=../../etc')).toBe('ex-com-a-b-c-etc');
    expect(clean('')).toBe('qr'); expect(clean('<script>')).toBe('script');
    expect(clean('x'.repeat(100)).length).toBe(40);
  });
});
describe('ZIP', () => {
  it('round-trips files', async () => {
    const z = new JSZip(); z.file('a.png', new Uint8Array([1, 2, 3])); z.file('errors.txt', 'Row 2');
    const r = await JSZip.loadAsync(await z.generateAsync({ type: 'uint8array' }));
    expect(Object.keys(r.files).sort()).toEqual(['a.png', 'errors.txt']);
    expect([...(await r.file('a.png').async('uint8array'))]).toEqual([1, 2, 3]);
  });
});
