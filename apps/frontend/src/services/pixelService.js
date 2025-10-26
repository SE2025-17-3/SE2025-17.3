export const getChunkData = async (x, y) => {
  const res = await fetch(`http://localhost:4000/api/pixels/chunk/${x}/${y}`);
  return await res.json();
};

export const postPixel = async (gx, gy, color) => {
  await fetch('http://localhost:4000/api/pixels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gx, gy, color })
  });
};
