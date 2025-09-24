require('dotenv').config(); // ← .env 불러오기
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs'); // ✅ 추가: 파일 시스템 모듈

const app = express();
const PORT = 3000;

// Middleware 설정
app.use(cors());
app.use(bodyParser.json());

const path = require('path');

// 1) .env를 루트에서 명시적으로 로드
const dotenv = require('dotenv');
const result = dotenv.config({ path: path.join(__dirname, '..', '.env') });
if (result.error) {
  console.error('⚠ .env 로드 실패:', result.error);
} else {
  console.log(`[env] loaded: ${Object.keys(result.parsed || {}).join(', ')}`);
}

// uploads 폴더를 정적으로 서빙
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ 추가: uploads/profiles 디렉토리 자동 생성
const profilesDir = path.join(__dirname, 'uploads', 'profiles');
if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
  console.log('📁 uploads/profiles 디렉토리 생성됨');
}


// 2) 필수 환경변수 검사 (누락 시 바로 에러)
const REQUIRED_KEYS = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
for (const k of REQUIRED_KEYS) {
  if (!process.env[k]) {
    throw new Error(`환경변수 ${k} 누락: .env를 확인하세요`);
  }
}

// 3) MySQL 연결 (환경변수 사용)
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
});

// DB 연결 확인
db.connect((err) => {
  if (err) {
    console.error('⚠ MySQL 연결 실패:', err);
    return;
  }
  console.log('✅ MySQL 연결 성공');
});

// 회원가입 API
app.post('/register', (req, res) => {
  const { email, password, name, department, student_number, birth } = req.body;

  // 필수값 확인
  if (!email || !password || !name) {
    return res.status(400).json({ message: '필수 항목이 누락되었습니다.' });
  }

  const sql = `INSERT INTO users (email, password, name, department, student_number, birth)
               VALUES (?, ?, ?, ?, ?, ?)`;

  const values = [email, password, name, department, student_number, birth];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('회원가입 오류:', err);
      return res.status(500).json({ message: '서버 오류' });
    }
    return res.status(201).json({ message: '회원가입 성공' });
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});

// 로그인 API
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: '이메일과 비밀번호를 입력해주세요.' });
  }

  const sql = `SELECT * FROM users WHERE email = ? AND password = ?`;
  db.query(sql, [email, password], (err, results) => {
    if (err) {
      console.error('로그인 오류:', err);
      return res.status(500).json({ message: '서버 오류' });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 일치하지 않습니다.' });
    }

    const user = results[0];
    return res.status(200).json({
      message: '로그인 성공',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department,
        studentId: user.student_number, // 데이터베이스 student_number를 studentId로 반환
        birth: user.birth,
      }
    });
  });
});

// 활동 목록 조회 API
app.get('/api/activities', (req, res) => {
  const sql = 'SELECT * FROM activitys ORDER BY created_at DESC';

  db.query(sql, (err, results) => {
    if (err) {
      console.error('활동 조회 오류:', err);
      return res.status(500).json({ message: '서버 오류' });
    }

    res.status(200).json(results);
  });
});

// 활동 상세 조회 API
app.get('/api/activities/:id', (req, res) => {
  const activityId = req.params.id;

  const sql = 'SELECT * FROM activitys WHERE activity_id = ?';
  db.query(sql, [activityId], (err, results) => {
    if (err) {
      console.error('활동 상세 조회 오류:', err);
      return res.status(500).json({ message: '서버 오류' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: '활동을 찾을 수 없습니다.' });
    }

    res.status(200).json(results[0]);
  });
});

// 이미지 업로드
const multer = require('multer');

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage });

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: '파일이 없습니다.' });

  const imageUrl = `http://localhost:3000/uploads/${req.file.filename}`;
  res.status(200).json({ imageUrl });
});

// 헬스 체크 API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/db-health', (req, res) => {
  if (!db || db.state === 'disconnected') {
    return res.status(500).json({ status: 'error', message: 'Database not connected' });
  }

  db.query('SELECT 1 as test', (err, results) => {
    if (err) {
      return res.status(500).json({ status: 'error', message: 'Query failed', error: err.message });
    } else {
      res.json({ status: 'ok', message: 'Database connected', timestamp: new Date().toISOString() });
    }
  });
});

// 사용자 정보 조회 API
app.get('/api/user/:id', (req, res) => {
  const userId = req.params.id;
  const sql = 'SELECT id, email, name, department, student_number, birth, profile_picture FROM users WHERE id = ?';

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('사용자 조회 오류:', err);
      return res.status(500).json({ success: false, message: '서버 오류' });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다' });
    }

    const userData = { ...results[0] };
    if (userData.birth instanceof Date) {
      userData.birth = userData.birth.toISOString().split('T')[0];
    }
    
    // 클라이언트가 기대하는 필드명으로 변환
    userData.studentId = userData.student_number;
    delete userData.student_number;

    res.json({ success: true, user: userData });
  });
});

// 사용자 정보 수정 API
app.put('/api/user/:id', (req, res) => {
  const userId = req.params.id;
  const updates = req.body;

  const allowedFields = ['name', 'email', 'department', 'student_number', 'birth', 'profile_picture'];
  let updateFields = [];
  let updateValues = [];

  for (const field in updates) {
    if (allowedFields.includes(field)) {
      updateFields.push(`${field} = ?`);
      updateValues.push(updates[field]);
    }
  }

  if (updateFields.length === 0) {
    return res.status(400).json({ success: false, message: '업데이트할 필드가 없습니다' });
  }

  const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
  updateValues.push(userId);

  db.query(sql, updateValues, (err, result) => {
    if (err) {
      console.error('사용자 수정 오류:', err);
      return res.status(500).json({ success: false, message: '서버 오류' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다' });
    }

    res.json({ success: true, message: '사용자 정보가 업데이트되었습니다' });
  });
});

// 회원 탈퇴 API
app.delete('/api/delete-user/:id', (req, res) => {
  const userId = req.params.id;

  db.query('SELECT id FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      console.error('사용자 확인 오류:', err);
      return res.status(500).json({ success: false, message: '서버 오류' });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다' });
    }

    db.query('DELETE FROM users WHERE id = ?', [userId], (err, deleteResult) => {
      if (err) {
        console.error('사용자 삭제 오류:', err);
        return res.status(500).json({ success: false, message: '삭제 실패' });
      }

      res.json({ success: true, message: '회원 탈퇴가 완료되었습니다' });
    });
  });
});

