import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const sourceImagePath = '/home/ycz87/.openclaw/workspace-coder/cosmelon/farm-plot-reference.jpg';
const outputDir = '/home/ycz87/.openclaw/workspace-coder/cosmelon/baseline/e001-t01';

const viewports = [
  { name: 'desktop', width: 1366, height: 768, posX: 0.5, posY: 0.5065 },
  { name: 'mobile', width: 390, height: 640, posX: 0.5, posY: 0.56 },
  { name: 'detail', width: 1024, height: 1024, posX: 0.5, posY: 0.56 },
];

const anchorPctOnDetail = [
  { id: 'A1', name: 'sun', xPct: 0.14, yPct: 0.17 },
  { id: 'A2', name: 'mainCloud', xPct: 0.56, yPct: 0.19 },
  { id: 'A3', name: 'leftHouse', xPct: 0.17, yPct: 0.64 },
  { id: 'A4', name: 'rightBarn', xPct: 0.84, yPct: 0.64 },
  { id: 'A5', name: 'plotClusterCenter', xPct: 0.5, yPct: 0.7 },
];

function buildCoverCrop({ srcW, srcH, outW, outH, posX, posY }) {
  const scale = Math.max(outW / srcW, outH / srcH);
  const resizedW = Math.round(srcW * scale);
  const resizedH = Math.round(srcH * scale);
  const left = Math.max(0, Math.min(resizedW - outW, Math.round(posX * resizedW - outW / 2)));
  const top = Math.max(0, Math.min(resizedH - outH, Math.round(posY * resizedH - outH / 2)));
  return { scale, resizedW, resizedH, left, top };
}

function toAnchorPixels(anchorNorm, viewportMeta) {
  return {
    id: anchorNorm.id,
    name: anchorNorm.name,
    x: Math.round(anchorNorm.xNorm * viewportMeta.resizedW - viewportMeta.left),
    y: Math.round(anchorNorm.yNorm * viewportMeta.resizedH - viewportMeta.top),
  };
}

async function run() {
  fs.mkdirSync(outputDir, { recursive: true });

  const sourceMeta = await sharp(sourceImagePath).metadata();
  const srcW = sourceMeta.width;
  const srcH = sourceMeta.height;

  const captureMeta = [];
  for (const viewport of viewports) {
    const crop = buildCoverCrop({
      srcW,
      srcH,
      outW: viewport.width,
      outH: viewport.height,
      posX: viewport.posX,
      posY: viewport.posY,
    });

    const outputPath = path.join(outputDir, `e001-t01-baseline-${viewport.name}.png`);
    await sharp(sourceImagePath)
      .resize(crop.resizedW, crop.resizedH)
      .extract({ left: crop.left, top: crop.top, width: viewport.width, height: viewport.height })
      .png()
      .toFile(outputPath);

    captureMeta.push({
      name: viewport.name,
      width: viewport.width,
      height: viewport.height,
      posX: viewport.posX,
      posY: viewport.posY,
      resizedW: crop.resizedW,
      resizedH: crop.resizedH,
      left: crop.left,
      top: crop.top,
      scale: Number(crop.scale.toFixed(6)),
      outputPath,
    });
  }

  const detailMeta = captureMeta.find((item) => item.name === 'detail');
  const sourceAnchors = anchorPctOnDetail.map((anchor) => {
    const xNorm = (detailMeta.left + anchor.xPct * detailMeta.width) / detailMeta.resizedW;
    const yNorm = (detailMeta.top + anchor.yPct * detailMeta.height) / detailMeta.resizedH;
    return {
      id: anchor.id,
      name: anchor.name,
      x: Math.round(xNorm * srcW),
      y: Math.round(yNorm * srcH),
      xNorm: Number(xNorm.toFixed(6)),
      yNorm: Number(yNorm.toFixed(6)),
    };
  });

  const anchorsByViewport = captureMeta.map((viewportMeta) => ({
    viewport: viewportMeta.name,
    points: sourceAnchors.map((anchorNorm) => toAnchorPixels(anchorNorm, viewportMeta)),
  }));

  const metadataPath = path.join(outputDir, 'capture-metadata.json');
  fs.writeFileSync(
    metadataPath,
    JSON.stringify(
      {
        source: {
          path: sourceImagePath,
          width: srcW,
          height: srcH,
        },
        captures: captureMeta,
        sourceAnchors,
        anchorsByViewport,
      },
      null,
      2,
    ),
  );

  console.log(`Baseline artifacts written to: ${outputDir}`);
  console.log(`Metadata: ${metadataPath}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
