import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet, planId, paymentCurrency = 'xmr' } = req.body;

  if (!wallet || !wallet.startsWith('4') || wallet.length < 90) {
    return res.status(400).json({ error: 'Invalid Monero address' });
  }

  try {
    const { data: plans, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .eq('active', true);

    if (planError || plans.length === 0) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    const plan = plans[0];

    await supabase
      .from('wallets')
      .upsert({ address: wallet }, { onConflict: 'address' });

    const orderId = `order_${uuidv4()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plan.duration_days);

    const { error: orderError } = await supabase.from('orders').insert({
      id: orderId,
      wallet_address: wallet,
      plan_id: planId,
      hashrate: plan.hashrate,
      price_usd: plan.price_usd,
      expires_at: expiresAt.toISOString(),
      status: 'pending'
    });

    if (orderError) throw orderError;

    // Здесь будет интеграция с NOWPayments
    res.status(200).json({
      success: true,
      orderId,
      plan: plan.name,
      hashrate: plan.hashrate,
      priceUSD: plan.price_usd
    });

  } catch (e) {
    console.error('Buy hash error:', e);
    res.status(500).json({ error: e.message });
  }
}