/* ======================
   리뷰/평가 관련 API (개선된 버전)
   ====================== */

// 1. 리뷰 작성/수정 API (개선된 버전)
app.post('/api/reviews', (req, res) => {
  const {
    reviewer_id,
    reviewee_id,
    related_team_id,
    review_high,
    review_medium,
    review_low,
    comment,
    is_update
  } = req.body;

  console.log('=== 리뷰 요청 데이터 ===');
  console.log('reviewer_id:', reviewer_id);
  console.log('reviewee_id:', reviewee_id);
  console.log('related_team_id:', related_team_id);
  console.log('is_update:', is_update);

  // 필수 데이터 검증
  if (!reviewer_id || !reviewee_id || !related_team_id) {
    return res.status(400).json({ 
      success: false, 
      message: '필수 정보가 누락되었습니다' 
    });
  }

  // 자기 자신을 평가하는 것 방지
  if (reviewer_id === reviewee_id) {
    return res.status(400).json({ 
      success: false, 
      message: '자기 자신을 평가할 수 없습니다' 
    });
  }

  if (is_update) {
    // 기존 리뷰 수정
    const updateSql = `
      UPDATE reviews 
      SET review_high = ?, review_medium = ?, review_low = ?, comment = ?, updated_at = NOW()
      WHERE reviewer_id = ? AND reviewee_id = ? AND related_team_id = ?
    `;
    
    db.query(updateSql, [review_high, review_medium, review_low, comment, reviewer_id, reviewee_id, related_team_id], (err, result) => {
      if (err) {
        console.error('리뷰 수정 오류:', err);
        return res.status(500).json({ success: false, message: '서버 오류: ' + err.message });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: '수정할 리뷰를 찾을 수 없습니다' });
      }
      
      console.log('✅ 리뷰 수정 성공');
      res.json({ success: true, message: '리뷰가 성공적으로 수정되었습니다' });
    });
  } else {
    // 새 리뷰 작성 - 먼저 중복 체크
    const checkSql = `
      SELECT review_id FROM reviews 
      WHERE reviewer_id = ? AND reviewee_id = ? AND related_team_id = ?
    `;
    
    db.query(checkSql, [reviewer_id, reviewee_id, related_team_id], (checkErr, checkResults) => {
      if (checkErr) {
        console.error('중복 체크 오류:', checkErr);
        return res.status(500).json({ success: false, message: '서버 오류' });
      }
      
      if (checkResults.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: '이미 이 팀원에 대한 평가를 작성했습니다. 수정하려면 기존 평가를 편집해주세요.' 
        });
      }
      
      // 새 리뷰 작성
      const insertSql = `
        INSERT INTO reviews (reviewer_id, reviewee_id, related_team_id, review_high, review_medium, review_low, comment)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      db.query(insertSql, [reviewer_id, reviewee_id, related_team_id, review_high, review_medium, review_low, comment], (err, result) => {
        if (err) {
          console.error('리뷰 작성 오류:', err);
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: '이미 이 팀원에 대한 평가를 작성했습니다' });
          }
          return res.status(500).json({ success: false, message: '서버 오류: ' + err.message });
        }
        
        console.log('✅ 새 리뷰 작성 성공');
        res.json({ success: true, message: '리뷰가 성공적으로 작성되었습니다', review_id: result.insertId });
      });
    });
  }
});

// 2. 기존 리뷰 조회 API (개선된 버전)
app.get('/api/reviews/existing/:reviewer_id/:reviewee_id/:related_team_id', (req, res) => {
  const { reviewer_id, reviewee_id, related_team_id } = req.params;
  
  console.log(`=== 기존 리뷰 조회 요청 ===`);
  console.log(`reviewer_id: ${reviewer_id}, reviewee_id: ${reviewee_id}, related_team_id: ${related_team_id}`);
  
  const sql = `
    SELECT review_id, review_high, review_medium, review_low, comment,
           CASE 
             WHEN review_high = 1 THEN 'high'
             WHEN review_medium = 1 THEN 'medium'
             WHEN review_low = 1 THEN 'low'
             ELSE NULL
           END as evaluation_type,
           created_at, updated_at
    FROM reviews 
    WHERE reviewer_id = ? AND reviewee_id = ? AND related_team_id = ?
  `;
  
  db.query(sql, [reviewer_id, reviewee_id, related_team_id], (err, results) => {
    if (err) {
      console.error('기존 리뷰 조회 오류:', err);
      return res.status(500).json({ success: false, message: '서버 오류' });
    }
    
    console.log(`조회 결과: ${results.length}개 리뷰 발견`);
    
    if (results.length > 0) {
      console.log('✅ 기존 리뷰 발견:', results[0]);
      res.json({ success: true, existingReview: results[0] });
    } else {
      console.log('기존 리뷰 없음');
      res.json({ success: true, existingReview: null });
    }
  });
});

// 3. 사용자별 받은 평가 요약 조회 API (개선된 버전)
app.get('/api/user/:id/evaluations', (req, res) => {
  const { id } = req.params;
  
  console.log(`=== 사용자 ${id} 평가 요약 조회 ===`);
  
  const sql = `
    SELECT 
      COALESCE(SUM(review_low), 0) as review_low,
      COALESCE(SUM(review_medium), 0) as review_medium,
      COALESCE(SUM(review_high), 0) as review_high,
      COUNT(*) as total_reviews
    FROM reviews 
    WHERE reviewee_id = ?
  `;
  
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('사용자 평가 조회 오류:', err);
      return res.status(500).json({ success: false, message: '서버 오류' });
    }
    
    const evaluations = results[0] || { review_low: 0, review_medium: 0, review_high: 0, total_reviews: 0 };
    
    console.log('✅ 평가 요약 조회 결과:', evaluations);
    
    res.json({ 
      success: true, 
      evaluations,
      debug: `사용자 ${id}의 평가 요약 - 총 ${evaluations.total_reviews}개 리뷰`
    });
  });
});

// 4. 사용자 활동 이력 조회 API (실제 데이터와 연결)
app.get('/api/user/:id/activities', (req, res) => {
  const { id } = req.params;
  
  console.log(`=== 사용자 ${id} 활동 이력 조회 ===`);
  
  // user_id 유효성 검사
  if (!id || id === 'undefined') {
    console.log('❌ 유효하지 않은 id:', id);
    return res.status(400).json({ 
      success: false, 
      message: '유효한 사용자 ID가 필요합니다' 
    });
  }
  
  // 실제 참여 데이터와 활동 정보를 조인하여 조회
  const sql = `
    SELECT DISTINCT
      a.activity_id as id,
      a.title,
      p.participated_at,
      p.participated_with,
      COALESCE(r.comment, '아직 평가가 없습니다.') as comment
    FROM activitys a
    INNER JOIN user_activity_participations p ON a.activity_id = p.activity_id
    LEFT JOIN reviews r ON r.reviewee_id = ? AND r.related_team_id = a.activity_id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
  `;
  
  db.query(sql, [id, id], (err, results) => {
    if (err) {
      console.error('사용자 활동 조회 오류:', err);
      return res.status(500).json({ success: false, message: '서버 오류' });
    }
    
    console.log(`✅ 활동 이력 조회 결과: ${results.length}개 활동`);
    console.log('조회된 활동:', results);
    
    res.json({ success: true, activities: results });
  });
});

// 5. 사용자의 참여 정보 조회 API (실제 테이블 구조에 맞게 수정)
app.get('/api/participations/user/:id', (req, res) => {
  const { id } = req.params;
  
  console.log(`=== 사용자 ${id} 참여 정보 조회 ===`);
  
  // user_id 유효성 검사
  if (!id || id === 'undefined') {
    return res.status(400).json({ 
      success: false, 
      message: '유효한 사용자 ID가 필요합니다' 
    });
  }
  
  // 실제 테이블명과 컬럼명 사용
  const sql = `
    SELECT 
      participation_id, 
      user_id,
      activity_id, 
      participated_at,
      participated_with,
      created_at
    FROM user_activity_participations 
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;
  
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('참여 정보 조회 오류:', err);
      return res.status(500).json({ success: false, message: '서버 오류' });
    }
    
    console.log(`✅ 참여 정보 조회 결과: ${results.length}개 참여`);
    console.log('조회된 데이터:', results);
    
    res.json({ success: true, participations: results });
  });
});

