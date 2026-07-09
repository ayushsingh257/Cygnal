import pytest
import sqlite3
import json
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import app
from database import DB_PATH, init_lookup_db
from auth_utils import init_db, hash_password
from jwt_utils import create_token
from services.collaboration_service import (
    create_notification,
    get_user_notifications,
    mark_notifications_as_read
)

@pytest.fixture(autouse=True)
def setup_database():
    init_lookup_db()
    init_db()

@pytest.fixture
def auth_headers():
    # Setup test_analyst
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT username FROM users WHERE username = 'test_analyst';")
    if not cursor.fetchone():
        pwd_hash = hash_password("Duster@2004")
        cursor.execute("""
            INSERT INTO users (username, password_hash, role, department, team, created_at)
            VALUES ('test_analyst', ?, 'analyst', 'Incident Response', 'Triage', '2026-07-07T00:00:00Z');
        """, (pwd_hash,))
    
    # Setup test_assignee
    cursor.execute("SELECT username FROM users WHERE username = 'test_assignee';")
    if not cursor.fetchone():
        pwd_hash = hash_password("Duster@2004")
        cursor.execute("""
            INSERT INTO users (username, password_hash, role, department, team, created_at)
            VALUES ('test_assignee', ?, 'analyst', 'Malware Response', 'Intel', '2026-07-07T00:00:00Z');
        """, (pwd_hash,))
        
    conn.commit()
    conn.close()

    token = create_token({"username": "test_analyst", "role": "analyst"})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_collaboration_service_ops():
    # 1. Create a notification
    noti = create_notification(
        username="test_analyst",
        title="Malicious IP Alert",
        content="IP 192.168.1.100 was flagged as malware ingress.",
        notification_type="system",
        case_id="case-123"
    )
    assert noti["username"] == "test_analyst"
    assert noti["title"] == "Malicious IP Alert"
    assert noti["type"] == "system"
    assert noti["is_read"] == 0

    # 2. Get list of notifications
    lst = get_user_notifications("test_analyst")
    assert len(lst) >= 1
    assert lst[0]["id"] == noti["id"]

    # 3. Mark read
    mark_notifications_as_read("test_analyst", [noti["id"]])
    lst2 = get_user_notifications("test_analyst")
    assert lst2[0]["is_read"] == 1

def test_notifications_rest_api(client, auth_headers):
    # Create notification for client user
    create_notification(
        username="test_analyst",
        title="Case Update Alert",
        content="Comment was posted to Case CYG-2026-0001.",
        notification_type="comment",
        case_id="case-111"
    )

    # Fetch notifications via API
    res = client.get("/api/notifications", headers=auth_headers)
    data = res.get_json()
    assert res.status_code == 200
    assert data["success"] is True
    assert len(data["notifications"]) >= 1
    assert data["notifications"][0]["username"] == "test_analyst"
    assert data["notifications"][0]["type"] == "comment"
    
    noti_id = data["notifications"][0]["id"]

    # Mark as read via API
    payload = {"ids": [noti_id]}
    res_read = client.post("/api/notifications/read", json=payload, headers=auth_headers)
    data_read = res_read.get_json()
    assert res_read.status_code == 200
    assert data_read["success"] is True

    # Confirm marked read
    res_check = client.get("/api/notifications", headers=auth_headers)
    data_check = res_check.get_json()
    check_noti = [n for n in data_check["notifications"] if n["id"] == noti_id][0]
    assert check_noti["is_read"] == 1

def test_roster_endpoint(client, auth_headers):
    res = client.get("/api/roster", headers=auth_headers)
    data = res.get_json()
    assert res.status_code == 200
    assert data["success"] is True
    assert len(data["users"]) >= 2  # test_analyst and test_assignee
    usernames = [u["username"] for u in data["users"]]
    assert "test_analyst" in usernames
    assert "test_assignee" in usernames

