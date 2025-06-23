export const metricOptions = [
  { value: 'acos', label: 'ACOS (%)' },
  { value: 'ctr', label: 'CTR (%)' },
  { value: 'cpc', label: 'CPC (€)' },
  { value: 'spend', label: 'Spend (€)' },
  { value: 'impressions', label: 'Impressions' },
  { value: 'clicks', label: 'Clicks' },
  { value: 'orders', label: 'Orders' },
  { value: 'conversion_rate', label: 'Conversion Rate (%)' },
  { value: 'roas', label: 'ROAS (Return on Ad Spend)'},
  { value: 'keyword_bid', label: 'Keyword Bid (€)'},
  { value: 'asin_bid', label: 'ASIN Target Bid (€)'},
];

export const comparisonOptions = [
  { value: '>', label: 'Greater than (>)' },
  { value: '<', label: 'Less than (<)' },
  { value: '>=', label: 'Greater than or equal to (>=)' },
  { value: '<=', label: 'Less than or equal to (<=)' },
  { value: '=', label: 'Equal to (=)' },
];

export const actionTypeOptions = [
  { value: 'adjust_bid_percentage', label: 'Adjust Bid by %' },
  { value: 'adjust_bid_amount', label: 'Adjust Bid by Amount (€)' },
  { value: 'set_bid', label: 'Set Bid to (€)' },
  { value: 'pause_entity', label: 'Pause Entity (Keyword/ASIN)' },
  { value: 'enable_entity', label: 'Enable Entity (Keyword/ASIN)' },
];

export const entityTypeOptions = [
    { value: 'keyword', label: 'Keywords' },
    { value: 'asin_target', label: 'ASIN Targets' },
];

export const matchTypeOptions = [
    { value: 'all', label: 'All Match Types (Keywords Only)', entity: 'keyword' },
    { value: 'broad', label: 'Broad Match (Keywords Only)', entity: 'keyword' },
    { value: 'phrase', label: 'Phrase Match (Keywords Only)', entity: 'keyword' },
    { value: 'exact', label: 'Exact Match (Keywords Only)', entity: 'keyword' },
    { value: 'asin_targeting_auto', label: 'ASIN - Auto Targeting (Targets Only)', entity: 'asin_target'},
    { value: 'asin_targeting_manual', label: 'ASIN - Manual Targeting (Targets Only)', entity: 'asin_target'},
];

export const initialRuleState = {
  name: '',
  priority: 1,
  enabled: true,
  settings: {
    target_entity: 'keyword', 
    match_type: 'all', 
    conditions: [{ metric: 'acos', comparison: '>', value: 30, duration_days: 7 }],
    action: { type: 'adjust_bid_percentage', value: -10 },
    frequency_hours: 6, 
  },
};