// 6. 여러 사용자 정보 일괄 조회 API (수정된 버전 - 핵심 수정사항)
app.post('/api/users/batch', (req, res) => {
  const { user_ids } = req.body;
  
  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    return res.status(400).json({ success: false, message: '사용자 ID 배열이 필요합니다' });
  }
  
  console.log(`=== 일괄 사용자 조회: ${user_ids.length}명 ===`);
  
  const placeholders = user_ids.map(() => '?').join(',');
  // ✅ 핵심 수정: id as user_id 별칭 제거, 직접 id 반환
  const sql = `SELECT id, name, department FROM users WHERE id IN (${placeholders})`;
  
  db.query(sql, user_ids, (err, results) => {
    if (err) {
      console.error('사용자 일괄 조회 오류:', err);
      return res.status(500).json({ success: false, message: '서버 오류' });
    }
    
    console.log(`✅ 일괄 조회 결과: ${results.length}명`);
    console.log('조회된 사용자 데이터:', results); // 디버깅용
    res.json({ success: true, users: results });
  });
});

// 7. MyPage2에서 사용할 팀원 정보 조회 API (실제 데이터 기반)
app.get('/api/user/:user_id/teammates', (req, res) => {
  const { user_id } = req.params;
  
  console.log(`=== 사용자 ${user_id}의 팀원 정보 조회 ===`);
  
  if (!user_id || user_id === 'undefined') {
    return res.status(400).json({ 
      success: false, 
      message: '유효한 사용자 ID가 필요합니다' 
    });
  }
  
  // 사용자가 참여한 활동별로 팀원 정보 조회
  const sql = `
    SELECT 
      p.activity_id,
      a.title as activity_title,
      p.participated_with,
      p.participated_at
    FROM user_activity_participations p
    INNER JOIN activitys a ON p.activity_id = a.activity_id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
  `;
  
  db.query(sql, [user_id], (err, results) => {
    if (err) {
      console.error('팀원 정보 조회 오류:', err);
      return res.status(500).json({ success: false, message: '서버 오류' });
    }
    
    console.log(`✅ 사용자 ${user_id}의 참여 활동: ${results.length}개`);
    
    if (results.length === 0) {
      return res.json({ success: true, participations: [] });
    }
    
    // participated_with에서 본인 제외하고 다른 팀원들의 정보 가져오기
    const processParticipations = async () => {
      const participations = [];
      
      for (const participation of results) {
        try {
          // JSON 파싱
          let participatedWith = [];
          if (participation.participated_with) {
            if (typeof participation.participated_with === 'string') {
              participatedWith = JSON.parse(participation.participated_with);
            } else {
              participatedWith = participation.participated_with;
            }
          }
          
          // 본인 제외
          const teammateIds = participatedWith.filter(id => Number(id) !== Number(user_id));
          
          console.log(`활동 ${participation.activity_id}: 팀원 ${teammateIds.length}명`);
          
          if (teammateIds.length > 0) {
            participations.push({
              activity_id: participation.activity_id,
              activity_title: participation.activity_title,
              participated_at: participation.participated_at,
              participated_with: teammateIds
            });
          }
        } catch (parseError) {
          console.error('JSON 파싱 오류:', parseError);
        }
      }
      
      res.json({ success: true, participations });
    };
    
    processParticipations();
  });
});

// 8. 디버깅용 - 전체 참여 정보 조회
app.get('/api/participations/debug', (req, res) => {
  const sql = `
    SELECT 
      p.*,
      a.title as activity_title,
      u.name as user_name
    FROM user_activity_participations p
    LEFT JOIN activitys a ON p.activity_id = a.activity_id
    LEFT JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('참여 정보 디버그 조회 오류:', err);
      return res.status(500).json({ success: false, message: '서버 오류' });
    }
    
    res.json({ success: true, participations: results });
  });
});

// 9. 디버깅용 리뷰 전체 조회 API
app.get('/api/reviews/debug', (req, res) => {
  const sql = `
    SELECT r.*, 
           u1.name as reviewer_name, 
           u2.name as reviewee_name
    FROM reviews r
    LEFT JOIN users u1 ON r.reviewer_id = u1.id
    LEFT JOIN users u2 ON r.reviewee_id = u2.id
    ORDER BY r.created_at DESC
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('리뷰 디버그 조회 오류:', err);
      return res.status(500).json({ success: false, message: '서버 오류' });
    }
    
    res.json({ success: true, reviews: results });
  });
});

