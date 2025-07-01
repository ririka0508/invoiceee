const crypto = require('crypto');

// Google認証用のセッション管理
const googleSessions = new Map();
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24時間

/**
 * Google認証からのユーザー情報を処理
 */
function processGoogleUser(googleUserInfo) {
    // Google認証で取得したユーザー情報を内部形式に変換
    return {
        id: googleUserInfo.sub, // Google User ID
        email: googleUserInfo.email,
        name: googleUserInfo.name,
        picture: googleUserInfo.picture,
        role: 'ユーザー', // デフォルトロール
        provider: 'google'
    };
}

/**
 * 管理者権限チェック
 */
function isAdmin(email) {
    // 管理者メールアドレスのリスト（環境変数で管理推奨）
    const adminEmails = [
        'admin@company.com',
        'masakazutakashi@gmail.com' // 例
    ];
    return adminEmails.includes(email);
}

/**
 * Google認証後のセッション作成
 */
function createGoogleSession(googleUserInfo) {
    const user = processGoogleUser(googleUserInfo);
    
    // 管理者権限の設定
    if (isAdmin(user.email)) {
        user.role = '管理者';
    }
    
    const sessionId = crypto.randomBytes(32).toString('hex');
    const session = {
        id: sessionId,
        user: user,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + SESSION_DURATION)
    };
    
    googleSessions.set(sessionId, session);
    return sessionId;
}

/**
 * Google認証セッションの検証
 */
function validateGoogleSession(sessionId) {
    if (!sessionId) return null;
    
    const session = googleSessions.get(sessionId);
    if (!session) return null;
    
    // セッション有効期限チェック
    if (new Date() > session.expiresAt) {
        googleSessions.delete(sessionId);
        return null;
    }
    
    return session;
}

/**
 * Google認証セッションの削除
 */
function destroyGoogleSession(sessionId) {
    if (sessionId) {
        googleSessions.delete(sessionId);
    }
}

/**
 * 期限切れGoogle認証セッションのクリーンアップ
 */
function cleanupExpiredGoogleSessions() {
    const now = new Date();
    for (const [sessionId, session] of googleSessions.entries()) {
        if (now > session.expiresAt) {
            googleSessions.delete(sessionId);
        }
    }
}

// 定期的に期限切れセッションをクリーンアップ（1時間ごと）
setInterval(cleanupExpiredGoogleSessions, 60 * 60 * 1000);

module.exports = {
    processGoogleUser,
    isAdmin,
    createGoogleSession,
    validateGoogleSession,
    destroyGoogleSession,
    cleanupExpiredGoogleSessions
};