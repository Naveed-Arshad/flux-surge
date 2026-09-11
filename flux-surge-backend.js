/**
 * FLUX SURGE - Backend API (Node.js + Express) - WEB ONLY
 * Phase 1: Core mechanics (tap, energy, upgrades, passive, daily rewards, referrals)
 * NO TELEGRAM DEPENDENCY - Simple username login
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// Database connection (Supabase PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ============ ENDPOINTS ============

// 1. User login/register (simple username)
app.post('/api/login', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    
    // Check if user exists
    let dbUser = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (dbUser.rows.length === 0) {
      // Create new user
      const referralCode = crypto.randomBytes(6).toString('hex').toUpperCase();
      dbUser = await pool.query(
        `INSERT INTO users (username, coins, energy, energy_max, passive_per_sec, referral_code, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING *`,
        [username, 0, 100, 100, 0, referralCode]
      );
    }
    
    const userRecord = dbUser.rows[0];
    
    res.json({
      success: true,
      user: {
        id: userRecord.id,
        username: userRecord.username,
        coins: userRecord.coins,
        totalEarned: userRecord.total_earned,
        energy: userRecord.energy,
        energyMax: userRecord.energy_max,
        passivePerSec: userRecord.passive_per_sec,
        referralCode: userRecord.referral_code,
        lastClaimDate: userRecord.last_claim_date,
        streak: userRecord.streak
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// 2. Tap action (earn coins)
app.post('/api/tap', async (req, res) => {
  try {
    const { userId, tapsCount } = req.body;
    
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const userData = user.rows[0];
    
    // Validate: enough energy?
    if (userData.energy < tapsCount) {
      return res.status(400).json({ error: 'Not enough energy' });
    }
    
    // Get user's per-tap value
    const upgrades = await pool.query('SELECT SUM(level) as grip_level FROM upgrades WHERE user_id = $1 AND upgrade_id = $2', [userId, 'grip']);
    const gripLevel = upgrades.rows[0]?.grip_level || 0;
    const perTap = 1 + gripLevel;
    
    const coinsEarned = perTap * tapsCount;
    const newEnergy = Math.max(0, userData.energy - tapsCount);
    
    // Update user
    await pool.query(
      `UPDATE users SET coins = coins + $1, total_earned = total_earned + $1, energy = $2 WHERE id = $3`,
      [coinsEarned, newEnergy, userId]
    );
    
    // Log activity
    await pool.query(
      `INSERT INTO activities (user_id, activity_type, amount) VALUES ($1, 'tap', $2)`,
      [userId, coinsEarned]
    );
    
    res.json({
      success: true,
      coinsEarned,
      newEnergy,
      newBalance: userData.coins + coinsEarned,
      perTap
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Tap failed' });
  }
});

// 3. Buy upgrade
app.post('/api/buy-upgrade', async (req, res) => {
  try {
    const { userId, upgradeId } = req.body;
    
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const userData = user.rows[0];
    const UPGRADES = {
      grip: { baseCost: 50, costMul: 1.6, apply: 'grip' },
      tank: { baseCost: 80, costMul: 1.6, apply: 'energy' },
      regen: { baseCost: 120, costMul: 1.7, apply: 'regen' },
      bot: { baseCost: 200, costMul: 1.8, apply: 'passive' },
      gloves: { baseCost: 600, costMul: 1.7, apply: 'grip' },
      team: { baseCost: 1500, costMul: 1.85, apply: 'passive' }
    };
    
    const upgrade = UPGRADES[upgradeId];
    if (!upgrade) return res.status(400).json({ error: 'Invalid upgrade' });
    
    // Get current level
    const currentLevel = await pool.query(
      'SELECT COALESCE(level, 0) as level FROM upgrades WHERE user_id = $1 AND upgrade_id = $2',
      [userId, upgradeId]
    );
    const level = currentLevel.rows[0]?.level || 0;
    const cost = Math.round(upgrade.baseCost * Math.pow(upgrade.costMul, level));
    
    // Check if can afford
    if (userData.coins < cost) {
      return res.status(400).json({ error: 'Not enough coins', required: cost, have: userData.coins });
    }
    
    // Buy
    await pool.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [cost, userId]);
    await pool.query(
      `INSERT INTO upgrades (user_id, upgrade_id, level) VALUES ($1, $2, 1)
       ON CONFLICT (user_id, upgrade_id) DO UPDATE SET level = level + 1`,
      [userId, upgradeId]
    );
    
    // Apply effect
    if (upgrade.apply === 'energy') {
      await pool.query('UPDATE users SET energy_max = energy_max + 30, energy = energy + 30 WHERE id = $1', [userId]);
    } else if (upgrade.apply === 'regen') {
      await pool.query('UPDATE users SET passive_per_sec = passive_per_sec + 1 WHERE id = $1', [userId]);
    } else if (upgrade.apply === 'passive') {
      const passiveAdd = upgradeId === 'bot' ? 5 : 15;
      await pool.query('UPDATE users SET passive_per_sec = passive_per_sec + $1 WHERE id = $2', [passiveAdd, userId]);
    }
    
    res.json({ success: true, newLevel: level + 1, newBalance: userData.coins - cost });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Purchase failed' });
  }
});

// 4. Claim daily reward
app.post('/api/claim-daily', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const userData = user.rows[0];
    const today = new Date().toDateString();
    const lastClaim = userData.last_claim_date ? new Date(userData.last_claim_date).toDateString() : null;
    
    if (lastClaim === today) {
      return res.status(400).json({ error: 'Already claimed today' });
    }
    
    // Calculate streak
    let newStreak = 1;
    if (lastClaim) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastClaim === yesterday.toDateString()) {
        newStreak = (userData.streak || 0) + 1;
      }
    }
    
    const reward = 50 + (newStreak - 1) * 25;
    
    await pool.query(
      `UPDATE users SET coins = coins + $1, last_claim_date = NOW(), streak = $2 WHERE id = $3`,
      [reward, newStreak, userId]
    );
    
    res.json({ success: true, reward, streak: newStreak, newBalance: userData.coins + reward });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Claim failed' });
  }
});

// 5. Get user stats
app.get('/api/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const userData = user.rows[0];
    const upgrades = await pool.query('SELECT upgrade_id, level FROM upgrades WHERE user_id = $1', [userId]);
    
    res.json({
      success: true,
      user: {
        id: userData.id,
        username: userData.username,
        coins: userData.coins,
        totalEarned: userData.total_earned,
        energy: userData.energy,
        energyMax: userData.energy_max,
        passivePerSec: userData.passive_per_sec,
        referralCode: userData.referral_code,
        lastClaimDate: userData.last_claim_date,
        streak: userData.streak
      },
      upgrades: upgrades.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// 6. Passive income tick
app.post('/api/passive-tick', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const user = await pool.query('SELECT passive_per_sec FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const passiveAmount = user.rows[0].passive_per_sec || 0;
    
    if (passiveAmount > 0) {
      await pool.query(
        'UPDATE users SET coins = coins + $1, total_earned = total_earned + $1 WHERE id = $2',
        [passiveAmount, userId]
      );
    }
    
    res.json({ success: true, passiveEarned: passiveAmount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Passive tick failed' });
  }
});

// 7. Referral claim
app.post('/api/referral/claim', async (req, res) => {
  try {
    const { userId, referralCode } = req.body;
    
    if (userId === referralCode) return res.status(400).json({ error: 'Cannot refer yourself' });
    
    // Check if referrer exists
    const referrer = await pool.query('SELECT id FROM users WHERE referral_code = $1', [referralCode]);
    if (referrer.rows.length === 0) return res.status(404).json({ error: 'Invalid referral code' });
    
    const referrerId = referrer.rows[0].id;
    
    // Check if already referred
    const existing = await pool.query(
      'SELECT * FROM referrals WHERE user_id = $1 AND referrer_id = $2',
      [userId, referrerId]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already referred by this user' });
    }
    
    // Add referral
    await pool.query(
      'INSERT INTO referrals (user_id, referrer_id) VALUES ($1, $2)',
      [userId, referrerId]
    );
    
    // Give bonus to both
    const bonus = 1000;
    await pool.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [bonus, userId]);
    await pool.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [bonus * 2, referrerId]);
    
    res.json({ success: true, yourBonus: bonus, referrerBonus: bonus * 2 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Referral claim failed' });
  }
});

// ============ ADMIN ENDPOINTS ============

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
  
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  
  const token = crypto.randomBytes(32).toString('hex');
  res.json({ success: true, token });
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    const users = await pool.query('SELECT id, username, coins, total_earned, created_at FROM users ORDER BY total_earned DESC LIMIT 100');
    res.json({ success: true, users: users.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ HEALTH CHECK ============

app.get('/api/health', (req, res) => {
  res.json({ status: 'Flux Surge backend running! ✅' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`⚡ Flux Surge API running on port ${PORT}`);
});
