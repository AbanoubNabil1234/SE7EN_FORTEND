import { afterEach, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { compressCategoryImage } from './category-image.ts';

const originalImage = Object.getOwnPropertyDescriptor(globalThis, 'Image');
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
afterEach(() => {
  mock.restoreAll();
  for (const [key, descriptor] of [['Image', originalImage], ['document', originalDocument]] as const) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

function canvasEnvironment(blob: Blob | null) {
  const canvas = { width: 0, height: 0, getContext: () => ({ drawImage() {} }),
    toBlob: (callback: (value: Blob | null) => void) => callback(blob) };
  mock.method(URL, 'createObjectURL', () => 'blob:test');
  const revoke = mock.method(URL, 'revokeObjectURL', () => {});
  Object.defineProperty(globalThis, 'Image', { configurable: true, value: class {
    naturalWidth = 4000; naturalHeight = 3000; onload?: () => void;
    set src(_: string) { queueMicrotask(() => this.onload?.()); }
  }});
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => canvas } });
  return { canvas, revoke };
}

it('reduces a phone photo before upload and releases its object URL', async () => {
  const { canvas, revoke } = canvasEnvironment(new Blob(['small'], { type: 'image/webp' }));
  const file = new File(['x'.repeat(1000)], 'phone.jpg', { type: 'image/jpeg' });
  const result = await compressCategoryImage(file);
  assert.equal(canvas.width, 960);
  assert.equal(canvas.height, 720);
  assert.equal(result.type, 'image/webp');
  assert.equal(result.name, 'phone.webp');
  assert.ok(result.size < file.size);
  assert.equal(revoke.mock.callCount(), 1);
});

it('retains the original if conversion increases size', async () => {
  canvasEnvironment(new Blob(['larger'], { type: 'image/png' }));
  const file = new File(['x'], 'tiny.png', { type: 'image/png' });
  assert.equal(await compressCategoryImage(file), file);
});

it('retains the original and releases resources when encoding fails', async () => {
  const { revoke } = canvasEnvironment(null);
  const file = new File(['original'], 'image.png', { type: 'image/png' });
  assert.equal(await compressCategoryImage(file), file);
  assert.equal(revoke.mock.callCount(), 1);
});

it('preserves animated GIF uploads', async () => {
  const file = new File(['gif'], 'animation.gif', { type: 'image/gif' });
  assert.equal(await compressCategoryImage(file), file);
});
