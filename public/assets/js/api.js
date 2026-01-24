/**
 * GLUG Reminders - API Client
 */

class API {
    constructor() {
        // Detect base path from current location
        // Handles various deployment scenarios:
        // - /requests/public/app.html (subdirectory with public)
        // - /requests/app.html (public folder as document root)
        // - /app.html (root deployment)
        let basePath = '';
        const path = window.location.pathname;
        
        // Check if we're in a subdirectory deployment
        if (path.includes('/public/')) {
            // /requests/public/... pattern
            basePath = path.substring(0, path.indexOf('/public/') + '/public'.length);
        } else {
            // Check for /subdirectory/file.html or /subdirectory/admin/file.html pattern
            // Extract everything before the last path segment or known file/folder
            const segments = path.split('/').filter(s => s);
            if (segments.length > 0) {
                // If path ends with .html or is admin/..., find the base
                if (path.includes('/admin/') || path.endsWith('.html')) {
                    // Find base: /requests from /requests/app.html or /requests/admin/users.html
                    const htmlIndex = path.indexOf('.html');
                    const adminIndex = path.indexOf('/admin/');
                    let endIndex = path.length;
                    
                    if (adminIndex > 0) {
                        endIndex = adminIndex;
                    } else if (htmlIndex > 0) {
                        // Find the last / before .html
                        endIndex = path.lastIndexOf('/', htmlIndex);
                    }
                    
                    if (endIndex > 0) {
                        basePath = path.substring(0, endIndex);
                    }
                } else if (segments.length === 1 && !path.endsWith('/')) {
                    // /requests -> basePath = /requests
                    basePath = '/' + segments[0];
                } else if (segments.length >= 1) {
                    // /requests/ -> basePath = /requests
                    basePath = '/' + segments[0];
                }
            }
        }
        
        this.baseUrl = basePath + '/api';
        this.csrfToken = null;
    }

    async request(method, endpoint, data = null) {
        const url = this.baseUrl + endpoint;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            credentials: 'same-origin',
        };

        if (this.csrfToken) {
            options.headers['X-CSRF-Token'] = this.csrfToken;
        }

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const json = await response.json();

            if (!response.ok) {
                throw new APIError(json.error?.message || 'リクエストに失敗しました', json.error?.code, response.status);
            }

            return json;
        } catch (error) {
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError('ネットワークエラーが発生しました', 'NETWORK_ERROR');
        }
    }

    get(endpoint) {
        return this.request('GET', endpoint);
    }

    post(endpoint, data) {
        return this.request('POST', endpoint, data);
    }

    put(endpoint, data) {
        return this.request('PUT', endpoint, data);
    }

    delete(endpoint) {
        return this.request('DELETE', endpoint);
    }

    setCsrfToken(token) {
        this.csrfToken = token;
    }

    // Auth
    async login(email, password) {
        const result = await this.post('/auth/login', { email, password });
        if (result.data?.csrf_token) {
            this.setCsrfToken(result.data.csrf_token);
        }
        return result;
    }

    async register(data) {
        const result = await this.post('/auth/register', data);
        if (result.data?.csrf_token) {
            this.setCsrfToken(result.data.csrf_token);
        }
        return result;
    }

    async logout() {
        return this.post('/auth/logout');
    }

    async me() {
        const result = await this.get('/auth/me');
        if (result.data?.csrf_token) {
            this.setCsrfToken(result.data.csrf_token);
        }
        return result;
    }

    async checkSession() {
        return this.get('/auth/check');
    }

    async changePassword(data) {
        return this.post('/auth/change-password', data);
    }

    // Tasks
    async getTasks(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get('/tasks' + (query ? '?' + query : ''));
    }

    async getTask(id) {
        return this.get(`/tasks/${id}`);
    }

    async createTask(data) {
        return this.post('/tasks', data);
    }

    async updateTask(id, data) {
        return this.put(`/tasks/${id}`, data);
    }

    async deleteTask(id) {
        return this.delete(`/tasks/${id}`);
    }

    async completeTask(id) {
        return this.put(`/tasks/${id}/complete`);
    }

    async reorderTasks(tasks) {
        return this.put('/tasks/reorder', { tasks });
    }

    async getStats() {
        return this.get('/tasks/stats');
    }

    async getRequestedWithWorkload() {
        return this.get('/tasks/requested-workload');
    }

    async getCalendarTasks(startDate, endDate) {
        return this.get(`/tasks/calendar?start=${startDate}&end=${endDate}`);
    }

    // Comments
    async getComments(taskId) {
        return this.get(`/tasks/${taskId}/comments`);
    }

    async createComment(taskId, content) {
        return this.post(`/tasks/${taskId}/comments`, { content });
    }

    // Categories
    async getCategories(withCounts = false) {
        return this.get('/categories' + (withCounts ? '?with_counts=1' : ''));
    }

    async createCategory(data) {
        return this.post('/categories', data);
    }

    async updateCategory(id, data) {
        return this.put(`/categories/${id}`, data);
    }

    async deleteCategory(id) {
        return this.delete(`/categories/${id}`);
    }

    async reorderCategories(categories) {
        return this.put('/categories/reorder', { categories });
    }

    // Users
    async getUsers(params = {}) {
        const query = typeof params === 'string' ? params : new URLSearchParams(params).toString();
        return this.get('/users' + (query ? '?' + query : ''));
    }

    async getInternalUsers() {
        return this.get('/users/internal');
    }

    async getClientUsers() {
        return this.get('/users/clients');
    }

    async createUser(data) {
        return this.post('/users', data);
    }

    async updateUser(id, data) {
        return this.put(`/users/${id}`, data);
    }

    async deleteUser(id) {
        return this.delete(`/users/${id}`);
    }

    // Notifications
    async getNotifications(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get('/notifications' + (query ? '?' + query : ''));
    }

    async markNotificationAsRead(id) {
        return this.put(`/notifications/${id}/read`);
    }

    async markAllNotificationsAsRead() {
        return this.put('/notifications/mark-all-read');
    }

    async deleteNotification(id) {
        return this.delete(`/notifications/${id}`);
    }

    async deleteAllNotifications() {
        return this.delete('/notifications/delete-all');
    }

    async createAnnouncement(data) {
        return this.post('/notifications/announcement', data);
    }

    // Departments
    async getDepartments() {
        return this.get('/departments');
    }

    async getDepartment(id) {
        return this.get(`/departments/${id}`);
    }

    async createDepartment(data) {
        return this.post('/departments', data);
    }

    async updateDepartment(id, data) {
        return this.put(`/departments/${id}`, data);
    }

    async deleteDepartment(id) {
        return this.delete(`/departments/${id}`);
    }

    async reorderDepartments(departments) {
        return this.put('/departments/reorder', { departments });
    }
    
    async reorderUsers(users) {
        return this.put('/users/reorder', { users });
    }
    
    // Account deactivation
    async deactivateAccount(data) {
        return this.post('/auth/deactivate', data);
    }
    
    async getDeactivatedUsers() {
        return this.get('/users/deactivated');
    }
    
    async restoreUser(id) {
        return this.put(`/users/${id}/restore`);
    }
    
    async permanentlyDeleteUser(id) {
        return this.delete(`/users/${id}/permanently`);
    }
}

class APIError extends Error {
    constructor(message, code, status = 400) {
        super(message);
        this.name = 'APIError';
        this.code = code;
        this.status = status;
    }
}

// Global API instance
const api = new API();
