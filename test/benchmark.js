const { extractAllStreams } = require('../src/extractors/index');

async function benchmark() {
  const testAnimeId = 2; // "5 сантиметров в секунду" (имеет Alloha, Kodik, CVH)
  const testEpisode = 1;

  console.log(`\n============================================================`);
  console.log(`🚀 НАЧИНАЕМ БЕНЧМАРК ВСЕХ ПЛЕЕРОВ ДЛЯ АНИМЕ ID: ${testAnimeId}, СЕРИЯ: ${testEpisode}`);
  console.log(`============================================================\n`);

  const globalStart = Date.now();
  const result = await extractAllStreams(testAnimeId, testEpisode);
  const totalElapsed = Date.now() - globalStart;

  console.log(`СУММАРНОЕ ВРЕМЯ ПАРАЛЛЕЛЬНОГО СБОРА: ${totalElapsed} мс`);
  console.log(`УСПЕШНО ДОБЫТО ПОТОКОВ: ${result.total_streams} шт.\n`);

  console.log(`-------------------------------------------------------------------------------------------------------------------`);
  console.log(`| %-10s | %-20s | %-12s | %-10s | %-45s |`.replace('%-10s', 'ПЛЕЕР').replace('%-20s', 'ОЗВУЧКА').replace('%-12s', 'МАКС. КАЧ-ВО').replace('%-10s', 'ВРЕМЯ (мс)').replace('%-45s', 'ПРЯМАЯ HLS ССЫЛКА'));
  console.log(`-------------------------------------------------------------------------------------------------------------------`);

  result.streams.forEach(s => {
    const qualities = s.qualities ? Object.keys(s.qualities).join(', ') : 'HLS stream';
    const maxQ = s.qualities ? (s.qualities['1080p'] ? '1080p' : (s.qualities['720p'] ? '720p' : '480p')) : 'adaptive';
    const sampleUrl = s.hls_url.slice(0, 42) + '...';
    console.log(`| ${s.player.padEnd(10)} | ${s.voice.slice(0, 20).padEnd(20)} | ${maxQ.padEnd(12)} | ${(s.time_ms + ' мс').padEnd(10)} | ${sampleUrl.padEnd(45)} |`);
  });

  console.log(`-------------------------------------------------------------------------------------------------------------------\n`);

  if (result.errors.length > 0) {
    console.log(`Ошибки/недоступные плееры (${result.errors.length}):`);
    result.errors.forEach(e => {
      console.log(`  - [${e.source_player_name}] ${e.voice}: ${e.error}`);
    });
  }
}

benchmark().catch(err => console.error('Benchmark fatal error:', err));
