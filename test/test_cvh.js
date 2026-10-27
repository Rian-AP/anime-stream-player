const { extractCVH } = require('../src/extractors/cvh');

async function test() {
  console.log('Testing CVH Extractor with "5 centimeters per second" (Reanimedia dub)...');
  const sampleUrl = '//ru.yummyani.me/iframeCVH.html?dubbing_code=Reanimedia&anime_id=1689&episode=1&dubbing=%D0%94%D1%83%D0%B1%D0%BB%D1%8F%D0%B6+Reanimedia';
  
  const startTime = Date.now();
  const streams = await extractCVH(sampleUrl);
  const duration = Date.now() - startTime;

  console.log(`\nExtracted ${streams.length} stream(s) in ${duration}ms:`);
  console.log(JSON.stringify(streams, null, 2));

  if (streams.length > 0 && streams[0].hls_url) {
    console.log('\n[SUCCESS] Direct HLS URL obtained:', streams[0].hls_url.slice(0, 80) + '...');
  } else {
    console.error('\n[FAILED] No HLS stream found');
    process.exit(1);
  }
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
