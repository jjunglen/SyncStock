// Shrinks a photo on the phone before it's uploaded: longest side 1600px,
// JPEG. Uploads stay small on cell data, and iPhone HEIC photos become
// JPEG (browsers can't show HEIC to the merchant). Rejects with a message
// a shopper can act on.
const MAX_SIDE = 1600;
const QUALITY = 0.82;

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that photo. Try another one, or a JPG."));
    };
    img.src = url;
  });

export async function resizePhoto(file) {
  if (!file || !/^image\//.test(file.type || "image/")) throw new Error("Choose a photo");
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
  if (!blob) throw new Error("Couldn't read that photo. Try another one.");
  return blob;
}
