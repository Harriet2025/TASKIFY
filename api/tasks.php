<?php
require_once __DIR__ . '/config.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int) $_GET['id'] : null;

switch ($method) {
    case 'GET':
        getTasks();
        break;
    case 'POST':
        createTask();
        break;
    case 'PUT':
        if (!$id) jsonResponse(['error' => 'Task ID is required'], 400);
        updateTask($id);
        break;
    case 'DELETE':
        if (!$id) jsonResponse(['error' => 'Task ID is required'], 400);
        deleteTask($id);
        break;
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function getTasks(): void {
    $conn = getConnection();
    $result = $conn->query('SELECT * FROM tasks ORDER BY created_at DESC');
    $tasks = [];
    while ($row = $result->fetch_assoc()) {
        $tasks[] = $row;
    }
    $conn->close();
    jsonResponse($tasks);
}

function createTask(): void {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) jsonResponse(['error' => 'Invalid JSON body'], 400);

    $title = trim($body['title'] ?? '');
    $description = trim($body['description'] ?? '');
    $priority = $body['priority'] ?? 'Medium';
    $status = $body['status'] ?? 'To Do';
    $due_date = $body['due_date'] ?? '';

    if (!$title) jsonResponse(['error' => 'Title is required'], 422);
    if (!$due_date) jsonResponse(['error' => 'Due date is required'], 422);
    if (!in_array($priority, ['Low', 'Medium', 'High'])) jsonResponse(['error' => 'Invalid priority'], 422);
    if (!in_array($status, ['To Do', 'In Progress', 'Done'])) jsonResponse(['error' => 'Invalid status'], 422);

    $conn = getConnection();
    $stmt = $conn->prepare(
        'INSERT INTO tasks (title, description, priority, status, due_date) VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->bind_param('sssss', $title, $description, $priority, $status, $due_date);

    if (!$stmt->execute()) {
        jsonResponse(['error' => 'Failed to create task'], 500);
    }

    $newId = $conn->insert_id;
    $stmt->close();

    $result = $conn->query("SELECT * FROM tasks WHERE id = $newId");
    $task = $result->fetch_assoc();
    $conn->close();

    jsonResponse($task, 201);
}

function updateTask(int $id): void {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) jsonResponse(['error' => 'Invalid JSON body'], 400);

    $conn = getConnection();
    $check = $conn->query("SELECT id FROM tasks WHERE id = $id");
    if ($check->num_rows === 0) jsonResponse(['error' => 'Task not found'], 404);

    $fields = [];
    $types = '';
    $values = [];

    if (isset($body['title'])) {
        $fields[] = 'title = ?';
        $types .= 's';
        $values[] = trim($body['title']);
    }
    if (isset($body['description'])) {
        $fields[] = 'description = ?';
        $types .= 's';
        $values[] = trim($body['description']);
    }
    if (isset($body['priority'])) {
        if (!in_array($body['priority'], ['Low', 'Medium', 'High'])) jsonResponse(['error' => 'Invalid priority'], 422);
        $fields[] = 'priority = ?';
        $types .= 's';
        $values[] = $body['priority'];
    }
    if (isset($body['status'])) {
        if (!in_array($body['status'], ['To Do', 'In Progress', 'Done'])) jsonResponse(['error' => 'Invalid status'], 422);
        $fields[] = 'status = ?';
        $types .= 's';
        $values[] = $body['status'];
    }
    if (isset($body['due_date'])) {
        $fields[] = 'due_date = ?';
        $types .= 's';
        $values[] = $body['due_date'];
    }

    if (!$fields) jsonResponse(['error' => 'No fields to update'], 400);

    $types .= 'i';
    $values[] = $id;

    $sql = 'UPDATE tasks SET ' . implode(', ', $fields) . ' WHERE id = ?';
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$values);

    if (!$stmt->execute()) jsonResponse(['error' => 'Failed to update task'], 500);
    $stmt->close();

    $result = $conn->query("SELECT * FROM tasks WHERE id = $id");
    $task = $result->fetch_assoc();
    $conn->close();

    jsonResponse($task);
}

function deleteTask(int $id): void {
    $conn = getConnection();
    $check = $conn->query("SELECT id FROM tasks WHERE id = $id");
    if ($check->num_rows === 0) jsonResponse(['error' => 'Task not found'], 404);

    $conn->query("DELETE FROM tasks WHERE id = $id");
    $conn->close();

    jsonResponse(['message' => 'Task deleted']);
}
