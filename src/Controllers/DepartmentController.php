<?php

namespace App\Controllers;

use App\Models\Department;
use App\Middleware\AuthMiddleware;
use App\Middleware\StaffMiddleware;
use App\Utils\Response;
use App\Utils\Validator;

class DepartmentController
{
    public function index(): void
    {
        $user = AuthMiddleware::handle();
        if (!$user) return;
        
        $departments = Department::getAll();
        
        Response::success($departments);
    }
    
    public function show(int $id): void
    {
        $user = AuthMiddleware::handle();
        if (!$user) return;
        
        $department = Department::findById($id);
        
        if (!$department) {
            Response::notFound('部署が見つかりません');
            return;
        }
        
        // Include users in this department
        $department['users'] = Department::getUsersByDepartment($id);
        
        Response::success($department);
    }
    
    public function store(): void
    {
        $user = StaffMiddleware::handle();
        if (!$user) return;
        
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $validator = Validator::make($data)
            ->required('name', '部署名は必須です')
            ->max('name', 100, '部署名は100文字以内で入力してください');
        
        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }
        
        $departmentId = Department::create($data);
        $department = Department::findById($departmentId);
        
        Response::created($department);
    }
    
    public function update(int $id): void
    {
        $user = StaffMiddleware::handle();
        if (!$user) return;
        
        $department = Department::findById($id);
        
        if (!$department) {
            Response::notFound('部署が見つかりません');
            return;
        }
        
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $validator = Validator::make($data)
            ->max('name', 100, '部署名は100文字以内で入力してください');
        
        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }
        
        Department::update($id, $data);
        $department = Department::findById($id);
        
        Response::success($department);
    }
    
    public function destroy(int $id): void
    {
        $user = StaffMiddleware::handle();
        if (!$user) return;
        
        $department = Department::findById($id);
        
        if (!$department) {
            Response::notFound('部署が見つかりません');
            return;
        }
        
        Department::delete($id);
        
        Response::success(['message' => '部署を削除しました']);
    }
    
    public function reorder(): void
    {
        $user = StaffMiddleware::handle();
        if (!$user) return;
        
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        if (empty($data['departments']) || !is_array($data['departments'])) {
            Response::error('INVALID_DATA', '部署データが不正です', 400);
            return;
        }
        
        Department::reorder($data['departments']);
        
        Response::success(['message' => '並び替えを保存しました']);
    }
}
