const crypto = require('crypto');

// デモ用ユーザーデータ（実際の本番環境では外部データベースを使用）
const users = [
    {
        id: 1,
        username: 'admin',
        password: 'admin123', // 実際の環境ではハッシュ化が必要
        name: '山田太郎',
        role: '管理者'
    },
    {
        id: 2,
        username: 'user',
        password: 'user123',
        name: '佐藤花子',
        role: 'ユーザー'
    }
];

// セッション管理（メモリ内、実際の環境ではRedisなどを使用）
const sessions = new Map();

// セッション有効期限（24時間）
const SESSION_DURATION = 24 * 60 * 60 * 1000;

/**
 * ユーザー認証
 */
function authenticateUser(username, password) {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    return null;
}

/**
 * セッション作成
 */
function createSession(user) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const session = {
        id: sessionId,
        user: user,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + SESSION_DURATION)
    };
    
    sessions.set(sessionId, session);
    return sessionId;
}

/**
 * セッション検証
 */
function validateSession(sessionId) {
    if (!sessionId) return null;
    
    const session = sessions.get(sessionId);
    if (!session) return null;
    
    // セッション有効期限チェック
    if (new Date() > session.expiresAt) {
        sessions.delete(sessionId);
        return null;
    }
    
    return session;
}

/**
 * セッション削除（ログアウト）
 */
function destroySession(sessionId) {
    if (sessionId) {
        sessions.delete(sessionId);
    }
}

/**
 * 期限切れセッションのクリーンアップ
 */
function cleanupExpiredSessions() {
    const now = new Date();
    for (const [sessionId, session] of sessions.entries()) {
        if (now > session.expiresAt) {
            sessions.delete(sessionId);
        }
    }
}

// 定期的に期限切れセッションをクリーンアップ（1時間ごと）
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

module.exports = {
    authenticateUser,
    createSession,
    validateSession,
    destroySession,
    cleanupExpiredSessions
};