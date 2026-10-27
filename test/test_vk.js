const { extractVK } = require('../src/extractors/vk');

async function test() {
  console.log('Testing VK Video Extractor with id: -214687141_456239052...');
  const sampleUrl = '//ru.yummyani.me/iframeVK.html?id=-214687141_456239052';

  const startTime = Date.now();
  const stream = await extractVK(sampleUrl);
  const duration = Date.now() - startTime;

  console.log(`\nExtracted VK stream in ${duration}ms:`);
  console.log(JSON.stringify(stream, null, 2));

  if (stream && stream.hls_url) {
    console.log('\n[SUCCESS] Direct VK HLS URL ready:', stream.hls_url.slice(0, 90) + '...');
  } else {
    console.error('\n[FAILED] No VK stream extracted');
    process.exit(1);
  }
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
