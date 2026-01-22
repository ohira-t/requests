// Admin Users Management
class AdminUsers {
    constructor() {
        this.users = [];
        this.departments = [];
        this.currentType = 'staff';
        this.searchQuery = '';
        this.departmentFilter = '';
        this.currentPage = 1;
        this.perPage = 20;
        this.totalPages = 1;
        this.user = null;
        this.importData = [];

        this.init();
    }

    async init() {
        await this.checkAuth();
        this.bindEvents();
        await this.loadDepartments();
        await this.loadUsers();
    }

    async checkAuth() {
        try {
            const result = await api.me();
            this.user = result.data.user;

            if (this.user.role !== 'admin') {
                this.redirectToApp();
                return;
            }

            document.getElementById('admin-user-name').textContent = this.user.name;
        } catch (error) {
            console.error('[AdminUsers] Auth check failed:', error);
            this.redirectToApp();
        }
    }

    bindEvents() {
        // Type segment
        document.querySelectorAll('.admin-segment .segment-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.admin-segment .segment-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentType = btn.dataset.type;
                this.currentPage = 1;
                this.updateUI();
                this.loadUsers();
            });
        });

        // Search
        let searchTimeout;
        document.getElementById('user-search').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchQuery = e.target.value;
                this.currentPage = 1;
                this.loadUsers();
            }, 300);
        });

        // Department filter
        document.getElementById('department-filter').addEventListener('change', (e) => {
            this.departmentFilter = e.target.value;
            this.currentPage = 1;
            this.loadUsers();
        });

        // Pagination
        document.getElementById('prev-page').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadUsers();
            }
        });

        document.getElementById('next-page').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadUsers();
            }
        });

        // Add user
        document.getElementById('add-user-btn').addEventListener('click', () => this.openUserModal());

        // Export
        document.getElementById('export-btn').addEventListener('click', () => this.exportCSV());

        // Import
        document.getElementById('import-btn').addEventListener('click', () => this.openImportModal());

        // User modal
        document.getElementById('user-modal-close').addEventListener('click', () => this.closeUserModal());
        document.getElementById('user-modal-cancel').addEventListener('click', () => this.closeUserModal());
        document.getElementById('user-modal-delete').addEventListener('click', () => this.deleteUser());
        document.getElementById('user-form').addEventListener('submit', (e) => this.handleUserSubmit(e));
        document.getElementById('user-role').addEventListener('change', (e) => this.handleRoleChange(e));

        // Import modal
        document.getElementById('import-modal-close').addEventListener('click', () => this.closeImportModal());
        document.getElementById('import-modal-cancel').addEventListener('click', () => this.closeImportModal());
        document.getElementById('import-execute').addEventListener('click', () => this.executeImport());
        document.getElementById('download-template').addEventListener('click', (e) => {
            e.preventDefault();
            this.downloadTemplate();
        });

        // File drop
        const dropzone = document.getElementById('import-dropzone');
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) this.handleFileSelect(file);
        });
        document.getElementById('import-file').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleFileSelect(file);
        });
    }

    updateUI() {
        const isStaff = this.currentType === 'staff';
        document.getElementById('add-user-text').textContent = isStaff ? 'スタッフを追加' : 'クライアントを追加';
        document.getElementById('department-filter').style.display = isStaff ? 'block' : 'none';

        // Update table headers
        const deptHeader = document.querySelector('.col-department');
        if (deptHeader) {
            deptHeader.textContent = isStaff ? '部署' : '会社名';
        }
    }

    async loadDepartments() {
        try {
            const result = await api.getDepartments();
            this.departments = result.data;
            this.populateDepartmentFilter();
            this.populateDepartmentSelect();
        } catch (error) {
            console.error('[AdminUsers] Failed to load departments:', error);
            this.departments = [];
        }
    }

    populateDepartmentFilter() {
        const select = document.getElementById('department-filter');
        select.innerHTML = '<option value="">すべての部署</option>' +
            this.departments.map(d => `<option value="${d.id}">${this.escapeHtml(d.name)}</option>`).join('');
    }

    populateDepartmentSelect() {
        const select = document.getElementById('user-department');
        select.innerHTML = '<option value="">未設定</option>' +
            this.departments.map(d => `<option value="${d.id}">${this.escapeHtml(d.name)}</option>`).join('');
    }

    async loadUsers() {
        try {
            const params = new URLSearchParams();
            params.append('type', this.currentType === 'staff' ? 'internal' : 'client');
            if (this.searchQuery) params.append('search', this.searchQuery);
            if (this.departmentFilter && this.currentType === 'staff') {
                params.append('department_id', this.departmentFilter);
            }

            const result = await api.getUsers(params.toString());
            this.users = result.data;
            this.renderUsers();
            this.updateStats();
        } catch (error) {
            console.error('[AdminUsers] Failed to load users:', error);
            this.showToast('ユーザーの取得に失敗しました', 'error');
        }
    }

    renderUsers() {
        const tbody = document.getElementById('users-tbody');
        const empty = document.getElementById('users-empty');
        const table = document.getElementById('users-table');

        // Pagination
        const start = (this.currentPage - 1) * this.perPage;
        const end = start + this.perPage;
        const pageUsers = this.users.slice(start, end);
        this.totalPages = Math.ceil(this.users.length / this.perPage) || 1;

        if (pageUsers.length === 0) {
            table.style.display = 'none';
            empty.style.display = 'flex';
            tbody.innerHTML = '';
        } else {
            table.style.display = 'table';
            empty.style.display = 'none';

            tbody.innerHTML = pageUsers.map(user => {
                const isClient = user.type === 'client';
                const initials = user.name.charAt(0).toUpperCase();
                const roleLabel = user.role === 'admin' ? '管理者' : (user.role === 'staff' ? 'スタッフ' : 'クライアント');
                const createdDate = new Date(user.created_at).toLocaleDateString('ja-JP');

                let deptOrCompany = '-';
                if (isClient) {
                    deptOrCompany = user.company ? this.escapeHtml(user.company) : '-';
                } else if (user.department_name) {
                    deptOrCompany = `<span class="dept-badge-table" style="background: ${user.department_color}15; color: ${user.department_color}">
                        <span class="dot" style="background: ${user.department_color}"></span>
                        ${this.escapeHtml(user.department_name)}
                    </span>`;
                }

                return `
                    <tr data-id="${user.id}">
                        <td>
                            <div class="user-name-cell">
                                <span class="user-avatar-table ${isClient ? 'client' : 'staff'}">${initials}</span>
                                <div>
                                    <div class="user-name-text">${this.escapeHtml(user.name)}</div>
                                </div>
                            </div>
                        </td>
                        <td>${this.escapeHtml(user.email)}</td>
                        <td>${deptOrCompany}</td>
                        <td><span class="role-badge-table ${user.role}">${roleLabel}</span></td>
                        <td>${createdDate}</td>
                        <td>
                            <div class="action-btns">
                                <button class="action-btn edit-btn" title="編集">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                    </svg>
                                </button>
                                <button class="action-btn danger delete-btn" title="削除">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"/>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                    </svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            // Bind edit/delete buttons
            tbody.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = parseInt(e.target.closest('tr').dataset.id);
                    const user = this.users.find(u => u.id === id);
                    if (user) this.openUserModal(user);
                });
            });

            tbody.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = parseInt(e.target.closest('tr').dataset.id);
                    this.deleteUserById(id);
                });
            });
        }

        // Update pagination
        document.getElementById('pagination-info').textContent = `${this.currentPage} / ${this.totalPages}`;
        document.getElementById('prev-page').disabled = this.currentPage <= 1;
        document.getElementById('next-page').disabled = this.currentPage >= this.totalPages;
    }

    updateStats() {
        const total = this.users.length;
        const admins = this.users.filter(u => u.role === 'admin').length;
        const staff = this.users.filter(u => u.role === 'staff').length;

        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-admin').textContent = admins;
        document.getElementById('stat-staff').textContent = staff;

        // Update stats labels based on type
        const statsContainer = document.getElementById('admin-stats');
        if (this.currentType === 'client') {
            statsContainer.innerHTML = `
                <div class="stat-item">
                    <span class="stat-value" id="stat-total">${total}</span>
                    <span class="stat-label">クライアント数</span>
                </div>
            `;
        } else {
            statsContainer.innerHTML = `
                <div class="stat-item">
                    <span class="stat-value">${total}</span>
                    <span class="stat-label">合計</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${admins}</span>
                    <span class="stat-label">管理者</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${staff}</span>
                    <span class="stat-label">スタッフ</span>
                </div>
            `;
        }
    }

    // User Modal
    openUserModal(user = null) {
        const modal = document.getElementById('user-modal');
        const title = document.getElementById('user-modal-title');
        const deleteBtn = document.getElementById('user-modal-delete');
        const passwordRequired = document.getElementById('password-required');
        const passwordHint = document.getElementById('password-hint');

        if (user) {
            title.textContent = 'ユーザーを編集';
            deleteBtn.style.display = 'block';
            passwordRequired.style.display = 'none';
            passwordHint.textContent = '空欄の場合は変更されません';
            document.getElementById('user-password').required = false;

            document.getElementById('user-id').value = user.id;
            document.getElementById('user-name').value = user.name;
            document.getElementById('user-email').value = user.email;
            document.getElementById('user-role').value = user.role;
            document.getElementById('user-department').value = user.department_id || '';
            document.getElementById('user-company').value = user.company || '';
            document.getElementById('user-password').value = '';
        } else {
            title.textContent = this.currentType === 'staff' ? 'スタッフを追加' : 'クライアントを追加';
            deleteBtn.style.display = 'none';
            passwordRequired.style.display = 'inline';
            passwordHint.textContent = '6文字以上で入力してください';
            document.getElementById('user-password').required = true;

            document.getElementById('user-id').value = '';
            document.getElementById('user-name').value = '';
            document.getElementById('user-email').value = '';
            document.getElementById('user-role').value = this.currentType === 'staff' ? 'staff' : 'client';
            document.getElementById('user-department').value = '';
            document.getElementById('user-company').value = '';
            document.getElementById('user-password').value = '';
        }

        this.handleRoleChange({ target: document.getElementById('user-role') });
        modal.style.display = 'flex';
    }

    closeUserModal() {
        document.getElementById('user-modal').style.display = 'none';
    }

    handleRoleChange(e) {
        const role = e.target.value;
        const deptGroup = document.getElementById('user-department-group');
        const companyGroup = document.getElementById('user-company-group');

        if (role === 'client') {
            deptGroup.style.display = 'none';
            companyGroup.style.display = 'block';
        } else {
            deptGroup.style.display = 'block';
            companyGroup.style.display = 'none';
        }
    }

    async handleUserSubmit(e) {
        e.preventDefault();

        const id = document.getElementById('user-id').value;
        const data = {
            name: document.getElementById('user-name').value.trim(),
            email: document.getElementById('user-email').value.trim(),
            role: document.getElementById('user-role').value,
            type: document.getElementById('user-role').value === 'client' ? 'client' : 'internal',
        };

        const password = document.getElementById('user-password').value.trim();
        if (password) {
            if (password.length < 6) {
                this.showToast('パスワードは6文字以上で入力してください', 'error');
                return;
            }
            data.password = password;
        }

        if (data.role === 'client') {
            data.company = document.getElementById('user-company').value.trim() || null;
            data.department_id = null;
        } else {
            data.department_id = document.getElementById('user-department').value || null;
        }

        try {
            if (id) {
                await api.updateUser(parseInt(id), data);
                this.showToast('ユーザーを更新しました', 'success');
            } else {
                await api.createUser(data);
                this.showToast('ユーザーを追加しました', 'success');
            }

            this.closeUserModal();
            await this.loadUsers();
        } catch (error) {
            console.error('[AdminUsers] Failed to save user:', error);
            this.showToast(error.message || 'エラーが発生しました', 'error');
        }
    }

    async deleteUser() {
        const id = document.getElementById('user-id').value;
        if (!id) return;

        if (!confirm('このユーザーを削除しますか？')) return;

        await this.deleteUserById(parseInt(id));
        this.closeUserModal();
    }

    async deleteUserById(id) {
        if (!confirm('このユーザーを削除しますか？')) return;

        try {
            await api.deleteUser(id);
            this.showToast('ユーザーを削除しました', 'success');
            await this.loadUsers();
        } catch (error) {
            console.error('[AdminUsers] Failed to delete user:', error);
            this.showToast(error.message || 'エラーが発生しました', 'error');
        }
    }

    // CSV Export
    async exportCSV() {
        const type = this.currentType;
        const users = this.users;

        if (users.length === 0) {
            this.showToast('エクスポートするユーザーがいません', 'error');
            return;
        }

        let csv = 'name,email,role,department,company\n';

        users.forEach(user => {
            const row = [
                this.escapeCSV(user.name),
                this.escapeCSV(user.email),
                user.role,
                this.escapeCSV(user.department_name || ''),
                this.escapeCSV(user.company || ''),
            ];
            csv += row.join(',') + '\n';
        });

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('CSVをダウンロードしました', 'success');
    }

    // CSV Import
    openImportModal() {
        document.getElementById('import-modal').style.display = 'flex';
        document.getElementById('import-preview').style.display = 'none';
        document.getElementById('import-execute').disabled = true;
        document.getElementById('import-file').value = '';
        this.importData = [];
    }

    closeImportModal() {
        document.getElementById('import-modal').style.display = 'none';
    }

    downloadTemplate() {
        const csv = 'name,email,password,role,department,company\n' +
            '山田太郎,yamada@example.com,password123,staff,営業,\n' +
            '鈴木商事 担当者,suzuki@client.com,password123,client,,株式会社鈴木商事\n';

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'users_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    handleFileSelect(file) {
        if (!file.name.endsWith('.csv')) {
            this.showToast('CSVファイルを選択してください', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.parseCSV(e.target.result);
            } catch (error) {
                console.error('[AdminUsers] Failed to parse CSV:', error);
                this.showToast('CSVの解析に失敗しました', 'error');
            }
        };
        reader.readAsText(file);
    }

    parseCSV(content) {
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            this.showToast('データが空です', 'error');
            return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const requiredHeaders = ['name', 'email', 'password'];
        const missing = requiredHeaders.filter(h => !headers.includes(h));

        if (missing.length > 0) {
            this.showToast(`必須カラムがありません: ${missing.join(', ')}`, 'error');
            return;
        }

        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length < headers.length) continue;

            const row = {};
            headers.forEach((h, idx) => {
                row[h] = values[idx] || '';
            });

            if (!row.name || !row.email || !row.password) continue;

            data.push({
                name: row.name,
                email: row.email,
                password: row.password,
                role: ['admin', 'staff', 'client'].includes(row.role) ? row.role : 'staff',
                department: row.department || '',
                company: row.company || '',
            });
        }

        if (data.length === 0) {
            this.showToast('有効なデータがありません', 'error');
            return;
        }

        this.importData = data;
        this.showImportPreview();
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    showImportPreview() {
        const preview = document.getElementById('import-preview');
        const tbody = document.getElementById('import-preview-tbody');
        const count = document.getElementById('preview-count');

        count.textContent = this.importData.length;

        tbody.innerHTML = this.importData.slice(0, 10).map(row => `
            <tr>
                <td>${this.escapeHtml(row.name)}</td>
                <td>${this.escapeHtml(row.email)}</td>
                <td>${row.role}</td>
                <td>${this.escapeHtml(row.department || row.company || '-')}</td>
            </tr>
        `).join('');

        if (this.importData.length > 10) {
            tbody.innerHTML += `<tr><td colspan="4" style="text-align: center; color: #8e8e93;">...他 ${this.importData.length - 10} 件</td></tr>`;
        }

        preview.style.display = 'block';
        document.getElementById('import-execute').disabled = false;
    }

    async executeImport() {
        if (this.importData.length === 0) return;

        const btn = document.getElementById('import-execute');
        const btnText = btn.querySelector('.btn-text');
        const btnLoading = btn.querySelector('.btn-loading');

        btn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline-flex';

        let success = 0;
        let failed = 0;

        for (const row of this.importData) {
            try {
                // Find department ID by name
                let departmentId = null;
                if (row.department) {
                    const dept = this.departments.find(d => d.name === row.department);
                    if (dept) departmentId = dept.id;
                }

                await api.createUser({
                    name: row.name,
                    email: row.email,
                    password: row.password,
                    role: row.role,
                    type: row.role === 'client' ? 'client' : 'internal',
                    department_id: departmentId,
                    company: row.company || null,
                });
                success++;
            } catch (error) {
                failed++;
                console.error(`[AdminUsers] Failed to import ${row.email}:`, error);
            }
        }

        btn.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';

        if (failed > 0) {
            this.showToast(`${success}件成功、${failed}件失敗`, 'warning');
        } else {
            this.showToast(`${success}件のユーザーをインポートしました`, 'success');
        }

        this.closeImportModal();
        await this.loadUsers();
    }

    // Utilities
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    escapeCSV(str) {
        if (!str) return '';
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }

    redirectToApp() {
        // Navigate to main app (relative to current path)
        const basePath = window.location.pathname.replace(/\/admin\/[^\/]*$/, '');
        window.location.href = basePath + '/app.html';
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize
const adminUsers = new AdminUsers();
