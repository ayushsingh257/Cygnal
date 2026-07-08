import os
from flask_socketio import SocketIO, emit, join_room, leave_room
import logging

# Initialize socketio instance with configurable CORS origins
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
socketio = SocketIO(cors_allowed_origins=cors_origins)

@socketio.on('connect')
def handle_connect():
    logging.info("WebSocket client connected")

@socketio.on('disconnect')
def handle_disconnect():
    logging.info("WebSocket client disconnected")

@socketio.on('join_case')
def handle_join_case(data):
    case_id = data.get('case_id')
    if case_id:
        join_room(case_id)
        logging.info(f"Client joined room: {case_id}")
        emit('room_joined', {"success": True, "room": case_id})

@socketio.on('leave_case')
def handle_leave_case(data):
    case_id = data.get('case_id')
    if case_id:
        leave_room(case_id)
        logging.info(f"Client left room: {case_id}")
        emit('room_left', {"success": True, "room": case_id})

@socketio.on('join_alert')
def handle_join_alert(data):
    alert_id = data.get('alert_id')
    if alert_id:
        join_room(alert_id)
        logging.info(f"Client joined alert room: {alert_id}")
        emit('alert_room_joined', {"success": True, "room": alert_id})

@socketio.on('leave_alert')
def handle_leave_alert(data):
    alert_id = data.get('alert_id')
    if alert_id:
        leave_room(alert_id)
        logging.info(f"Client left alert room: {alert_id}")
        emit('alert_room_left', {"success": True, "room": alert_id})
