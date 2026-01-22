<?php

namespace App\Utils;

class Validator
{
    private array $errors = [];
    private array $data = [];
    
    public function __construct(array $data)
    {
        $this->data = $data;
    }
    
    public static function make(array $data): self
    {
        return new self($data);
    }
    
    public function required(string $field, string $message = null): self
    {
        $value = $this->getValue($field);
        if ($value === null || $value === '' || (is_array($value) && empty($value))) {
            $this->addError($field, $message ?? "{$field}は必須です");
        }
        return $this;
    }
    
    public function email(string $field, string $message = null): self
    {
        $value = $this->getValue($field);
        if ($value !== null && $value !== '' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $this->addError($field, $message ?? "有効なメールアドレスを入力してください");
        }
        return $this;
    }
    
    public function min(string $field, int $length, string $message = null): self
    {
        $value = $this->getValue($field);
        if ($value !== null && strlen($value) < $length) {
            $this->addError($field, $message ?? "{$field}は{$length}文字以上で入力してください");
        }
        return $this;
    }
    
    public function max(string $field, int $length, string $message = null): self
    {
        $value = $this->getValue($field);
        if ($value !== null && strlen($value) > $length) {
            $this->addError($field, $message ?? "{$field}は{$length}文字以下で入力してください");
        }
        return $this;
    }
    
    public function in(string $field, array $values, string $message = null): self
    {
        $value = $this->getValue($field);
        if ($value !== null && $value !== '' && !in_array($value, $values, true)) {
            $this->addError($field, $message ?? "{$field}の値が不正です");
        }
        return $this;
    }
    
    public function date(string $field, string $format = 'Y-m-d', string $message = null): self
    {
        $value = $this->getValue($field);
        if ($value !== null && $value !== '') {
            $d = \DateTime::createFromFormat($format, $value);
            if (!$d || $d->format($format) !== $value) {
                $this->addError($field, $message ?? "有効な日付を入力してください");
            }
        }
        return $this;
    }
    
    public function numeric(string $field, string $message = null): self
    {
        $value = $this->getValue($field);
        if ($value !== null && $value !== '' && !is_numeric($value)) {
            $this->addError($field, $message ?? "{$field}は数値で入力してください");
        }
        return $this;
    }
    
    public function integer(string $field, string $message = null): self
    {
        $value = $this->getValue($field);
        if ($value !== null && $value !== '' && !filter_var($value, FILTER_VALIDATE_INT)) {
            $this->addError($field, $message ?? "{$field}は整数で入力してください");
        }
        return $this;
    }
    
    public function confirmed(string $field, string $confirmField = null, string $message = null): self
    {
        $confirmField = $confirmField ?? $field . '_confirmation';
        $value = $this->getValue($field);
        $confirmValue = $this->getValue($confirmField);
        
        if ($value !== $confirmValue) {
            $this->addError($field, $message ?? "{$field}が一致しません");
        }
        return $this;
    }
    
    public function regex(string $field, string $pattern, string $message = null): self
    {
        $value = $this->getValue($field);
        if ($value !== null && $value !== '' && !preg_match($pattern, $value)) {
            $this->addError($field, $message ?? "{$field}の形式が不正です");
        }
        return $this;
    }
    
    public function color(string $field, string $message = null): self
    {
        return $this->regex($field, '/^#[0-9A-Fa-f]{6}$/', $message ?? "有効なカラーコードを入力してください");
    }
    
    public function unique(string $field, string $table, string $column = null, ?int $exceptId = null, string $message = null): self
    {
        $value = $this->getValue($field);
        $column = $column ?? $field;
        
        if ($value !== null && $value !== '') {
            $sql = "SELECT COUNT(*) as count FROM {$table} WHERE {$column} = ? AND deleted_at IS NULL";
            $params = [$value];
            
            if ($exceptId !== null) {
                $sql .= " AND id != ?";
                $params[] = $exceptId;
            }
            
            $result = Database::fetch($sql, $params);
            if ($result && $result['count'] > 0) {
                $this->addError($field, $message ?? "この{$field}は既に使用されています");
            }
        }
        return $this;
    }
    
    public function exists(string $field, string $table, string $column = null, string $message = null): self
    {
        $value = $this->getValue($field);
        $column = $column ?? $field;
        
        if ($value !== null && $value !== '') {
            $sql = "SELECT COUNT(*) as count FROM {$table} WHERE {$column} = ? AND deleted_at IS NULL";
            $result = Database::fetch($sql, [$value]);
            if (!$result || $result['count'] == 0) {
                $this->addError($field, $message ?? "{$field}が存在しません");
            }
        }
        return $this;
    }
    
    public function array(string $field, string $message = null): self
    {
        $value = $this->getValue($field);
        if ($value !== null && !is_array($value)) {
            $this->addError($field, $message ?? "{$field}は配列である必要があります");
        }
        return $this;
    }
    
    public function custom(string $field, callable $callback, string $message): self
    {
        $value = $this->getValue($field);
        if (!$callback($value, $this->data)) {
            $this->addError($field, $message);
        }
        return $this;
    }
    
    private function getValue(string $field)
    {
        $keys = explode('.', $field);
        $value = $this->data;
        
        foreach ($keys as $key) {
            if (!isset($value[$key])) {
                return null;
            }
            $value = $value[$key];
        }
        
        return $value;
    }
    
    private function addError(string $field, string $message): void
    {
        if (!isset($this->errors[$field])) {
            $this->errors[$field] = [];
        }
        $this->errors[$field][] = $message;
    }
    
    public function fails(): bool
    {
        return !empty($this->errors);
    }
    
    public function passes(): bool
    {
        return empty($this->errors);
    }
    
    public function errors(): array
    {
        return $this->errors;
    }
    
    public function firstError(): ?string
    {
        foreach ($this->errors as $fieldErrors) {
            return $fieldErrors[0] ?? null;
        }
        return null;
    }
    
    public function validated(): array
    {
        return $this->data;
    }
}