// 10. 특정 활동의 참여자 목록 조회
app.get('/api/activities/:activity_id/participants', (req, res) => {
  const { activity_id } = req.params;
  
  const sql = `
    SELECT 
      p.user_id,
      u.name,
      u.department,
      p.participated_at
    FROM user_activity_participations p
    INNER JOIN users u ON p.user_id = u.id
    WHERE p.activity_id = ?
    ORDER BY p.created_at ASC
  `;
  
  db.query(sql, [activity_id], (err, results) => {
    if (err) {
      console.error('활동 참여자 조회 오류:', err);
      return res.status(500).json({ success: false, message: '서버 오류' });
    }
    
    res.json({ success: true, participants: results });
  });
});

// ✅ 수정된 프로필 이미지 업로드 섹션
// ═══════════════════════════════════════════════════════════
// 11. 프로필 이미지 업로드 (개선된 버전)
// ═══════════════════════════════════════════════════════════

// ✅ 개선된 프로필 이미지용 multer 설정
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilesDir); // 위에서 생성한 디렉토리 사용
  },
  filename: (req, file, cb) => {
    // 파일명: profile_userId_timestamp.확장자
    const userId = req.params.id;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `profile_${userId}_${timestamp}${ext}`);
  }
});

// ✅ 파일 크기 제한 및 타입 검증 추가
const uploadProfile = multer({ 
  storage: profileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB 제한
  },
  fileFilter: (req, file, cb) => {
    // 이미지 파일만 허용
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
  }
});

// ✅ 개선된 프로필 사진 업로드 및 업데이트 API
app.post('/api/upload/profile/:id', uploadProfile.single('image'), (req, res) => {
  const userId = req.params.id;
  
  console.log(`=== 프로필 사진 업로드 요청 ===`);
  console.log(`사용자 ID: ${userId}`);
  console.log(`업로드된 파일:`, req.file);
  
  if (!userId) {
    return res.status(400).json({ success: false, message: '사용자 ID가 필요합니다' });
  }
  
  if (!req.file) {
    return res.status(400).json({ success: false, message: '업로드할 이미지가 없습니다' });
  }

    // ✅ 새로운 이미지 URL 생성
  const newProfileImageUrl = `http://localhost:${PORT}/uploads/profiles/${req.file.filename}`;
  
  console.log(`생성된 이미지 URL: ${newProfileImageUrl}`);
  // ✅ 업로드된 파일의 URL 생성 (정적 파일 서빙 경로에 맞춤)
  const profileImageUrl = `http://localhost:${PORT}/uploads/profiles/${req.file.filename}`;
  
  console.log(`생성된 이미지 URL: ${profileImageUrl}`);

  // ✅ 먼저 기존 프로필 사진 정보 조회
  const selectQuery = 'SELECT profile_picture FROM users WHERE id = ?';
  
  db.query(selectQuery, [userId], (selectErr, selectResults) => {
    if (selectErr) {
      console.error('❌ 기존 프로필 사진 조회 오류:', selectErr);
      // 새로 업로드된 파일 삭제
      try {
        fs.unlinkSync(req.file.path);
        console.log('업로드된 파일 삭제됨 (조회 오류로 인해)');
      } catch (unlinkError) {
        console.error('파일 삭제 오류:', unlinkError);
      }
      return res.status(500).json({ 
        success: false, 
        message: '기존 프로필 사진 조회에 실패했습니다',
        error: selectErr.message 
      });
    }

    if (selectResults.length === 0) {
      // 사용자가 없음
      try {
        fs.unlinkSync(req.file.path);
        console.log('업로드된 파일 삭제됨 (사용자 없음)');
      } catch (unlinkError) {
        console.error('파일 삭제 오류:', unlinkError);
      }
      return res.status(404).json({ 
        success: false, 
        message: '사용자를 찾을 수 없습니다' 
      });
    }

    const currentProfilePicture = selectResults[0].profile_picture;
    
    // ✅ DB에서 새 프로필 사진 URL 업데이트
    const updateQuery = 'UPDATE users SET profile_picture = ? WHERE id = ?';
    
    db.query(updateQuery, [newProfileImageUrl, userId], (updateErr, updateResult) => {
      if (updateErr) {
        console.error('❌ DB 프로필 사진 업데이트 오류:', updateErr);
        
        // 새로 업로드된 파일 삭제
        try {
          fs.unlinkSync(req.file.path);
          console.log('업로드된 파일 삭제됨 (DB 오류로 인해)');
        } catch (unlinkError) {
          console.error('파일 삭제 오류:', unlinkError);
        }
        
        return res.status(500).json({ 
          success: false, 
          message: '데이터베이스 업데이트에 실패했습니다',
          error: updateErr.message 
        });
      }

      if (updateResult.affectedRows === 0) {
        // 사용자를 찾을 수 없음
        try {
          fs.unlinkSync(req.file.path);
          console.log('업로드된 파일 삭제됨 (사용자 없음)');
        } catch (unlinkError) {
          console.error('파일 삭제 오류:', unlinkError);
        }
        
        return res.status(404).json({ 
          success: false, 
          message: '사용자를 찾을 수 없습니다' 
        });
      }

      // ✅ DB 업데이트 성공 후 기존 프로필 사진 파일 삭제
      if (currentProfilePicture) {
        deleteOldProfileImage(currentProfilePicture);
      }

      console.log(`✅ 사용자 ${userId}의 프로필 사진 업데이트 완료: ${newProfileImageUrl}`);
      
      res.json({ 
        success: true, 
        message: '프로필 사진이 성공적으로 업데이트되었습니다', 
        imageUrl: newProfileImageUrl 
      });
    });
  });
});

