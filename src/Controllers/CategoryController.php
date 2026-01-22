<?php

namespace App\Controllers;

use App\Models\Category;
use App\Middleware\AuthMiddleware;
use App\Middleware\StaffMiddleware;
use App\Utils\Response;
use App\Utils\Validator;

class CategoryController
{
    public function index(): void
    {
        $user = AuthMiddleware::handle();
        if (!$user) return;
        
        $withCounts = isset($_GET['with_counts']) && $_GET['with_counts'] === '1';
        
        if ($withCounts) {
            $categories = Category::getWithTaskCounts();
        } else {
            $categories = Category::getAll();
        }
        
        Response::success($categories);
    }
    
    public function show(int $id): void
    {
        $user = AuthMiddleware::handle();
        if (!$user) return;
        
        $category = Category::findById($id);
        
        if (!$category) {
            Response::notFound('カテゴリーが見つかりません');
            return;
        }
        
        Response::success($category);
    }
    
    public function store(): void
    {
        $user = StaffMiddleware::handle();
        if (!$user) return;
        
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $validator = Validator::make($data)
            ->required('name', 'カテゴリー名は必須です')
            ->max('name', 50, 'カテゴリー名は50文字以内で入力してください')
            ->color('color');
        
        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }
        
        $categoryId = Category::create($data);
        $category = Category::findById($categoryId);
        
        Response::created($category);
    }
    
    public function update(int $id): void
    {
        $user = StaffMiddleware::handle();
        if (!$user) return;
        
        $category = Category::findById($id);
        
        if (!$category) {
            Response::notFound('カテゴリーが見つかりません');
            return;
        }
        
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $validator = Validator::make($data)
            ->max('name', 50, 'カテゴリー名は50文字以内で入力してください')
            ->color('color');
        
        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }
        
        Category::update($id, $data);
        $category = Category::findById($id);
        
        Response::success($category);
    }
    
    public function destroy(int $id): void
    {
        $user = StaffMiddleware::handle();
        if (!$user) return;
        
        $category = Category::findById($id);
        
        if (!$category) {
            Response::notFound('カテゴリーが見つかりません');
            return;
        }
        
        Category::delete($id);
        
        Response::success(['message' => 'カテゴリーを削除しました']);
    }
    
    public function reorder(): void
    {
        $user = StaffMiddleware::handle();
        if (!$user) return;
        
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        if (empty($data['categories']) || !is_array($data['categories'])) {
            Response::error('INVALID_DATA', '並び順データが不正です', 400);
            return;
        }
        
        Category::reorderWithObjects($data['categories']);
        
        Response::success(['message' => '並び替えを保存しました']);
    }
}
