const { extractKodik } = require('../src/extractors/kodik');

async function test() {
  console.log('Testing Kodik Extractor with 55642 (Reanimedia dub)...');
  const sampleUrl = '//kodikplayer.com/video/55642/db256df8826defa72a31fc33e3427296/720p?translations=false&only_episode=true&only_season=true';

  const startTime = Date.now();
  const stream = await extractKodik(sampleUrl);
  const duration = Date.now() - startTime;

  console.log(`\nExtracted Kodik stream in ${duration}ms:`);
  console.log(JSON.stringify(stream, null, 2));

  if (stream && stream.hls_url) {
    console.log('\n[SUCCESS] Kodik HLS URL ready:', stream.hls_url.slice(0, 90) + '...');
  } else {
    console.error('\n[FAILED] No stream extracted');
    process.exit(1);
  }
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
