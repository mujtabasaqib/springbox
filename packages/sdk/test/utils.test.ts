import { describe, expect, it } from 'vitest';
import { isSafeUrl, resolveConfig } from '../src/utils';

describe('resolveConfig', () => {
  it('requires publisherId', () => {
    expect(() => resolveConfig({} as never)).toThrow();
  });
  it('strips trailing slash from apiUrl', () => {
    expect(resolveConfig({ publisherId: 'p1', apiUrl: 'http://x.io///' }).apiUrl).toBe('http://x.io');
  });
});

describe('isSafeUrl', () => {
  it('allows http(s) only', () => {
    expect(isSafeUrl('https://a.com/x.png')).toBe(true);
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('data:text/html,hi')).toBe(false);
    expect(isSafeUrl('not a url')).toBe(false);
  });
});