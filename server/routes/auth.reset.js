const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const router = express.Router();
const { sendMail } = require('../mailer');
const pool = require('../db'); // mysql2/promise 풀을 사용한다고 가정

const CODE_TTL_MIN = 10; // 10분
const SALT_ROUNDS = 10;

// 6자리 코드 생성
function generate6() {
  // 000000 ~ 999999
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
}

// 공통: 이메일로 사용자 찾기
async function findUserByEmail(email) {
  const [rows] = await pool.query('SELECT id, email, password FROM users WHERE email=? LIMIT 1', [email]);
  return rows[0] || null;
}

// 1) 인증코드 발송
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });

  const user = await findUserByEmail(email);
  // 보안상 존재여부 노출 금지: 동일 응답
  if (!user) return res.json({ ok: true });

  // 코드 생성 + 해시 저장
  const code = generate6();
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
  const expires = new Date(Date.now() + CODE_TTL_MIN * 60 * 1000);

  await pool.query(
    'INSERT INTO password_reset_codes (user_id, code_hash, expires_at, ip, user_agent) VALUES (?, ?, ?, ?, ?)',
    [user.id, codeHash, expires, req.ip || null, req.headers['user-agent'] || null]
  );

  const body =
`${process.env.APP_NAME || '앱'} 비밀번호 재설정 인증번호

인증번호: ${code}
유효시간: ${CODE_TTL_MIN}분

앱에서 인증번호를 입력해 비밀번호를 재설정하세요.`;

  try {
    await sendMail(user.email, '[끼리끼리] 비밀번호 재설정 인증번호', body);
  } catch (e) {
    // 메일 실패해도 공격자에게 힌트 주지 않음
    console.error('[mail error]', e);
  }
  return res.json({ ok: true });
});

// 내부 헬퍼: 최신 유효 코드를 가져와 비교
async function checkCode(userId, code) {
  const now = new Date();
  const [rows] = await pool.query(
    `SELECT * FROM password_reset_codes
     WHERE user_id=? AND used_at IS NULL AND expires_at >= ?
     ORDER BY id DESC LIMIT 5`, // 최신 몇 개만 확인
    [userId, now]
  );
  for (const row of rows) {
    const ok = await bcrypt.compare(code, row.code_hash);
    if (ok) return row; // 매칭된 row 반환
  }
  return null;
}

// 2) 코드 검증
router.post('/verify-reset-code', async (req, res) => {
  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ error: 'email and code required' });

  const user = await findUserByEmail(email);
  if (!user) return res.status(400).json({ error: 'invalid code' });

  const row = await checkCode(user.id, code);
  if (!row) return res.status(400).json({ error: 'invalid or expired code' });

  return res.json({ ok: true });
});

// 3) 비밀번호 재설정
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body || {};
  if (!email || !code || !newPassword) return res.status(400).json({ error: 'missing fields' });

  const user = await findUserByEmail(email);
  if (!user) return res.status(400).json({ error: 'invalid code' });

  const row = await checkCode(user.id, code);
  if (!row) return res.status(400).json({ error: 'invalid or expired code' });

  // 비밀번호 해시 후 저장
  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query('UPDATE users SET password=? WHERE id=?', [newHash, user.id]);
    await conn.query('UPDATE password_reset_codes SET used_at=NOW() WHERE id=?', [row.id]);

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    console.error(e);
    return res.status(500).json({ error: 'reset failed' });
  } finally {
    conn.release();
  }

  return res.json({ ok: true });
});


module.exports = router;