// ✅ 기존 프로필 이미지 파일 삭제 함수
function deleteOldProfileImage(profilePictureUrl) {
  if (!profilePictureUrl) return;
  
  try {
    // URL에서 파일명 추출
    // 예: "http://localhost:3000/uploads/profiles/profile_3_1679123456789.jpg" 
    // -> "profile_3_1679123456789.jpg"
    const urlParts = profilePictureUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    
    // 파일 경로 생성
    const filePath = path.join(profilesDir, filename);
    
    console.log(`기존 프로필 이미지 삭제 시도: ${filePath}`);
    
    // 파일이 존재하는지 확인 후 삭제
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ 기존 프로필 이미지 삭제 완료: ${filename}`);
    } else {
      console.log(`⚠️ 삭제할 파일이 존재하지 않음: ${filename}`);
    }
  } catch (error) {
    console.error('❌ 기존 프로필 이미지 삭제 오류:', error);
    // 파일 삭제 실패는 치명적이지 않으므로 계속 진행
  }
}

// ✅ 사용자 정보 수정 API도 업데이트 (기본 이미지로 변경 시 기존 파일 삭제)
app.put('/api/user/:id', (req, res) => {
  const userId = req.params.id;
  const updates = req.body;

  const allowedFields = ['name', 'email', 'department', 'student_number', 'birth', 'profile_picture'];
  let updateFields = [];
  let updateValues = [];

  for (const field in updates) {
    if (allowedFields.includes(field)) {
      updateFields.push(`${field} = ?`);
      updateValues.push(updates[field]);
    }
  }

  if (updateFields.length === 0) {
    return res.status(400).json({ success: false, message: '업데이트할 필드가 없습니다' });
  }

  // ✅ profile_picture를 null로 변경하는 경우 기존 파일 삭제
  const isProfilePictureUpdate = updates.hasOwnProperty('profile_picture');
  const newProfilePicture = updates.profile_picture;

  if (isProfilePictureUpdate) {
    // 먼저 기존 프로필 사진 URL 조회
    const selectQuery = 'SELECT profile_picture FROM users WHERE id = ?';
    
    db.query(selectQuery, [userId], (selectErr, selectResults) => {
      if (selectErr) {
        console.error('기존 프로필 사진 조회 오류:', selectErr);
        return res.status(500).json({ success: false, message: '서버 오류' });
      }

      if (selectResults.length === 0) {
        return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다' });
      }

      const currentProfilePicture = selectResults[0].profile_picture;

      // DB 업데이트 실행
      const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
      updateValues.push(userId);

      db.query(updateQuery, updateValues, (updateErr, result) => {
        if (updateErr) {
          console.error('사용자 수정 오류:', updateErr);
          return res.status(500).json({ success: false, message: '서버 오류' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다' });
        }

        // ✅ 업데이트 성공 후 기존 파일 삭제 (null로 변경되는 경우)
        if (newProfilePicture === null && currentProfilePicture) {
          deleteOldProfileImage(currentProfilePicture);
          console.log(`사용자 ${userId}의 프로필 사진을 기본 이미지로 변경하고 기존 파일 삭제`);
        }

        res.json({ success: true, message: '사용자 정보가 업데이트되었습니다' });
      });
    });
  } else {
    // profile_picture 변경이 아닌 경우 기존 로직 유지
    const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    updateValues.push(userId);

    db.query(sql, updateValues, (err, result) => {
      if (err) {
        console.error('사용자 수정 오류:', err);
        return res.status(500).json({ success: false, message: '서버 오류' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다' });
      }

      res.json({ success: true, message: '사용자 정보가 업데이트되었습니다' });
    });
  }
});

// ✅ 정적 파일 서빙 설정 (profiles 디렉토리)
app.use('/uploads/profiles', express.static(profilesDir));

console.log('✅ 프로필 이미지 업로드 기능이 개선되었습니다');

/* ======================
   Team Recruitments & Applications APIs
   ====================== */

// 팀 모집글 목록 (최신순)
app.get('/api/team-recruitments', (req, res) => {
  const sql = `
    SELECT
      tr.recruitment_id, tr.owner_user_id, tr.team_id,
      tr.post_name, tr.activity_name, tr.activity_type,
      tr.qualification_department, tr.qualification_student_number, tr.qualification_age,
      tr.required_members, tr.activity_period, tr.meeting_type,
      tr.memo, tr.status, tr.created_at
    FROM team_recruitments tr
    ORDER BY tr.created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('팀 모집글 조회 오류:', err);
      return res.status(500).json({ message: '서버 오류' });
    }
    res.status(200).json(results);
  });
});

// (옵션) 카운트까지 한 번에 받고 싶으면 이걸 사용해도 됨
// MatchingScreen에서 이 엔드포인트를 쓰면 applications 호출을 생략 가능
app.get('/api/team-recruitments-with-count', (req, res) => {
  const sql = `
    SELECT
      tr.*,
      SUM(CASE WHEN a.status IN ('REJECTED','CANCELED') THEN 0 ELSE 1 END) AS current_members
    FROM team_recruitments tr
    LEFT JOIN applications a ON a.recruitment_id = tr.recruitment_id
    GROUP BY tr.recruitment_id
    ORDER BY tr.created_at DESC
  `;
  db.query(sql, (err, rows) => {
    if (err) {
      console.error('모집글+카운트 조회 오류:', err);
      return res.status(500).json({ message: '서버 오류' });
    }
    res.json(rows);
  });
});

// 팀 모집글 상세
app.get('/api/team-recruitments/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM team_recruitments WHERE recruitment_id = ?', [id], (err, results) => {
    if (err) {
      console.error('팀 모집글 상세 조회 오류:', err);
      return res.status(500).json({ message: '서버 오류' });
    }
    if (results.length === 0) return res.status(404).json({ message: '모집글이 없습니다.' });
    res.json(results[0]);
  });
});

// 모집글 작성(TeamMakeScreen에서 사용)
app.post('/api/team-recruitments', (req, res) => {
  const {
    owner_user_id,
    post_name,
    activity_name,
    activity_type,
    qualification_department,
    qualification_student_number,
    qualification_age,
    required_members,
    activity_period,
    meeting_type,
    memo,
    status = 'OPEN',
  } = req.body;

  if (!owner_user_id || !post_name || !activity_type || !required_members || !activity_name ) {
    return res.status(400).json({ message: '필수 항목이 누락되었습니다.' });
  }

  const sql = `
    INSERT INTO team_recruitments
    (owner_user_id, post_name, activity_name, activity_type, qualification_department, qualification_student_number,
     qualification_age, required_members, activity_period, meeting_type, memo, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    owner_user_id, post_name, activity_name, activity_type, qualification_department,
    qualification_student_number, qualification_age || null, required_members,
    activity_period, meeting_type, memo, status
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('모집글 생성 오류:', err);
      return res.status(500).json({ message: '서버 오류' });
    }
    res.status(201).json({ message: '모집글이 생성되었습니다.', recruitment_id: result.insertId });
  });
});

// 신청 목록(전체) — MatchingScreen의 집계용
app.get('/api/applications', (req, res) => {
  const sql = `
    SELECT application_id, recruitment_id, applicant_id, memo, status, created_at
    FROM applications
    ORDER BY created_at DESC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('신청 목록 조회 오류:', err);
      return res.status(500).json({ message: '서버 오류' });
    }
    res.json(results);
  });
});

