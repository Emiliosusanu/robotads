// lib/robotHelpers.js
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const AMAZON_CLIENT_ID = process.env.AMAZON_CLIENT_ID;
const AMAZON_CLIENT_SECRET = process.env.AMAZON_CLIENT_SECRET;

export async function refreshAmazonToken(refresh_token) {
  const res = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token,
      client_id: AMAZON_CLIENT_ID,
      client_secret: AMAZON_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error(`Amazon token refresh failed: ${res.status}`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function fetchKeywordStats(account, accessToken) {
  const { amazon_profile_id, amazon_region } = account;

  const endpoint = `https://advertising-api.${amazon_region}.amazon.com/v2/sp/keywords`;

  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Amazon-Advertising-API-ClientId': AMAZON_CLIENT_ID,
      'Amazon-Advertising-API-Scope': amazon_profile_id,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch keywords: ${res.status}`);
  }

  const data = await res.json();
  return data;
}

// Örnek rule yapısı:
// { metric: 'acos', comparison: '>', value: 0.3, action: {type: 'pause'} }

export function applyRulesToKeywords(keywords, rules) {
  const actions = [];

  for (const keyword of keywords) {
    for (const rule of rules) {
      const metricValue = keyword[rule.metric];

      if (compare(metricValue, rule.comparison, rule.value)) {
        actions.push({
          keywordId: keyword.keywordId,
          action: rule.action,
          currentBid: keyword.bid,
          calculatedAcos: keyword.acos,
        });
      }
    }
  }

  return actions;
}

function compare(metric, operator, value) {
  switch (operator) {
    case '>': return metric > value;
    case '<': return metric < value;
    case '>=': return metric >= value;
    case '<=': return metric <= value;
    case '==': return metric == value;
    default: return false;
  }
}

export async function sendBidAdjustments(actions, accessToken) {
  const results = [];

  for (const item of actions) {
    const endpoint = `https://advertising-api.amazon.com/v2/sp/keywords/${item.keywordId}`;

    const payload = {};
    if (item.action.type === 'pause') {
      payload.state = 'paused';
    } else if (item.action.type === 'adjust_bid_percentage') {
      const multiplier = 1 + item.action.value / 100;
      payload.bid = parseFloat((item.currentBid * multiplier).toFixed(2));
    }

    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': AMAZON_CLIENT_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    results.push({ keywordId: item.keywordId, response: result, status: res.status });
  }

  return results;
}

export async function logOptimization(account, actions, results) {
  const rows = actions.map((action, i) => ({
    keyword_id: action.keywordId,
    user_id: account.user_id,
    account_id: account.id,
    action_type: action.action.type,
    old_bid: action.currentBid,
    new_bid: results[i]?.response?.bid || null,
    result: results[i]?.status === 200 ? 'success' : 'error',
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('bid_logs')
    .insert(rows);

  if (error) console.error("❌ Failed to log optimization:", error);
}