def test_case_assignment_flow(client, auth_headers):
    # 1. Create a test case
    case_payload = {
        "title": "Collaborative Investigation Case",
        "description": "Shared investigation timeline testing case.",
        "severity": "medium",
        "department": "Incident Response"
    }
    res_case = client.post("/api/cases", json=case_payload, headers=auth_headers)
    case_data = res_case.get_json()
    assert res_case.status_code == 200
    case_id = case_data["case"]["id"]

    # 2. Assign case via API
    assign_payload = {"assigned_to": "test_assignee"}
    res_assign = client.post(f"/api/cases/{case_id}/assign", json=assign_payload, headers=auth_headers)
    assign_data = res_assign.get_json()
    assert res_assign.status_code == 200
    assert assign_data["success"] is True
    assert assign_data["assigned_to"] == "test_assignee"

    # 3. Verify assignee received notification
    token_assignee = create_token({"username": "test_assignee", "role": "analyst"})
    headers_assignee = {"Authorization": f"Bearer {token_assignee}"}
    res_notif = client.get("/api/notifications", headers=headers_assignee)
    notif_data = res_notif.get_json()
    assert len(notif_data["notifications"]) >= 1
    assert notif_data["notifications"][0]["type"] == "assignment"
    assert "Collaborative Investigation Case" in notif_data["notifications"][0]["content"]

    # 4. Verify case assignment matches in the db
    res_detail = client.get(f"/api/cases/{case_id}", headers=auth_headers)
    detail_data = res_detail.get_json()
    assert detail_data["case"]["assigned_to"] == "test_assignee"

    # 5. Check timeline event logged for assignment
    has_assignment_event = False
    for event in detail_data["timeline"]:
        if event["event_type"] == "case_assigned" and "test_assignee" in event["description"]:
            has_assignment_event = True
            break
    assert has_assignment_event is True

def test_socket_room_presence_and_typing():
    from socket_app import (
        socketio,
        active_case_users,
        handle_join_case,
        handle_leave_case,
        handle_typing_status,
        handle_join_user
    )
    
    # Clean registry
    active_case_users.clear()

    # Generate token
    token = create_token({"username": "test_analyst", "role": "analyst"})

    # Mock class for Flask Request/socket contexts
    class MockRequest:
        def __init__(self, sid):
            self.sid = sid
            self.namespace = "/"

    import flask
    import socket_app
    
    # Mock join_room and leave_room to avoid Flask context error
    socket_app.join_room = lambda room: None
    socket_app.leave_room = lambda room: None

    # Mock join_case using custom sid
    class MockSocketIO:
        def __init__(self):
            self.emitted = []
        def emit(self, event, *args, **kwargs):
            data = args[0] if args else None
            to = kwargs.get("to")
            self.emitted.append((event, data, to))

    # Swap socketio.emit
    original_emit = socketio.emit
    mock_emit = MockSocketIO()
    socketio.emit = mock_emit.emit

    # Mock flask request sid context
    flask.request = MockRequest("sid-1111")

    # 1. Join Case
    with app.app_context():
        handle_join_case({"case_id": "case-999", "token": token})
    assert "case-999" in active_case_users
    assert "sid-1111" in active_case_users["case-999"]
    assert active_case_users["case-999"]["sid-1111"]["username"] == "test_analyst"

    # Verify presence_update was emitted
    has_presence = False
    for event, data, to in mock_emit.emitted:
        if event == "presence_update" and to == "case-999":
            has_presence = True
            assert data["users"][0]["username"] == "test_analyst"
    assert has_presence is True

    # 2. Typing indicator status
    mock_emit.emitted.clear()
    with app.app_context():
        handle_typing_status({"case_id": "case-999", "token": token, "is_typing": True})
    has_typing = False
    for event, data, to in mock_emit.emitted:
        if event == "typing_update" and to == "case-999":
            has_typing = True
            assert data["username"] == "test_analyst"
            assert data["is_typing"] is True
    assert has_typing is True

    # Restore socketio.emit
    socketio.emit = original_emit
