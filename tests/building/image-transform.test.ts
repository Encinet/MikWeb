import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  constrainImageTransform,
  INITIAL_IMAGE_TRANSFORM,
  scaleImageAtPoint,
} from '@/modules/building/lib/building-image-transform';

const viewport = { width: 800, height: 600, imageWidth: 1600, imageHeight: 900 };

test('zoom follows the pointer instead of jumping to the image centre', () => {
  const zoomed = scaleImageAtPoint(INITIAL_IMAGE_TRANSFORM, 2, { x: 100, y: 50 }, viewport);
  assert.deepEqual(zoomed, { scale: 2, x: -100, y: -50 });
  assert.deepEqual(
    scaleImageAtPoint(zoomed, 1, { x: 100, y: 50 }, viewport),
    INITIAL_IMAGE_TRANSFORM,
  );
});

test('panning stops at image edges and accounts for letterboxing', () => {
  assert.deepEqual(constrainImageTransform({ scale: 2, x: 1000, y: -1000 }, viewport), {
    scale: 2,
    x: 400,
    y: -150,
  });
  const panorama = { ...viewport, imageWidth: 3200, imageHeight: 400 };
  assert.deepEqual(constrainImageTransform({ scale: 2, x: -1000, y: 1000 }, panorama), {
    scale: 2,
    x: -400,
    y: 0,
  });
});

test('portrait images and viewport changes preserve valid pan bounds', () => {
  const portrait = { ...viewport, imageWidth: 600, imageHeight: 1200 };
  const zoomed = constrainImageTransform({ scale: 3, x: 500, y: 700 }, portrait);
  assert.deepEqual(zoomed, { scale: 3, x: 50, y: 600 });
  assert.deepEqual(constrainImageTransform(zoomed, { ...portrait, height: 300 }), {
    scale: 3,
    x: 0,
    y: 300,
  });
});

test('scale is bounded and reset always returns the full image', () => {
  assert.equal(constrainImageTransform({ scale: 20, x: 0, y: 0 }, viewport).scale, 5);
  assert.deepEqual(
    constrainImageTransform({ scale: 0.2, x: 500, y: 500 }, viewport),
    INITIAL_IMAGE_TRANSFORM,
  );
  assert.deepEqual(
    scaleImageAtPoint({ scale: 5, x: -300, y: 100 }, 1, { x: -100, y: 200 }, viewport),
    INITIAL_IMAGE_TRANSFORM,
  );
});
