<?php

namespace App\Routes;

use App\Controllers\AuthController;
use App\Controllers\TaskController;
use App\Controllers\CategoryController;
use App\Controllers\UserController;
use App\Controllers\CommentController;
use App\Controllers\NotificationController;
use App\Controllers\DepartmentController;

class Router
{
    private array $routes = [];
    private string $basePath = '';
    
    public function __construct(string $basePath = '')
    {
        $this->basePath = rtrim($basePath, '/');
    }
    
    public function get(string $path, callable $handler): void
    {
        $this->addRoute('GET', $path, $handler);
    }
    
    public function post(string $path, callable $handler): void
    {
        $this->addRoute('POST', $path, $handler);
    }
    
    public function put(string $path, callable $handler): void
    {
        $this->addRoute('PUT', $path, $handler);
    }
    
    public function delete(string $path, callable $handler): void
    {
        $this->addRoute('DELETE', $path, $handler);
    }
    
    private function addRoute(string $method, string $path, callable $handler): void
    {
        $path = $this->basePath . '/' . ltrim($path, '/');
        $this->routes[] = [
            'method' => $method,
            'path' => $path,
            'handler' => $handler,
        ];
    }
    
    public function dispatch(string $method, string $uri): bool
    {
        // Remove query string
        $uri = parse_url($uri, PHP_URL_PATH);
        $uri = rtrim($uri, '/') ?: '/';
        
        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }
            
            $params = $this->matchRoute($route['path'], $uri);
            
            if ($params !== false) {
                call_user_func_array($route['handler'], $params);
                return true;
            }
        }
        
        return false;
    }
    
    private function matchRoute(string $routePath, string $uri): array|false
    {
        // Convert route path to regex
        $pattern = preg_replace('/\{([a-zA-Z_]+)\}/', '(?P<$1>[^/]+)', $routePath);
        $pattern = '#^' . $pattern . '$#';
        
        if (preg_match($pattern, $uri, $matches)) {
            // Extract named parameters
            $params = [];
            foreach ($matches as $key => $value) {
                if (is_string($key)) {
                    $params[$key] = $value;
                }
            }
            return array_values($params);
        }
        
        return false;
    }
}

function registerRoutes(): Router
{
    $router = new Router('/api');
    
    // Auth routes
    $auth = new AuthController();
    $router->post('/auth/login', [$auth, 'login']);
    $router->post('/auth/logout', [$auth, 'logout']);
    $router->get('/auth/me', [$auth, 'me']);
    $router->get('/auth/check', [$auth, 'checkSession']);
    $router->post('/auth/change-password', [$auth, 'changePassword']);
    
    // Task routes
    $task = new TaskController();
    $router->get('/tasks', [$task, 'index']);
    $router->post('/tasks', [$task, 'store']);
    $router->get('/tasks/stats', [$task, 'stats']);  // Must be before {id} routes
    $router->put('/tasks/reorder', [$task, 'reorder']);  // Must be before {id} routes
    $router->get('/tasks/{id}', [$task, 'show']);
    $router->put('/tasks/{id}', [$task, 'update']);
    $router->delete('/tasks/{id}', [$task, 'destroy']);
    $router->put('/tasks/{id}/complete', [$task, 'complete']);
    
    // Comment routes
    $comment = new CommentController();
    $router->get('/tasks/{taskId}/comments', [$comment, 'index']);
    $router->post('/tasks/{taskId}/comments', [$comment, 'store']);
    
    // Category routes
    $category = new CategoryController();
    $router->get('/categories', [$category, 'index']);
    $router->post('/categories', [$category, 'store']);
    $router->put('/categories/reorder', [$category, 'reorder']);  // Must be before {id} route
    $router->get('/categories/{id}', [$category, 'show']);
    $router->put('/categories/{id}', [$category, 'update']);
    $router->delete('/categories/{id}', [$category, 'destroy']);
    
    // User routes
    $user = new UserController();
    $router->get('/users', [$user, 'index']);
    $router->get('/users/internal', [$user, 'internalUsers']);
    $router->get('/users/clients', [$user, 'clientUsers']);
    $router->get('/users/{id}', [$user, 'show']);
    $router->post('/users', [$user, 'store']);
    $router->put('/users/{id}', [$user, 'update']);
    $router->delete('/users/{id}', [$user, 'destroy']);
    
    // Notification routes
    $notification = new NotificationController();
    $router->get('/notifications', [$notification, 'index']);
    $router->put('/notifications/mark-all-read', [$notification, 'markAllAsRead']);  // Must be before {id} routes
    $router->delete('/notifications/delete-all', [$notification, 'deleteAll']);  // Must be before {id} routes
    $router->put('/notifications/{id}/read', [$notification, 'markAsRead']);
    $router->delete('/notifications/{id}', [$notification, 'destroy']);
    
    // Department routes
    $department = new DepartmentController();
    $router->get('/departments', [$department, 'index']);
    $router->post('/departments', [$department, 'store']);
    $router->put('/departments/reorder', [$department, 'reorder']);  // Must be before {id} routes
    $router->get('/departments/{id}', [$department, 'show']);
    $router->put('/departments/{id}', [$department, 'update']);
    $router->delete('/departments/{id}', [$department, 'destroy']);
    
    return $router;
}
