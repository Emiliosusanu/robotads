// optimize.js
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { refreshAmazonToken, fetchKeywordStats, applyRulesToKeywords, sendBidAdjustments, logOptimization } from '../lib/robotHelpers.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runOptimizer() {
  console.log("▶️ RobotAds Optimizer started at", new Date().toISOString());

  // 1. Kullanıcıya bağlı tüm Amazon hesaplarını çek
  const { data: accounts, error } = await supabase
    .from('amazon_accounts')
    .select('*');

  if (error) {
    console.error("❌ Error fetching accounts:", error);
    return;
  }

  for (const account of accounts) {
    try {
      const { id, refresh_token, last_optimized_at } = account;

      // 2. 24 saatten az geçtiyse geç
      const now = new Date();
      if (last_optimized_at && now - new Date(last_optimized_at) < 1000 * 60 * 60 * 24) {
        console.log(`⏭️ Skipping ${id} - last optimized less than 24h ago.`);
        continue;
      }

      // 3. Amazon token yenile
      const accessToken = await refreshAmazonToken(refresh_token);

      // 4. Keyword performans verilerini çek
      const keywordStats = await fetchKeywordStats(account, accessToken);

      // 5. Supabase'den bu kullanıcıya ait kuralları çek
      const { data: rules } = await supabase
        .from('optimization_rules')
        .select('*')
        .eq('user_id', account.user_id)
        .eq('enabled', true);

      // 6. Kuralları keyword’lere uygula
      const actions = applyRulesToKeywords(keywordStats, rules);

      // 7. Amazon Ads API’ye bid/pause işlemleri gönder
      const results = await sendBidAdjustments(actions, accessToken);

      // 8. Logla
      await logOptimization(account, actions, results);

      // 9. last_optimized_at güncelle
      await supabase
        .from('amazon_accounts')
        .update({ last_optimized_at: now.toISOString() })
        .eq('id', id);

      console.log(`✅ Finished optimization for account ${id}`);

    } catch (e) {
      console.error(`❌ Error optimizing account ${account.id}:`, e.message);
    }
  }

  console.log("🏁 RobotAds Optimizer finished at", new Date().toISOString());
}

runOptimizer();
