import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet } = req.query;

  try {
    const { data: walletData } = await supabase
      .from('wallets')
      .select('*')
      .eq('address', wallet)
      .single();

    const { data: orders } = await supabase
      .from('orders')
      .select('hashrate, status')
      .eq('wallet_address', wallet)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString());

    const activeHashrate = orders?.reduce((sum, o) => sum + o.hashrate, 0) || 0;

    res.status(200).json({
      wallet,
      xmr: parseFloat(walletData?.balance_xmr || 0),
      usd: parseFloat(walletData?.balance_xmr || 0) * 150,
      totalEarned: parseFloat(walletData?.total_earned_xmr || 0),
      activeHashrate
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
