import { createWorker, PSM } from 'tesseract.js';

async function run() {
  const images = [
    'C:/Users/ariwi/.gemini/antigravity/brain/dc0b8e71-1ebb-4e2b-818e-d36c4abeb82d/media__1777889702752.jpg',
    'C:/Users/ariwi/.gemini/antigravity/brain/dc0b8e71-1ebb-4e2b-818e-d36c4abeb82d/media__1777889724945.jpg'
  ];

  const worker = await createWorker('ind');
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
  });

  for (let i = 0; i < images.length; i++) {
    console.log(`\n\n--- IMAGE ${i + 1} ---`);
    try {
      const { data: { text } } = await worker.recognize(images[i]);
      console.log(text);
      
      const numbers = text.match(/\d{1,3}(?:[., ]+\d{3})+|\d{4,}/g);
      console.log('Extracted numbers:', numbers);
    } catch(e) {
      console.error(e);
    }
  }

  await worker.terminate();
}

run();
