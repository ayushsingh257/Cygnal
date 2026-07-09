import uuid
from datetime import datetime
from db_utils import get_db_connection
from socket_app import socketio

def create_notification(username: str, title: str, content: str, notification_type: str, case_id: str = None) -> dict:
    """
    Saves a persistent notification in the database and broadcasts it 
    via Socket.IO directly to the recipient user's workspace.
    """
    notification_id = str(uuid.uuid4())
    now_str = datetime.utcnow().isoformat() + "Z"
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO notifications (id, username, title, content, type, is_read, case_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, (notification_id, username, title, content, notification_type, 0, case_id, now_str))
    conn.commit()
    conn.close()
    
    notification = {
        "id": notification_id,
        "username": username,
        "title": title,
        "content": content,
        "type": notification_type,
        "is_read": 0,
        "case_id": case_id,
        "created_at": now_str
    }
    
    # Broadcast notification to the specific user's socket room
    try:
        socketio.emit("new_notification", notification, to=username)
    except Exception as e:
        print("[SOCKET BROADCAST ERROR]", str(e))
        
    return notification

def get_user_notifications(username: str) -> list:
    """
    Retrieves all notifications for a given username.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, username, title, content, type, is_read, case_id, created_at
        FROM notifications
        WHERE username = ?
        ORDER BY created_at DESC;
    """, (username,))
    rows = cursor.fetchall()
    conn.close()
    
    notifications = []
    for r in rows:
        notifications.append({
            "id": r[0],
            "username": r[1],
            "title": r[2],
            "content": r[3],
            "type": r[4],
            "is_read": int(r[5]),
            "case_id": r[6],
            "created_at": r[7]
        })
    return notifications

def mark_notifications_as_read(username: str, notification_ids: list = None) -> bool:
    """
    Marks notifications as read. If notification_ids is None, marks all notifications
    for the user as read.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if notification_ids:
        # Mark specific notifications
        placeholders = ",".join(["?"] * len(notification_ids))
        cursor.execute(f"""
            UPDATE notifications
            SET is_read = 1
            WHERE username = ? AND id IN ({placeholders});
        """, [username] + notification_ids)
    else:
        # Mark all for user
        cursor.execute("""
            UPDATE notifications
            SET is_read = 1
            WHERE username = ?;
        """, (username,))
        
    conn.commit()
    conn.close()
    return True