// 특정 모집글 신청 목록
app.get('/api/team-recruitments/:id/applications', (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM applications WHERE recruitment_id = ? ORDER BY created_at DESC', [id], (err, results) => {
    if (err) {
      console.error('신청 조회 오류:', err);
      return res.status(500).json({ message: '서버 오류' });
    }
    res.json(results);
  });
});

// 신청 생성(팀 지원)
app.post('/api/applications', (req, res) => {
  const { recruitment_id, applicant_id, memo, status = 'PENDING' } = req.body;
  if (!recruitment_id || !applicant_id) {
    return res.status(400).json({ message: '필수 항목이 누락되었습니다.' });
  }

  const sql = 'INSERT INTO applications (recruitment_id, applicant_id, memo, status) VALUES (?, ?, ?, ?)';
  db.query(sql, [recruitment_id, applicant_id, memo || null, status], (err, result) => {
    if (err) {
      console.error('신청 생성 오류:', err);
      return res.status(500).json({ message: '서버 오류' });
    }
    res.status(201).json({ message: '신청이 등록되었습니다.', application_id: result.insertId });
  });
});

// 신청 상태 변경 (수락/반려)
app.put('/api/applications/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'APPROVED' | 'REJECTED'
  if (!['APPROVED','REJECTED'].includes(status)) {
    return res.status(400).json({ message: 'invalid status' });
  }

  db.beginTransaction(err => {
    if (err) {
      console.error('트랜잭션 시작 오류:', err);
      return res.status(500).json({ message: 'server error' });
    }

    // 1) 신청/모집글/작성자/현재 팀 정보 조회
    const q1 = `
      SELECT a.application_id, a.recruitment_id, a.applicant_id, a.status AS app_status,
             tr.team_id, tr.required_members, tr.post_name, tr.activity_name, tr.owner_user_id, tr.status AS recruit_status
      FROM applications a
      JOIN team_recruitments tr ON tr.recruitment_id = a.recruitment_id
      WHERE a.application_id = ? FOR UPDATE
    `;
    db.query(q1, [id], (err1, rows) => {
      if (err1) return rollback(err1, res);
      if (rows.length === 0) return rollback({ message: 'not found' }, res, 404);
      const row = rows[0];

      // 2) 먼저 신청 상태 업데이트
      const q2 = `UPDATE applications SET status = ? WHERE application_id = ?`;
      db.query(q2, [status, id], (err2) => {
        if (err2) return rollback(err2, res);

        if (status === 'REJECTED') {
          // 멤버였던 경우 제거(안전장치)
          if (row.team_id) {
            const qDel = `DELETE FROM team_members WHERE team_id = ? AND user_id = ?`;
            db.query(qDel, [row.team_id, row.applicant_id], (errDel) => {
              if (errDel) return rollback(errDel, res);
              return commit(res, { message: '반려 처리되었습니다.' });
            });
          } else {
            return commit(res, { message: '반려 처리되었습니다.' });
          }
          return;
        }

        // === APPROVED 흐름 ===
        // 3) 팀이 없으면 생성
        const createTeamIfNotExist = (cb) => {
          if (row.team_id) return cb(null, row.team_id); // 이미 팀 있음
          const qCreateTeam = `
            INSERT INTO teams (recruitment_id, team_name, leader_user_id, required_members)
            VALUES (?, ?, ?, ?)
          `;
          db.query(qCreateTeam, [row.recruitment_id, row.activity_name, row.owner_user_id, row.required_members], (errC, result) => {
            if (errC) return cb(errC);
            const newTeamId = result.insertId;
            // 모집글에 team_id 반영
            db.query(`UPDATE team_recruitments SET team_id = ? WHERE recruitment_id = ?`, [newTeamId, row.recruitment_id], (errU) => {
              if (errU) return cb(errU);
              // 팀장 등록(없을 때만)
              db.query(
                `INSERT IGNORE INTO team_members (team_id, user_id, role) VALUES (?, ?, 'LEADER')`,
                [newTeamId, row.owner_user_id],
                (errL) => (errL ? cb(errL) : cb(null, newTeamId))
              );
            });
          });
        };

        createTeamIfNotExist((errCreate, teamId) => {
          if (errCreate) return rollback(errCreate, res);

          // 4) 신청자 팀원으로 추가(중복 방지)
          const qAddMember = `INSERT IGNORE INTO team_members (team_id, user_id, role) VALUES (?, ?, 'MEMBER')`;
          db.query(qAddMember, [teamId, row.applicant_id], (errAdd) => {
            if (errAdd) return rollback(errAdd, res);

            // 5) 현재 팀원 수 계산(리더 + 승인된 멤버)
            const qCount = `SELECT COUNT(*) AS cnt FROM team_members WHERE team_id = ?`;
            db.query(qCount, [teamId], (errCnt, cntRows) => {
              if (errCnt) return rollback(errCnt, res);
              const memberCount = cntRows[0].cnt;

              // 정원 다 차면 모집글 종료
              if (memberCount >= row.required_members) {
                db.query(`UPDATE team_recruitments SET status = 'CLOSED' WHERE recruitment_id = ?`, [row.recruitment_id], (errClose) => {
                  if (errClose) return rollback(errClose, res);
                  return commit(res, { message: '수락 완료. 정원이 찼으므로 모집이 마감되었습니다.', team_id: teamId, memberCount });
                });
              } else {
                return commit(res, { message: '수락 완료. 팀에 합류되었습니다.', team_id: teamId, memberCount });
              }
            });
          });
        });
      });
    });
  });

  function rollback(err, res, code = 500) {
    console.error('TX ROLLBACK:', err);
    db.rollback(() => res.status(code).json({ message: 'server error', error: err.message || err }));
  }
  function commit(res, payload) {
    db.commit((err) => {
      if (err) {
        console.error('TX COMMIT 오류:', err);
        return db.rollback(() => res.status(500).json({ message: 'server error' }));
      }
      res.json(payload);
    });
  }
});

// 특정 모집글의 팀 요약
app.get('/api/recruitments/:id/team', (req, res) => {
  const { id } = req.params;
  const q = `
    SELECT t.*, 
           (SELECT JSON_ARRAYAGG(JSON_OBJECT('user_id', tm.user_id, 'role', tm.role))
            FROM team_members tm WHERE tm.team_id = t.team_id) AS members
    FROM teams t WHERE t.recruitment_id = ?
  `;
  db.query(q, [id], (err, rows) => {
    if (err) return res.status(500).json({ message: 'server error' });
    if (rows.length === 0) return res.status(404).json({ message: 'team not found' });
    res.json(rows[0]);
  });
});

