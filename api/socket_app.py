"""
Cygnal WebSocket Application — Production Hardening
H-05 FIX: All room-join handlers now require a valid JWT token.
Unauthenticated clients receive an auth_error event and are not joined to any room.
"""

import os
import logging
from flask_socketio import SocketIO, emit, join_room, leave_room
from jwt_utils import decode_token

# Initialize socketio instance with configurable CORS origins
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
socketio = SocketIO(cors_allowed_origins=cors_origins)


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
    logging.info("WebSocket client disconnected")


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
        logging.info(f"Client '{username}' joined case room: {case_id}")
        emit('room_joined', {"success": True, "room": case_id})


@socketio.on('leave_case')
def handle_leave_case(data):
    """Leave a case room. No auth required to leave."""
    case_id = data.get('case_id')
    if case_id:
        leave_room(case_id)
        logging.info(f"Client left case room: {case_id}")
        emit('room_left', {"success": True, "room": case_id})


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
    """Leave an alert room. No auth required to leave."""
    alert_id = data.get('alert_id')
    if alert_id:
        leave_room(alert_id)
        logging.info(f"Client left alert room: {alert_id}")
        emit('alert_room_left', {"success": True, "room": alert_id})

