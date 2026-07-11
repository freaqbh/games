import { makeWallPlaster } from './js/textures.js';
console.log("Loading wall plaster...");
try {
  const tex = makeWallPlaster();
  console.log("Success! Canvas size:", tex.image.width, "x", tex.image.height);
} catch (e) {
  console.error("Failed:", e);
}