console.log('✅ 모든 API가 성공적으로 등록되었습니다');
console.log('✅ 개선된 리뷰 관련 API가 포함되었습니다');
console.log('✅ user_activity_participations 테이블에 맞게 수정된 API가 포함되었습니다');
console.log('✅ users.id 필드 변경에 따른 수정이 완료되었습니다');



// ActivityScreen
// GET /users/:id/teams
app.get('/users/:id/teams', async (req, res) => {
  const userId = Number(req.params.id);
  const sql = `
    SELECT t.team_id AS teamId, t.team_name AS teamName, tm.part AS part
    FROM team_members tm
    JOIN teams t ON t.team_id = tm.team_id
    WHERE tm.user_id = ? AND t.status = 'ACTIVE'
    ORDER BY t.created_at DESC
  `;
  db.query(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ message: 'DB error', err });
    res.json(rows);
  });
});

//todo 관련
// ─────────────────────────────────────────────────────────────
// 임시 인증 미들웨어: 헤더 x-user-id 또는 req.user.id 사용
// 실서비스에선 JWT/세션으로 대체하세요.
// ─────────────────────────────────────────────────────────────
function requireUser(req, res, next) {
  // 1) JWT를 쓰는 경우: req.user = { id: decoded.id } 식으로 세팅되어 있어야 함
  // 2) 임시: x-user-id 헤더로 받기
  const idFromHeader = req.header('x-user-id');
  const userId = req.user?.id || idFromHeader;

  if (!userId) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: '로그인이 필요합니다.' });
  }
  req.user = { id: Number(userId) };
  next();
}

// ─────────────────────────────────────────────────────────────
// 1) GET /my-teams
//    로그인 사용자가 속한 팀 목록 + 팀 내 역할(part) 반환
//    반환: [{ team_id, team_name, part }]
// ─────────────────────────────────────────────────────────────
app.get('/my-teams', requireUser, (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT tm.team_id, t.team_name, tm.part, tm.part
    FROM team_members tm
    JOIN teams t ON t.team_id = tm.team_id
    WHERE tm.user_id = ?
    ORDER BY t.team_name ASC
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) {
      console.error('❌ /my-teams 실패:', err);
      return res.status(500).json({ error: 'DB_ERROR' });
    }
    return res.json(rows);
  });
});

// ─────────────────────────────────────────────────────────────
// 2) GET /todos/:teamId
//    특정 팀의 "로그인 사용자에게 할당된" 투두만 반환
//    반환: [{ todo_id, title, status, scope_start_date, scope_end_date, scope_type }]
// ─────────────────────────────────────────────────────────────
// GET /todos/:teamId?scope_type=주간&start=2025-09-08&end=2025-09-14
app.get('/todos/:teamId', requireUser, (req, res) => {
  const userId = req.user.id;
  const { teamId } = req.params;
  const { scope_type, start, end } = req.query;

  const params = [teamId, userId];
  let where = `team_id = ? AND assigned_user_id = ?`;

  if (scope_type) {
    where += ` AND COALESCE(scope_type,
      CASE
        WHEN DATEDIFF(scope_end_date, scope_start_date) = 0 THEN '일일'
        WHEN DATEDIFF(scope_end_date, scope_start_date) BETWEEN 1 AND 6 THEN '주간'
        ELSE '월간'
      END
    ) = ?`;
    params.push(scope_type);
  }

  // 기간이 주어지면 "겹치는 것"을 모두 보여줌
  if (start && end) {
    where += ` AND NOT (scope_end_date < ? OR scope_start_date > ?)`;
    params.push(start, end);
  }

  const sql = `
    SELECT
      todo_id, title, status, scope_start_date, scope_end_date,
      COALESCE(
        scope_type,
        CASE
          WHEN DATEDIFF(scope_end_date, scope_start_date) = 0 THEN '일일'
          WHEN DATEDIFF(scope_end_date, scope_start_date) BETWEEN 1 AND 6 THEN '주간'
          ELSE '월간'
        END
      ) AS scope_type
    FROM todos
    WHERE ${where}
    ORDER BY scope_start_date ASC, created_at ASC
  `;

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB_ERROR' });
    res.json(rows);
  });
});

// todo 상태 업데이트
// 제목/상태 수정 (둘 중 하나만 와도 OK)
app.put('/todos/:id', requireUser, (req, res) => {
  const { id } = req.params;
  const { title, status } = req.body;

  // 제목을 비워서 보냈다면 삭제 처리 권장 → 클라이언트에서는 DELETE 호출 권장
  if (typeof title === 'string' && title.trim() === '') {
    return res.status(400).json({ error: 'EMPTY_TITLE', message: '빈 제목은 허용되지 않습니다. 삭제를 사용하세요.' });
  }

  const fields = [];
  const params = [];
  if (typeof title === 'string') { fields.push('title = ?'); params.push(title.trim()); }
  if (typeof status === 'string') { fields.push('status = ?'); params.push(status); }

  if (fields.length === 0) return res.status(400).json({ error: 'NO_FIELDS' });

  const sql = `UPDATE todos SET ${fields.join(', ')} WHERE todo_id = ?`;
  params.push(id);

  db.query(sql, params, (err) => {
    if (err) return res.status(500).json({ error: 'DB_ERROR' });
    res.json({ success: true });
  });
});

// 투두 삭제
app.delete('/todos/:id', requireUser, (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM todos WHERE todo_id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: 'DB_ERROR' });
    res.json({ success: true });
  });
});

// todo 추가
// ✅ todo 추가 (로그인 사용자 기준)
app.post('/todos', requireUser, (req, res) => {
  const userId = req.user.id;
  const { team_id, title, scope_type, scope_start_date, scope_end_date } = req.body;

  if (!team_id || !title || !scope_type || !scope_start_date || !scope_end_date) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: '필수 값 누락' });
  }

  const sql = `
    INSERT INTO todos
      (team_id, assigned_user_id, title, status, scope_type, scope_start_date, scope_end_date)
    VALUES
      (?, ?, ?, '미진행', ?, ?, ?)
  `;

  db.query(
    sql,
    [team_id, userId, title, scope_type, scope_start_date, scope_end_date],
    (err, result) => {
      if (err) {
        console.error('❌ INSERT /todos 실패:', err);
        return res.status(500).json({ error: 'DB_ERROR' });
      }
      // 방금 만든 todo를 응답 (프론트가 바로 그릴 수 있게)
      res.json({
        todo_id: result.insertId,
        team_id,
        assigned_user_id: userId,
        title,
        status: '미진행',
        scope_type,
        scope_start_date,
        scope_end_date,
      });
    }
  );
});

