"""
Cygnal WebSocket Application — Enterprise Collaboration Layer
Phase 4: Real-time user presence, typing indicator triggers, and user-specific notification rooms.
"""

import os
import logging
import threading
from flask_socketio import SocketIO, emit, join_room, leave_room
from jwt_utils import decode_token

# Initialize socketio instance with configurable CORS origins
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
socketio = SocketIO(cors_allowed_origins=cors_origins)

# Thread-safe in-memory store tracking active investigators per case
presence_lock = threading.Lock()
active_case_users = {}  # case_id -> { sid -> { username, role } }

def _validate_socket_token(data: dict) -> dict | None:
    """
    Extract and validate JWT token from socket event data.
    Returns decoded payload or None if invalid.
    """
    token = data.get("token", "") if isinstance(data, dict) else ""
    if not token:
        return None
    return decode_token(token)


@socketio.on('connect')
def handle_connect():
    logging.info("WebSocket client connected")


@socketio.on('disconnect')
def handle_disconnect():
    from flask import request
    sid = request.sid
    
    rooms_to_update = []
    with presence_lock:
        for case_id in list(active_case_users.keys()):
            if sid in active_case_users[case_id]:
                del active_case_users[case_id][sid]
                users_list = list(active_case_users[case_id].values())
                rooms_to_update.append((case_id, users_list))
                if not active_case_users[case_id]:
                    del active_case_users[case_id]
                    
    # Broadcast presence updates to affected cases
    for case_id, users_list in rooms_to_update:
        socketio.emit('presence_update', {
            "case_id": case_id,
            "users": users_list
        }, to=case_id)
        
    logging.info(f"WebSocket client disconnected, sid: {sid}")


@socketio.on('join_case')
def handle_join_case(data):
    """Join a case room. Requires a valid JWT token in the event payload."""
    payload = _validate_socket_token(data)
    if not payload:
        emit('auth_error', {
            "success": False,
            "error": "Authentication required to subscribe to case updates."
        })
        return

    case_id = data.get('case_id')
    if case_id:
        join_room(case_id)
        username = payload.get("username", "unknown")
        role = payload.get("role", "analyst")
        
        from flask import request
        sid = request.sid
        
        with presence_lock:
            if case_id not in active_case_users:
                active_case_users[case_id] = {}
            active_case_users[case_id][sid] = {
                "username": username,
                "role": role
            }
            users_list = list(active_case_users[case_id].values())
            
        logging.info(f"Client '{username}' joined case room: {case_id}")
        emit('room_joined', {"success": True, "room": case_id})
        socketio.emit('presence_update', {
            "case_id": case_id,
            "users": users_list
        }, to=case_id)


@socketio.on('leave_case')
def handle_leave_case(data):
    """Leave a case room."""
    case_id = data.get('case_id')
    if case_id:
        leave_room(case_id)
        
        from flask import request
        sid = request.sid
        
        users_list = []
        with presence_lock:
            if case_id in active_case_users and sid in active_case_users[case_id]:
                del active_case_users[case_id][sid]
                if not active_case_users[case_id]:
                    del active_case_users[case_id]
                else:
                    users_list = list(active_case_users[case_id].values())
                    
        logging.info(f"Client left case room: {case_id}")
        emit('room_left', {"success": True, "room": case_id})
        socketio.emit('presence_update', {
            "case_id": case_id,
            "users": users_list
        }, to=case_id)


@socketio.on('join_alert')
def handle_join_alert(data):
    """Join an alert room. Requires a valid JWT token in the event payload."""
    payload = _validate_socket_token(data)
    if not payload:
        emit('auth_error', {
            "success": False,
            "error": "Authentication required to subscribe to alert updates."
        })
        return

    alert_id = data.get('alert_id')
    if alert_id:
        join_room(alert_id)
        username = payload.get("username", "unknown")
        logging.info(f"Client '{username}' joined alert room: {alert_id}")
        emit('alert_room_joined', {"success": True, "room": alert_id})


@socketio.on('leave_alert')
def handle_leave_alert(data):
    """Leave an alert room."""
    alert_id = data.get('alert_id')
    if alert_id:
        leave_room(alert_id)
        logging.info(f"Client left alert room: {alert_id}")
        emit('alert_room_left', {"success": True, "room": alert_id})


@socketio.on('join_user')
def handle_join_user(data):
    """Join a direct personal notification room. Requires valid JWT."""
    payload = _validate_socket_token(data)
    if not payload:
        emit('auth_error', {
            "success": False,
            "error": "Authentication required to join user notification room."
        })
        return
        
    username = payload.get("username")
    if username:
        join_room(username)
        logging.info(f"Client joined user direct room: {username}")
        emit('user_room_joined', {"success": True, "room": username})


@socketio.on('typing_status')
def handle_typing_status(data):
    """Broadcast current typing indicator status to other room members."""
    payload = _validate_socket_token(data)
    if not payload:
        return
        
    case_id = data.get("case_id")
    is_typing = data.get("is_typing", False)
    if case_id:
        username = payload.get("username", "unknown")
        # Send typing update to all clients in the case room
        socketio.emit('typing_update', {
            "case_id": case_id,
            "username": username,
            "is_typing": is_typing
        }, to=case_id, include_self=False)
