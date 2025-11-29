<?php
declare(strict_types=1);

/**
 * Простой PHP backend для хостинга статичных страниц Open CRM.
 * Реализует минимальный REST API поверх файлового хранилища.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

const DATA_FILE = __DIR__ . '/../data/data.json';
const DEFAULT_PASSWORD = 'password';

$resources = [
    'users' => [
        'required' => ['name', 'email', 'role'],
        'optional' => ['phone'],
    ],
    'company-groups' => [
        'required' => ['name'],
        'optional' => ['description'],
    ],
    'contractors' => [
        'required' => ['name'],
        'optional' => ['company_group_id', 'type'],
    ],
    'contracts' => [
        'required' => ['title'],
        'optional' => ['contractor_id', 'value'],
    ],
    'deals' => [
        'required' => ['title'],
        'optional' => ['status_id', 'value'],
    ],
    'deal-statuses' => [
        'required' => ['name'],
        'optional' => ['color'],
    ],
];

$path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '/';
$segments = array_values(array_filter(explode('/', trim($path, '/'))));

if (($segments[0] ?? '') !== 'api') {
    sendError('Not found', 404);
}

if (($segments[1] ?? '') === 'health') {
    sendResponse(['status' => 'ok']);
}

if (($segments[1] ?? '') === 'auth' && ($segments[2] ?? '') === 'login') {
    handleLogin();
}

$resourceName = $segments[1] ?? '';
$resourceId = $segments[2] ?? null;

if (!isset($resources[$resourceName])) {
    sendError('Unknown resource', 404);
}

data_init();

data_route($resourceName, $resourceId, $resources[$resourceName]);

function data_route(string $resourceName, ?string $resourceId, array $config): void
{
    $method = $_SERVER['REQUEST_METHOD'];
    $data = loadData();

    if (!isset($data[$resourceName])) {
        $data[$resourceName] = [];
    }

    if ($method === 'GET' && $resourceId === null) {
        sendResponse(array_values($data[$resourceName]));
    }

    if ($method === 'GET') {
        $item = findById($data[$resourceName], $resourceId);
        if ($item === null) {
            sendError('Record not found', 404);
        }
        sendResponse($item);
    }

    if ($method === 'POST') {
        $payload = readPayload();
        validateRequired($payload, $config['required']);

        $nextId = findNextId($data[$resourceName]);
        $item = ['id' => $nextId];
        foreach ($config['required'] as $field) {
            $item[$field] = $payload[$field];
        }
        foreach ($config['optional'] as $field) {
            if (array_key_exists($field, $payload)) {
                $item[$field] = $payload[$field];
            }
        }

        $data[$resourceName][] = $item;
        saveData($data);

        sendResponse($item, 201);
    }

    if (($method === 'PUT' || $method === 'PATCH') && $resourceId !== null) {
        $payload = readPayload();
        $index = findIndexById($data[$resourceName], $resourceId);
        if ($index === null) {
            sendError('Record not found', 404);
        }

        foreach (array_merge($config['required'], $config['optional']) as $field) {
            if (array_key_exists($field, $payload)) {
                $data[$resourceName][$index][$field] = $payload[$field];
            }
        }

        saveData($data);
        sendResponse($data[$resourceName][$index]);
    }

    if ($method === 'DELETE' && $resourceId !== null) {
        $index = findIndexById($data[$resourceName], $resourceId);
        if ($index === null) {
            sendError('Record not found', 404);
        }

        array_splice($data[$resourceName], $index, 1);
        saveData($data);
        sendResponse(['status' => 'deleted']);
    }

    sendError('Method not allowed', 405);
}

function data_init(): void
{
    if (!file_exists(DATA_FILE)) {
        $defaultData = [
            'users' => [
                [
                    'id' => 1,
                    'name' => 'Иван Иванов',
                    'email' => 'ivan@example.com',
                    'role' => 'Администратор',
                    'phone' => '+7 900 000-00-01',
                ],
                [
                    'id' => 2,
                    'name' => 'Мария Смирнова',
                    'email' => 'maria@example.com',
                    'role' => 'Менеджер',
                    'phone' => '+7 900 000-00-02',
                ],
            ],
            'company-groups' => [
                [
                    'id' => 1,
                    'name' => 'Группа Альфа',
                    'description' => 'Девелоперские проекты в Москве',
                ],
                [
                    'id' => 2,
                    'name' => 'Группа Бета',
                    'description' => 'Региональные проекты',
                ],
            ],
            'contractors' => [
                [
                    'id' => 1,
                    'name' => 'ООО «Альфа Строй»',
                    'company_group_id' => 1,
                    'type' => 'Подрядчик',
                ],
                [
                    'id' => 2,
                    'name' => 'ООО «Бета Инвест»',
                    'company_group_id' => 2,
                    'type' => 'Клиент',
                ],
            ],
            'contracts' => [
                [
                    'id' => 1,
                    'title' => 'Подряд на строительство',
                    'contractor_id' => 1,
                    'value' => 15000000,
                ],
            ],
            'deals' => [
                [
                    'id' => 1,
                    'title' => 'Поставка материалов',
                    'status_id' => 1,
                    'value' => 3500000,
                ],
                [
                    'id' => 2,
                    'title' => 'Продажа земельного участка',
                    'status_id' => 2,
                    'value' => 48000000,
                ],
            ],
            'deal-statuses' => [
                [
                    'id' => 1,
                    'name' => 'Новая',
                    'color' => '#0ea5e9',
                ],
                [
                    'id' => 2,
                    'name' => 'В работе',
                    'color' => '#22c55e',
                ],
                [
                    'id' => 3,
                    'name' => 'Закрыта',
                    'color' => '#475569',
                ],
            ],
        ];

        if (!is_dir(dirname(DATA_FILE))) {
            mkdir(dirname(DATA_FILE), 0777, true);
        }

        file_put_contents(DATA_FILE, json_encode($defaultData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
}

function handleLogin(): void
{
    $payload = readPayload();
    $email = $payload['email'] ?? null;
    $password = $payload['password'] ?? '';

    $data = loadData();
    $user = null;
    foreach ($data['users'] as $candidate) {
        if (strcasecmp($candidate['email'], (string) $email) === 0) {
            $user = $candidate;
            break;
        }
    }

    if ($user === null || $password !== DEFAULT_PASSWORD) {
        sendError('Invalid credentials', 401);
    }

    sendResponse([
        'token' => base64_encode($user['email'] . '|' . time()),
        'user' => $user,
    ]);
}

function loadData(): array
{
    $content = file_get_contents(DATA_FILE);
    $data = json_decode($content, true);
    if (!is_array($data)) {
        return [];
    }

    return $data;
}

function saveData(array $data): void
{
    file_put_contents(DATA_FILE, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function readPayload(): array
{
    $rawBody = file_get_contents('php://input');
    $payload = json_decode($rawBody, true);

    return is_array($payload) ? $payload : [];
}

function validateRequired(array $payload, array $fields): void
{
    $missing = [];
    foreach ($fields as $field) {
        if (!array_key_exists($field, $payload)) {
            $missing[] = $field;
        }
    }

    if ($missing !== []) {
        sendError('Missing required fields: ' . implode(', ', $missing));
    }
}

function findNextId(array $items): int
{
    $maxId = 0;
    foreach ($items as $item) {
        $maxId = max($maxId, (int) ($item['id'] ?? 0));
    }

    return $maxId + 1;
}

function findById(array $items, ?string $id): ?array
{
    foreach ($items as $item) {
        if ((string) ($item['id'] ?? '') === (string) $id) {
            return $item;
        }
    }

    return null;
}

function findIndexById(array $items, ?string $id): ?int
{
    foreach ($items as $index => $item) {
        if ((string) ($item['id'] ?? '') === (string) $id) {
            return $index;
        }
    }

    return null;
}

function sendResponse($data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function sendError(string $message, int $status = 400): void
{
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}