// 역할 수정 (본인 part)
// PUT /team-members/:teamId/part
// 파트 수정 (본인만)
app.put('/team-members/:teamId/part', requireUser, (req, res) => {
  const userId = req.user.id;
  const { teamId } = req.params;
  const { part } = req.body;

  if (typeof part !== 'string') {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'part(문자열)이 필요합니다.' });
  }

  const sql = `UPDATE team_members SET part = ? WHERE team_id = ? AND user_id = ? LIMIT 1`;
  db.query(sql, [part.trim(), teamId, userId], (err, result) => {
    if (err) {
      console.error('DB_ERROR(update part):', err);
      return res.status(500).json({ error: 'DB_ERROR' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: '해당 팀의 구성원 정보가 없습니다.' });
    }
    res.json({ success: true, part: part.trim() });
  });
});

// 팀원 목록
// GET /teams/:teamId/members  -> [{user_id, name, part}]
app.get('/teams/:teamId/members', requireUser, (req, res) => {
  const { teamId } = req.params;
  const userId = req.user.id;
  const sql = `
    SELECT u.id AS user_id, u.name, tm.part
    FROM team_members tm
    JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = ? AND u.id <> ?
    ORDER BY u.name ASC
  `;
  db.query(sql, [teamId, userId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB_ERROR' });
    res.json(rows);
  });
});

// 팀원 todo 조회
// GET /teams/:teamId/todos?user_id=3&scope_type=주간&start=2025-09-08&end=2025-09-14
app.get('/teams/:teamId/todos', requireUser, (req, res) => {
  const { teamId } = req.params;
  const { user_id, scope_type, start, end } = req.query;

  if (!user_id) return res.status(400).json({ error: 'BAD_REQUEST', message: 'user_id 필요' });

  const params = [teamId, user_id];
  let where = `team_id = ? AND assigned_user_id = ?`;

  if (scope_type) {
    where += ` AND COALESCE(scope_type,
      CASE
        WHEN DATEDIFF(scope_end_date, scope_start_date) = 0 THEN '일일'
        WHEN DATEDIFF(scope_end_date, scope_start_date) BETWEEN 1 AND 6 THEN '주간'
        ELSE '월간'
      END
    ) = ?`;
    params.push(scope_type);
  }
  if (start && end) {
    where += ` AND NOT (scope_end_date < ? OR scope_start_date > ?)`;
    params.push(start, end);
  }

  const sql = `
    SELECT
      todo_id, title, status, scope_start_date, scope_end_date,
      COALESCE(
        scope_type,
        CASE
          WHEN DATEDIFF(scope_end_date, scope_start_date) = 0 THEN '일일'
          WHEN DATEDIFF(scope_end_date, scope_start_date) BETWEEN 1 AND 6 THEN '주간'
          ELSE '월간'
        END
      ) AS scope_type
    FROM todos
    WHERE ${where}
    ORDER BY scope_start_date ASC, created_at ASC
  `;
  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB_ERROR' });
    res.json(rows);
  });
});

// 팀원 todo 생성
// POST /teams/:teamId/todos  { assigned_user_id, title, scope_type, scope_start_date, scope_end_date }
app.post('/teams/:teamId/todos', requireUser, (req, res) => {
  const { teamId } = req.params;
  const { assigned_user_id, title, scope_type, scope_start_date, scope_end_date } = req.body;
  if (!assigned_user_id || !title || !scope_type || !scope_start_date || !scope_end_date) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: '필수 값 누락' });
  }
  const sql = `
    INSERT INTO todos
      (team_id, assigned_user_id, title, status, scope_type, scope_start_date, scope_end_date)
    VALUES (?, ?, ?, '미진행', ?, ?, ?)
  `;
  db.query(sql, [teamId, assigned_user_id, title, scope_type, scope_start_date, scope_end_date],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'DB_ERROR' });
      res.json({
        todo_id: result.insertId,
        team_id: Number(teamId),
        assigned_user_id,
        title,
        status: '미진행',
        scope_type,
        scope_start_date,
        scope_end_date,
      });
    }
  );
});

// Activity 페이지 프그래스바
// GET /teams/:teamId/progress?scope_type=월간&start=YYYY-MM-DD&end=YYYY-MM-DD
app.get('/teams/:teamId/progress', (req, res) => {
  const { teamId } = req.params;
  const { scope_type = '월간', start, end } = req.query;

  if (!start || !end) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'start, end 필요' });
  }

  const sql = `
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN status = '완료' THEN 1 ELSE 0 END) AS done
    FROM todos
    WHERE team_id = ?
      AND COALESCE(scope_type,
        CASE
          WHEN DATEDIFF(scope_end_date, scope_start_date) = 0 THEN '일일'
          WHEN DATEDIFF(scope_end_date, scope_start_date) BETWEEN 1 AND 6 THEN '주간'
          ELSE '월간'
        END
      ) = ?
      AND NOT (scope_end_date < ? OR scope_start_date > ?)
  `;
  db.query(sql, [teamId, scope_type, start, end], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB_ERROR' });
    const { total = 0, done = 0 } = rows[0] || {};
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    res.json({ total, done, percent });
  });
});

// ✅ 이슈트래커용 API 추가
// GET /teams/:teamId/daily-todos - 특정 팀의 모든 일일 todo 조회
app.get('/teams/:teamId/daily-todos', (req, res) => {
  const { teamId } = req.params;
  const today = new Date().toISOString().split('T')[0];

  const sql = `
    SELECT 
      t.todo_id,
      t.title,
      t.status,
      u.name as assigned_user_name,
      t.scope_start_date,
      t.scope_end_date
    FROM todos t
    INNER JOIN users u ON t.assigned_user_id = u.id
    WHERE t.team_id = ?
      AND t.scope_type = '일일'
      AND ? BETWEEN t.scope_start_date AND t.scope_end_date
    ORDER BY 
      CASE t.status 
        WHEN '미진행' THEN 1 
        WHEN '진행중' THEN 2 
        WHEN '완료' THEN 3 
        ELSE 4 
      END,
      t.created_at ASC
  `;

  db.query(sql, [teamId, today], (err, results) => {
    if (err) {
      console.error('❌ 팀 목표 조회 오류:', err);
      return res.status(500).json({ error: 'DB_ERROR', message: '서버 오류' });
    }
    res.json(results);
  });
});

