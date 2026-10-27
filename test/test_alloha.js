const { extractAlloha } = require('../src/extractors/alloha');

async function test() {
  console.log('Testing Alloha Extractor with anime 700 (AniStar dub)...');
  const sampleUrl = 'https://alloha.yani.tv/?token_movie=8bf4cac59ff9eb2e89108a14925cb7&translation=158&season=1&episode=1&token=8b5512267a2a52e9de06d67d342e0c&hidden=translation,season,episode';

  const startTime = Date.now();
  const stream = await extractAlloha(sampleUrl);
  const duration = Date.now() - startTime;

  console.log(`\nExtracted Alloha stream in ${duration}ms:`);
  console.log(JSON.stringify(stream, null, 2));

  if (stream && stream.hls_url) {
    console.log('\n[SUCCESS] Direct Alloha 1080p HLS URL ready:', stream.hls_url.slice(0, 90) + '...');
  } else {
    console.error('\n[FAILED] No Alloha stream extracted');
    process.exit(1);
  }
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
