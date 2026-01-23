/**
 * GLUG Reminders - Main Application
 */

class App {
    constructor() {
        this.user = null;
        this.currentView = 'my';
        this.tasks = [];
        this.categories = [];
        this.users = [];
        this.selectedTask = null;
        this.searchQuery = '';
        this.notifications = [];
        this.unreadCount = 0;
        this.departments = [];

        this.init();
    }

    async init() {
        // Check authentication
        try {
            const result = await api.me();
            if (result.success) {
                this.user = result.data.user;
                this.showMainApp();
            } else {
                this.showLogin();
            }
        } catch (error) {
            this.showLogin();
        }

        this.bindEvents();
    }

    bindEvents() {
        // Login form
        document.getElementById('login-form')?.addEventListener('submit', (e) => this.handleLogin(e));

        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', () => this.handleLogout());

        // Change password
        document.getElementById('change-password-btn')?.addEventListener('click', () => this.openChangePasswordModal());

        // Notifications
        document.getElementById('notifications-btn')?.addEventListener('click', () => this.toggleNotificationsPanel());
        document.getElementById('notifications-close')?.addEventListener('click', () => this.closeNotificationsPanel());
        document.getElementById('mark-all-read-btn')?.addEventListener('click', () => this.markAllNotificationsAsRead());

        // User menu
        document.getElementById('user-avatar-btn')?.addEventListener('click', () => this.toggleUserMenu());
        document.getElementById('admin-users-link')?.addEventListener('click', () => {
            // Navigate to admin users page (relative to current path)
            const basePath = window.location.pathname.replace(/\/[^\/]*$/, '');
            window.location.href = basePath + '/admin/users.html';
        });
        document.addEventListener('click', (e) => this.handleOutsideClick(e));

        // View tabs
        document.querySelectorAll('.view-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchView(tab.dataset.view));
        });

        // New task button
        document.getElementById('new-task-btn')?.addEventListener('click', () => this.openTaskModal());

        // Task modal
        document.getElementById('modal-close')?.addEventListener('click', () => this.closeTaskModal());
        document.getElementById('modal-cancel')?.addEventListener('click', () => this.closeTaskModal());
        document.getElementById('task-form')?.addEventListener('submit', (e) => this.handleTaskSubmit(e));

        // Task detail modal
        document.getElementById('detail-close')?.addEventListener('click', () => this.closeDetailModal());
        document.getElementById('detail-edit')?.addEventListener('click', () => this.editSelectedTask());
        document.getElementById('detail-delete')?.addEventListener('click', () => this.deleteSelectedTask());
        document.getElementById('detail-complete')?.addEventListener('click', () => this.toggleSelectedTaskComplete());
        document.getElementById('comment-form')?.addEventListener('submit', (e) => this.handleCommentSubmit(e));

        // Settings
        document.getElementById('settings-btn')?.addEventListener('click', () => this.openSettingsModal());
        document.getElementById('settings-close')?.addEventListener('click', () => this.closeSettingsModal());
        document.getElementById('add-category-btn')?.addEventListener('click', () => this.addCategory());
        document.getElementById('add-department-btn')?.addEventListener('click', () => this.addDepartment());
        document.getElementById('add-user-btn')?.addEventListener('click', () => this.addUser());
        this.initSettingsTabs();
        this.initCategoryEditModal();
        this.initUserEditModal();
        this.initChangePasswordModal();

        // Search
        document.getElementById('search-input')?.addEventListener('input', debounce((e) => this.handleSearch(e.target.value), 300));

        // Modal overlays
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.style.display = 'none';
                }
            });
        });

        // Assignee picker sheet
        this.initAssigneeSheet();
    }

    initAssigneeSheet() {
        const trigger = document.getElementById('assignee-trigger');
        const sheet = document.getElementById('assignee-sheet');
        const cancelBtn = document.getElementById('assignee-sheet-cancel');
        const doneBtn = document.getElementById('assignee-sheet-done');
        const searchInput = document.getElementById('assignee-search');
        const segmentBtns = sheet?.querySelectorAll('.sheet-segment .segment-btn');
        const addBtn = document.getElementById('assignee-add-btn');

        if (!trigger || !sheet) return;

        // Open sheet
        trigger.addEventListener('click', () => this.openAssigneeSheet());

        // Cancel
        cancelBtn?.addEventListener('click', () => this.closeAssigneeSheet());

        // Done
        doneBtn?.addEventListener('click', () => this.closeAssigneeSheet());

        // Close on overlay click
        sheet.addEventListener('click', (e) => {
            if (e.target === sheet) this.closeAssigneeSheet();
        });

        // Segment switching
        segmentBtns?.forEach(btn => {
            btn.addEventListener('click', () => {
                segmentBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.assigneeFilterType = btn.dataset.type;
                this.renderAssigneeList();
                this.updateAssigneeAddButtonText();
            });
        });

        // Search
        searchInput?.addEventListener('input', debounce(() => {
            this.renderAssigneeList();
        }, 150));

        // Add new user from sheet
        addBtn?.addEventListener('click', () => this.addUserFromSheet());

        this.assigneeFilterType = 'staff';
    }

    updateAssigneeAddButtonText() {
        const addText = document.getElementById('assignee-add-text');
        if (addText) {
            addText.textContent = this.assigneeFilterType === 'client'
                ? 'クライアントを追加'
                : 'スタッフを追加';
        }
    }

    async addUserFromSheet() {
        const isClient = this.assigneeFilterType === 'client';
        const name = prompt(isClient ? 'クライアント名（会社名）を入力:' : 'スタッフ名を入力:');
        if (!name) return;

        const email = prompt('メールアドレスを入力:');
        if (!email) return;

        const password = prompt('初期パスワードを入力:');
        if (!password) return;

        try {
            const newUser = await api.createUser({
                name,
                email,
                password,
                role: isClient ? 'client' : 'staff',
                company: isClient ? name : null
            });
            await this.loadUsers();
            this.renderAssigneeList();

            // Auto-select the newly created user
            if (newUser?.id) {
                this.selectAssignee(newUser.id);
            }

            this.showToast(isClient ? 'クライアントを追加しました' : 'スタッフを追加しました', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    openAssigneeSheet() {
        const sheet = document.getElementById('assignee-sheet');
        const searchInput = document.getElementById('assignee-search');

        if (sheet) {
            sheet.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            this.renderAssigneeList();
            setTimeout(() => searchInput?.focus(), 100);
        }
    }

    closeAssigneeSheet() {
        const sheet = document.getElementById('assignee-sheet');
        const searchInput = document.getElementById('assignee-search');

        if (sheet) {
            sheet.style.display = 'none';
            document.body.style.overflow = '';
        }
        if (searchInput) searchInput.value = '';
    }

    // Get pinned users from localStorage
    getPinnedUsers() {
        try {
            return JSON.parse(localStorage.getItem('pinnedUsers') || '[]');
        } catch {
            return [];
        }
    }

    // Toggle pin status for a user
    togglePinUser(userId) {
        const pinned = this.getPinnedUsers();
        const id = parseInt(userId);
        const index = pinned.indexOf(id);
        if (index === -1) {
            pinned.push(id);
        } else {
            pinned.splice(index, 1);
        }
        localStorage.setItem('pinnedUsers', JSON.stringify(pinned));
        this.renderAssigneeList();
    }

    renderAssigneeList() {
        const list = document.getElementById('assignee-list');
        const searchInput = document.getElementById('assignee-search');

        if (!list) return;

        const searchQuery = (searchInput?.value || '').toLowerCase();
        const filterType = this.assigneeFilterType || 'staff';
        const currentValue = document.getElementById('task-assignee')?.value || '';
        const pinnedUsers = this.getPinnedUsers();

        // Filter users
        let filteredUsers = this.users.filter(user => {
            if (filterType === 'staff' && user.role === 'client') return false;
            if (filterType === 'client' && user.role !== 'client') return false;

            if (searchQuery) {
                const searchFields = [
                    user.name,
                    user.email,
                    user.company || ''
                ].join(' ').toLowerCase();
                return searchFields.includes(searchQuery);
            }
            return true;
        });

        // Sort: pinned first, then alphabetically
        filteredUsers.sort((a, b) => {
            const aPinned = pinnedUsers.includes(a.id);
            const bPinned = pinnedUsers.includes(b.id);
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;
            return (a.name || '').localeCompare(b.name || '', 'ja');
        });

        // Separate pinned and unpinned
        const pinnedInList = filteredUsers.filter(u => pinnedUsers.includes(u.id));
        const unpinnedInList = filteredUsers.filter(u => !pinnedUsers.includes(u.id));

        // Build HTML
        let html = `
            <button type="button" class="sheet-list-item ${!currentValue ? 'selected' : ''}" data-value="">
                <span class="sheet-list-item-avatar unassigned">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                </span>
                <div class="sheet-list-item-info">
                    <div class="sheet-list-item-name">未割り当て</div>
                </div>
                <svg class="sheet-list-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            </button>
        `;

        if (filteredUsers.length === 0) {
            html += `<div class="sheet-empty">該当するユーザーがいません</div>`;
        } else {
            // Show pinned section
            if (pinnedInList.length > 0 && !searchQuery) {
                html += `<div class="sheet-list-section">ピン留め</div>`;
                html += pinnedInList.map(user => this.renderAssigneeItem(user, currentValue, true)).join('');
            }

            // Show other section
            if (unpinnedInList.length > 0) {
                if (pinnedInList.length > 0 && !searchQuery) {
                    html += `<div class="sheet-list-section">その他</div>`;
                }
                html += unpinnedInList.map(user => this.renderAssigneeItem(user, currentValue, false)).join('');
            }
        }

        list.innerHTML = html;

        // Bind click events
        list.querySelectorAll('.sheet-list-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.pin-btn')) return;
                this.selectAssignee(item.dataset.value);
            });
        });

        // Bind pin button events
        list.querySelectorAll('.pin-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePinUser(btn.dataset.userId);
            });
        });
    }

    renderAssigneeItem(user, currentValue, isPinned) {
        const initials = user.name.charAt(0).toUpperCase();
        const isClient = user.role === 'client';
        const isSelected = currentValue === String(user.id);
        const displayName = isClient && user.company ? user.company : user.name;

        return `
            <button type="button" class="sheet-list-item ${isSelected ? 'selected' : ''}" data-value="${user.id}">
                <span class="sheet-list-item-avatar ${isClient ? 'client' : 'staff'}">${escapeHtml(initials)}</span>
                <div class="sheet-list-item-info">
                    <div class="sheet-list-item-name">${escapeHtml(displayName)}</div>
                    <div class="sheet-list-item-email">${escapeHtml(user.email)}</div>
                </div>
                <button type="button" class="pin-btn ${isPinned ? 'pinned' : ''}" data-user-id="${user.id}" title="${isPinned ? 'ピン留め解除' : 'ピン留め'}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="${isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                    </svg>
                </button>
                <svg class="sheet-list-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            </button>
        `;
    }

    selectAssignee(value) {
        const hiddenInput = document.getElementById('task-assignee');
        const valueDisplay = document.getElementById('assignee-value');

        if (!hiddenInput || !valueDisplay) return;

        hiddenInput.value = value || '';

        // Update display
        if (value) {
            const user = this.users.find(u => String(u.id) === String(value));
            if (user) {
                const isClient = user.role === 'client';
                const initials = user.name.charAt(0).toUpperCase();
                const displayName = isClient && user.company ? user.company : user.name;

                valueDisplay.innerHTML = `
                    <span class="selected-avatar ${isClient ? 'client' : 'staff'}">${escapeHtml(initials)}</span>
                    <span class="selected-name">${escapeHtml(displayName)}</span>
                `;
            }
        } else {
            valueDisplay.innerHTML = `<span class="assignee-placeholder">担当者を選択</span>`;
        }

        // Re-render list to show selection
        this.renderAssigneeList();
    }

    // Authentication
    showLogin() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }

    showMainApp() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        document.body.setAttribute('data-view', this.currentView);

        this.updateUserUI();
        this.loadInitialData();
    }

    async handleLogin(e) {
        e.preventDefault();

        const form = e.target;
        const email = form.email.value;
        const password = form.password.value;
        const submitBtn = form.querySelector('button[type="submit"]');
        const errorDiv = document.getElementById('login-error');

        // Show loading
        submitBtn.querySelector('.btn-text').style.display = 'none';
        submitBtn.querySelector('.btn-loading').style.display = 'flex';
        submitBtn.disabled = true;
        errorDiv.style.display = 'none';

        try {
            const result = await api.login(email, password);
            this.user = result.data.user;
            this.showMainApp();
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        } finally {
            submitBtn.querySelector('.btn-text').style.display = 'inline';
            submitBtn.querySelector('.btn-loading').style.display = 'none';
            submitBtn.disabled = false;
        }
    }

    async handleLogout() {
        try {
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
        this.user = null;
        this.showLogin();
    }

    updateUserUI() {
        if (!this.user) return;

        const initials = this.user.name.charAt(0).toUpperCase();
        const userInitials = document.getElementById('user-initials');
        const userName = document.getElementById('user-name');
        const userEmail = document.getElementById('user-email');
        const logoText = document.querySelector('.logo-text');

        if (userInitials) userInitials.textContent = initials;
        if (userName) userName.textContent = this.user.name;
        if (userEmail) userEmail.textContent = this.user.email;

        // Show admin/staff features
        if (this.user.role === 'admin' || this.user.role === 'staff') {
            const departmentTab = document.getElementById('department-tab');
            if (departmentTab) departmentTab.style.display = 'flex';
        }

        // Show admin features
        if (this.user.role === 'admin') {
            const usersTab = document.getElementById('users-tab');
            if (usersTab) usersTab.style.display = 'flex';
            
            const statsTab = document.getElementById('stats-tab');
            if (statsTab) statsTab.style.display = 'flex';
            
            const adminUsersLink = document.getElementById('admin-users-link');
            if (adminUsersLink) adminUsersLink.style.display = 'flex';
            
            const adminDivider = document.getElementById('admin-divider');
            if (adminDivider) adminDivider.style.display = 'block';
        }

        // Client-specific UI
        if (this.user.role === 'client') {
            const viewTabs = document.getElementById('view-tabs');
            const newTaskBtn = document.getElementById('new-task-btn');
            const settingsBtn = document.getElementById('settings-btn');

            if (viewTabs) viewTabs.style.display = 'none';
            if (newTaskBtn) newTaskBtn.style.display = 'none';
            if (settingsBtn) settingsBtn.style.display = 'none';

            // Show company name in header for clients
            if (logoText && this.user.company) {
                logoText.textContent = this.user.company;
            }

            // Update user name to show company name
            if (userName && this.user.company) {
                userName.textContent = this.user.company;
            }
        }
    }

    toggleUserMenu() {
        const dropdown = document.getElementById('user-dropdown');
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }

    handleOutsideClick(e) {
        const userMenu = document.getElementById('user-menu');
        const dropdown = document.getElementById('user-dropdown');
        if (!userMenu.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    }

    // Data loading
    async loadInitialData() {
        await Promise.all([
            this.loadCategories(),
            this.loadUsers(),
            this.loadDepartments(),
            this.loadNotifications(),
        ]);
        await this.loadTasks();
        
        // Poll for new notifications every 30 seconds
        this.startNotificationPolling();
    }

    async loadCategories() {
        try {
            const result = await api.getCategories(true);
            this.categories = result.data;
            this.updateCategoryDropdowns();
        } catch (error) {
            this.showToast('カテゴリーの取得に失敗しました', 'error');
        }
    }

    async loadUsers() {
        try {
            const result = await api.getUsers();
            this.users = result.data;
            this.updateAssigneeDropdowns();
        } catch (error) {
            this.showToast('ユーザーの取得に失敗しました', 'error');
        }
    }

    async loadDepartments() {
        try {
            const result = await api.getDepartments();
            this.departments = result.data;
        } catch (error) {
            console.error('Failed to load departments:', error);
        }
    }

    async loadTasks() {
        const container = document.getElementById('board-container');
        container.innerHTML = '<div class="loading-spinner"></div>';

        try {
            if (this.currentView === 'stats') {
                await this.loadStats();
                return;
            }

            if (this.currentView === 'calendar') {
                await this.loadCalendar();
                return;
            }

            const params = { view: this.currentView };

            // クライアントはフラットなリスト（グループ化なし）
            if (this.user?.role === 'client') {
                // グループ化パラメータを送らない
            } else if (this.currentView === 'my') {
                params.grouped = 'category';
            } else if (this.currentView === 'requested') {
                params.grouped = 'assignee';
            } else if (this.currentView === 'clients') {
                params.grouped = 'client';
            }

            const result = await api.getTasks(params);
            this.tasks = result.data;
            this.renderBoard();
        } catch (error) {
            console.error('[App] Failed to load tasks:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <h3>読み込みに失敗しました</h3>
                    <p>ページを再読み込みしてお試しください</p>
                    <button class="btn btn-secondary" onclick="location.reload()" style="margin-top: var(--spacing-lg);">
                        再読み込み
                    </button>
                </div>
            `;
        }
    }

    // View switching
    switchView(view) {
        this.currentView = view;
        document.body.setAttribute('data-view', view);

        // Update active tab
        document.querySelectorAll('.view-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === view);
        });

        this.loadTasks();
    }

    // Board rendering
    renderBoard() {
        const container = document.getElementById('board-container');
        container.innerHTML = '';

        // クライアントはシンプルなリスト形式
        if (this.user?.role === 'client') {
            this.renderClientTaskList(container);
        } else if (this.currentView === 'stats') {
            this.renderStatsView(container);
        } else if (this.currentView === 'my') {
            this.renderCategoryColumns(container);
        } else if (this.currentView === 'requested') {
            this.renderAssigneeColumns(container);
        } else if (this.currentView === 'clients') {
            this.renderClientColumns(container);
        } else if (this.currentView === 'calendar') {
            // Calendar is handled by loadCalendar
        }
    }

    // クライアント専用のシンプルなリストビュー
    renderClientTaskList(container) {
        const tasks = Array.isArray(this.tasks) ? this.tasks : [];
        const activeTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
        const completedTasks = tasks.filter(t => t.status === 'done');

        let html = `
            <div class="client-task-list">
                <div class="client-list-header">
                    <h2>依頼されたタスク</h2>
                    <span class="client-list-count">${activeTasks.length}件の未完了タスク</span>
                </div>
        `;

        if (activeTasks.length === 0 && completedTasks.length === 0) {
            html += `
                <div class="client-list-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M9 11l3 3L22 4"/>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                    <p>現在、依頼されているタスクはありません</p>
                </div>
            `;
        } else {
            // 未完了タスク
            if (activeTasks.length > 0) {
                html += '<div class="client-task-items">';
                activeTasks.forEach(task => {
                    html += this.renderClientTaskItem(task);
                });
                html += '</div>';
            }

            // 完了タスク
            if (completedTasks.length > 0) {
                html += `
                    <div class="client-completed-section">
                        <button class="client-completed-toggle">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"/>
                            </svg>
                            <span>完了したタスク (${completedTasks.length})</span>
                        </button>
                        <div class="client-completed-tasks">
                `;
                completedTasks.forEach(task => {
                    html += this.renderClientTaskItem(task, true);
                });
                html += '</div></div>';
            }
        }

        html += '</div>';
        container.innerHTML = html;

        // イベントバインド
        container.querySelectorAll('.client-task-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.task-checkbox')) {
                    this.openTaskDetail(parseInt(item.dataset.id));
                }
            });

            item.querySelector('.task-checkbox')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleTaskComplete(parseInt(item.dataset.id));
            });
        });

        container.querySelector('.client-completed-toggle')?.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            btn.classList.toggle('open');
            btn.nextElementSibling.classList.toggle('show');
        });
    }

    renderClientTaskItem(task, isCompleted = false) {
        const dueInfo = this.formatDueDate(task.due_date);
        const priorityLabels = { urgent: '緊急', high: '高', medium: '中', low: '低' };
        const priorityColors = { urgent: '#FF3B30', high: '#FF9500', medium: '#007AFF', low: '#8E8E93' };

        return `
            <div class="client-task-item ${isCompleted ? 'completed' : ''}" data-id="${task.id}">
                <div class="task-checkbox ${isCompleted ? 'checked' : ''}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                </div>
                <div class="client-task-content">
                    <div class="client-task-title">${escapeHtml(task.title)}</div>
                    <div class="client-task-meta">
                        ${dueInfo ? `<span class="task-due ${dueInfo.class}">${dueInfo.text}</span>` : '<span class="task-due no-due">期限なし</span>'}
                        <span class="client-task-priority" style="color: ${priorityColors[task.priority]}">${priorityLabels[task.priority]}</span>
                        ${task.creator_name ? `<span class="client-task-from">依頼者: ${escapeHtml(task.creator_name)}</span>` : ''}
                    </div>
                    ${task.description ? `<div class="client-task-desc">${escapeHtml(task.description.substring(0, 100))}${task.description.length > 100 ? '...' : ''}</div>` : ''}
                </div>
                <svg class="client-task-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"/>
                </svg>
            </div>
        `;
    }

    renderCategoryColumns(container) {
        // Check if tasks is empty or not an object
        if (!this.tasks || typeof this.tasks !== 'object' || Object.keys(this.tasks).length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    <h3>ようこそ Requests へ！</h3>
                    <p>右上の「＋ 新規タスク」からタスクを作成してみましょう</p>
                    <p style="margin-top: var(--spacing-md); color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                        💡 ヒント: まず⚙️設定からカテゴリーを作成すると、タスクを整理しやすくなります
                    </p>
                </div>
            `;
            return;
        }

        // Sort categories by display_order
        const sortedGroups = Object.values(this.tasks).sort((a, b) => {
            const orderA = a.category?.display_order ?? 999;
            const orderB = b.category?.display_order ?? 999;
            return orderA - orderB;
        });

        sortedGroups.forEach(group => {
            // Filter and sort tasks
            const filteredTasks = this.filterTasksForSearch(group.tasks || []);
            const filteredCompletedTasks = this.filterTasksForSearch(group.completed_tasks || []);
            const sortedTasks = this.sortTasksByDueDate(filteredTasks);

            // Skip empty columns when searching
            if (this.searchQuery && filteredTasks.length === 0 && filteredCompletedTasks.length === 0) {
                return;
            }

            const column = this.createColumn({
                id: group.category.id,
                name: group.category.name,
                color: group.category.color,
                tasks: sortedTasks,
                completedTasks: filteredCompletedTasks,
                draggable: !this.searchQuery, // Disable drag during search
            });
            container.appendChild(column);
        });

        // Add "Add Category" column at the end (only when not searching)
        if (!this.searchQuery) {
            const addCategoryColumn = this.createAddCategoryColumn();
            container.appendChild(addCategoryColumn);
        }
    }

    createAddCategoryColumn() {
        const column = document.createElement('div');
        column.className = 'board-column add-category-column';
        column.innerHTML = `
            <div class="add-category-trigger">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                <span>カテゴリーを追加</span>
            </div>
        `;

        // カラム全体をクリック可能に
        column.addEventListener('click', () => this.addCategoryFromBoard());

        return column;
    }

    addCategoryFromBoard() {
        this.openEditCategoryModal(null);
    }

    renderAssigneeColumns(container) {
        // Check if tasks is empty
        if (!this.tasks || typeof this.tasks !== 'object' || Object.keys(this.tasks).length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    <h3>依頼中のタスクはありません</h3>
                    <p>タスクを作成して、社内スタッフに依頼してみましょう</p>
                </div>
            `;
            return;
        }

        Object.values(this.tasks).forEach(group => {
            if (!group.assignee) return;

            // Filter tasks for search
            const filteredTasks = this.filterTasksForSearch(group.tasks || []);
            const filteredCompletedTasks = this.filterTasksForSearch(group.completed_tasks || []);

            // Skip empty columns when searching
            if (this.searchQuery && filteredTasks.length === 0 && filteredCompletedTasks.length === 0) {
                return;
            }

            const column = this.createColumn({
                id: group.assignee.id,
                name: group.assignee.name,
                color: null,
                subtitle: this.searchQuery ? `${filteredTasks.length}件` : `全${group.total_tasks}件`,
                tasks: filteredTasks,
                completedTasks: filteredCompletedTasks,
                type: 'assignee',
            });
            container.appendChild(column);
        });
    }

    renderClientColumns(container) {
        // Check if tasks is empty
        if (!this.tasks || typeof this.tasks !== 'object' || Object.keys(this.tasks).length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <h3>クライアントへの依頼はありません</h3>
                    <p>タスクを作成して、クライアントに依頼してみましょう</p>
                </div>
            `;
            return;
        }

        Object.values(this.tasks).forEach(group => {
            if (!group.client) return;

            // Filter tasks for search
            const filteredTasks = this.filterTasksForSearch(group.tasks || []);
            const filteredCompletedTasks = this.filterTasksForSearch(group.completed_tasks || []);

            // Skip empty columns when searching
            if (this.searchQuery && filteredTasks.length === 0 && filteredCompletedTasks.length === 0) {
                return;
            }

            const column = this.createColumn({
                id: group.client.id,
                name: group.client.company || group.client.name,
                color: null,
                tasks: filteredTasks,
                completedTasks: filteredCompletedTasks,
                type: 'client',
            });
            container.appendChild(column);
        });
    }

    renderDepartmentColumns(container) {
        // Sort by display_order
        const sortedGroups = Object.values(this.tasks).sort((a, b) => {
            const orderA = a.department?.display_order ?? 999;
            const orderB = b.department?.display_order ?? 999;
            return orderA - orderB;
        });

        sortedGroups.forEach(group => {
            if (!group.department) return;

            // Filter tasks for search
            const filteredTasks = this.filterTasksForSearch(group.tasks || []);
            const filteredCompletedTasks = this.filterTasksForSearch(group.completed_tasks || []);

            // Skip empty columns when searching
            if (this.searchQuery && filteredTasks.length === 0 && filteredCompletedTasks.length === 0) {
                return;
            }

            const column = this.createColumn({
                id: group.department.id,
                name: group.department.name,
                color: group.department.color,
                tasks: filteredTasks,
                completedTasks: filteredCompletedTasks,
                type: 'department',
            });
            container.appendChild(column);
        });
    }

    createColumn(config) {
        const column = document.createElement('div');
        column.className = 'board-column';
        column.dataset.id = config.id;
        column.dataset.type = config.type || 'category';

        // Make category columns draggable
        if (config.draggable && this.currentView === 'my') {
            column.draggable = true;
            column.classList.add('draggable-column');
        }

        const activeCount = config.tasks?.length || 0;
        const completedCount = config.completedTasks?.length || 0;

        column.innerHTML = `
            <div class="column-header">
                <div class="column-title">
                    ${config.draggable ? `<span class="drag-handle column-drag-handle">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/>
                            <circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>
                            <circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/>
                        </svg>
                    </span>` : ''}
                    ${config.color ? `<span class="column-color" style="background: ${config.color}"></span>` : ''}
                    <span class="column-name">${escapeHtml(config.name)}</span>
                </div>
                <span class="column-count">${config.subtitle || activeCount + '件'}</span>
            </div>
            <div class="column-content">
                <div class="task-list" data-column="${config.id}">
                    ${(config.tasks || []).map(task => this.createTaskCard(task)).join('')}
                </div>
                ${this.user?.role !== 'client' ? `
                <button class="add-task-btn" data-category="${config.id}" data-type="${config.type || 'category'}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    <span>タスクを追加</span>
                </button>
                ` : ''}
                ${completedCount > 0 ? `
                <div class="completed-section">
                    <button class="completed-toggle">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"/>
                        </svg>
                        <span>完了 (${completedCount})</span>
                    </button>
                    <div class="completed-tasks">
                        ${(config.completedTasks || []).map(task => this.createTaskCard(task, true)).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        // Bind events
        column.querySelectorAll('.task-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.task-checkbox') && !e.target.closest('.task-drag-handle')) {
                    this.openTaskDetail(parseInt(card.dataset.id));
                }
            });

            card.querySelector('.task-checkbox')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleTaskComplete(parseInt(card.dataset.id));
            });

            // Task drag events
            if (card.draggable) {
                card.addEventListener('dragstart', (e) => this.handleTaskDragStart(e, card));
                card.addEventListener('dragend', (e) => this.handleTaskDragEnd(e, card));
            }
        });

        // Task list drop zone
        const taskList = column.querySelector('.task-list');
        if (taskList) {
            taskList.addEventListener('dragover', (e) => this.handleTaskDragOver(e, taskList));
            taskList.addEventListener('dragleave', (e) => this.handleTaskDragLeave(e, taskList));
            taskList.addEventListener('drop', (e) => this.handleTaskDrop(e, taskList));
        }

        column.querySelector('.add-task-btn')?.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            this.openTaskModal(null, {
                type: btn.dataset.type,
                id: btn.dataset.category,
            });
        });

        column.querySelector('.completed-toggle')?.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            btn.classList.toggle('open');
            btn.nextElementSibling.classList.toggle('show');
        });

        // Column drag events
        if (config.draggable) {
            column.addEventListener('dragstart', (e) => this.handleColumnDragStart(e, column));
            column.addEventListener('dragend', (e) => this.handleColumnDragEnd(e, column));
            column.addEventListener('dragover', (e) => this.handleColumnDragOver(e, column));
            column.addEventListener('dragleave', (e) => this.handleColumnDragLeave(e, column));
            column.addEventListener('drop', (e) => this.handleColumnDrop(e, column));
        }

        return column;
    }

    // Column Drag & Drop
    handleColumnDragStart(e, column) {
        this.draggedColumn = column;
        column.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', column.dataset.id);
    }

    handleColumnDragEnd(e, column) {
        column.classList.remove('dragging');
        document.querySelectorAll('.board-column').forEach(col => {
            col.classList.remove('drag-over-left', 'drag-over-right');
        });
        this.draggedColumn = null;
    }

    handleColumnDragOver(e, column) {
        e.preventDefault();
        if (!this.draggedColumn || this.draggedColumn === column) return;

        const rect = column.getBoundingClientRect();
        const midpoint = rect.left + rect.width / 2;

        column.classList.remove('drag-over-left', 'drag-over-right');
        if (e.clientX < midpoint) {
            column.classList.add('drag-over-left');
        } else {
            column.classList.add('drag-over-right');
        }
    }

    handleColumnDragLeave(e, column) {
        column.classList.remove('drag-over-left', 'drag-over-right');
    }

    async handleColumnDrop(e, column) {
        e.preventDefault();
        if (!this.draggedColumn || this.draggedColumn === column) return;

        const container = document.getElementById('board-container');
        const columns = Array.from(container.querySelectorAll('.board-column:not(.add-category-column)'));

        const draggedIndex = columns.indexOf(this.draggedColumn);
        const targetIndex = columns.indexOf(column);
        const isLeft = column.classList.contains('drag-over-left');

        column.classList.remove('drag-over-left', 'drag-over-right');

        // Move in DOM
        if (isLeft) {
            container.insertBefore(this.draggedColumn, column);
        } else {
            container.insertBefore(this.draggedColumn, column.nextSibling);
        }

        // Get new order
        const newColumns = Array.from(container.querySelectorAll('.board-column:not(.add-category-column)'));
        const order = newColumns.map((col, i) => ({ id: parseInt(col.dataset.id), sort_order: i }));

        // Save to server
        try {
            await api.reorderCategories(order);
            await this.loadCategories();
        } catch (error) {
            this.showToast('並び替えに失敗しました', 'error');
            this.loadTasks(); // Revert
        }
    }

    // Task Drag & Drop
    handleTaskDragStart(e, card) {
        this.draggedTask = card;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.dataset.id);

        // Prevent column drag when dragging task
        e.stopPropagation();
    }

    handleTaskDragEnd(e, card) {
        card.classList.remove('dragging');
        document.querySelectorAll('.task-list').forEach(list => {
            list.classList.remove('drag-over');
        });
        document.querySelectorAll('.task-card').forEach(c => {
            c.classList.remove('drag-over-above', 'drag-over-below');
        });
        this.draggedTask = null;
    }

    handleTaskDragOver(e, taskList) {
        e.preventDefault();
        if (!this.draggedTask) return;

        taskList.classList.add('drag-over');

        // Find insertion point
        const cards = Array.from(taskList.querySelectorAll('.task-card:not(.dragging)'));
        const afterCard = cards.find(card => {
            const rect = card.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            return e.clientY < midY;
        });

        // Remove previous indicators
        cards.forEach(c => c.classList.remove('drag-over-above', 'drag-over-below'));

        if (afterCard) {
            afterCard.classList.add('drag-over-above');
        } else if (cards.length > 0) {
            cards[cards.length - 1].classList.add('drag-over-below');
        }
    }

    handleTaskDragLeave(e, taskList) {
        // Only remove if actually leaving the list
        if (!taskList.contains(e.relatedTarget)) {
            taskList.classList.remove('drag-over');
            taskList.querySelectorAll('.task-card').forEach(c => {
                c.classList.remove('drag-over-above', 'drag-over-below');
            });
        }
    }

    async handleTaskDrop(e, taskList) {
        e.preventDefault();
        e.stopPropagation();

        if (!this.draggedTask) return;

        taskList.classList.remove('drag-over');

        const cards = Array.from(taskList.querySelectorAll('.task-card:not(.dragging)'));
        const afterCard = cards.find(card => card.classList.contains('drag-over-above'));

        // Clear indicators
        cards.forEach(c => c.classList.remove('drag-over-above', 'drag-over-below'));

        // Move card in DOM
        if (afterCard) {
            taskList.insertBefore(this.draggedTask, afterCard);
        } else {
            taskList.appendChild(this.draggedTask);
        }

        // Get new order for this column
        const newCards = Array.from(taskList.querySelectorAll('.task-card'));
        const taskOrder = newCards.map((card, i) => ({
            id: parseInt(card.dataset.id),
            sort_order: i
        }));

        // Check if category changed
        const newCategoryId = taskList.dataset.column;
        const taskId = parseInt(this.draggedTask.dataset.id);
        const oldCategoryId = this.draggedTask.dataset.category;

        // Save to server
        try {
            if (newCategoryId !== oldCategoryId) {
                // Update task category
                await api.updateTask(taskId, { category_id: parseInt(newCategoryId) });
                this.draggedTask.dataset.category = newCategoryId;
            }
            // Update sort order
            await api.reorderTasks(taskOrder);
            this.showToast('並び順を更新しました', 'success');
        } catch (error) {
            this.showToast('並び替えに失敗しました', 'error');
            this.loadTasks(); // Revert
        }
    }

    createTaskCard(task, isCompact = false) {
        const isOwn = task.creator_id === this.user?.id;
        const dueInfo = this.formatDueDate(task.due_date);
        const tags = task.tags || [];
        const displayTags = tags.slice(0, 3);
        const moreTags = tags.length > 3 ? tags.length - 3 : 0;
        const isDraggable = !isCompact && this.user?.role !== 'client';

        return `
            <div class="task-card ${isCompact ? 'compact' : ''} ${task.status === 'done' ? 'completed' : ''} ${isOwn && this.currentView === 'clients' ? 'own-task' : ''}" 
                 data-id="${task.id}" 
                 data-category="${task.category_id}"
                 ${isDraggable ? 'draggable="true"' : ''}>
                <div class="task-card-header">
                    ${isDraggable ? `<span class="task-drag-handle">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/>
                            <circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>
                            <circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/>
                        </svg>
                    </span>` : ''}
                    <div class="task-checkbox ${task.status === 'done' ? 'checked' : ''}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>
                    <span class="task-title">${escapeHtml(task.title)}</span>
                    <span class="priority-badge ${task.priority}"></span>
                </div>
                ${!isCompact ? `
                <div class="task-meta">
                    ${dueInfo ? `<span class="task-due ${dueInfo.class}">${dueInfo.text}</span>` : ''}
                    ${task.creator_name ? `<span class="task-from">from ${escapeHtml(task.creator_name)}</span>` : ''}
                </div>
                <div class="task-tags">
                    ${task.category_name ? `<span class="tag category" style="--tag-color: ${task.category_color}">${escapeHtml(task.category_name)}</span>` : ''}
                    ${displayTags.map(tag => `<span class="tag">#${escapeHtml(tag)}</span>`).join('')}
                    ${moreTags > 0 ? `<span class="tag-more">+${moreTags}</span>` : ''}
                </div>
                ` : ''}
            </div>
        `;
    }

    // Sort tasks by due date (closest first), then by sort_order
    sortTasksByDueDate(tasks) {
        return [...tasks].sort((a, b) => {
            // First, sort by manual sort_order if exists
            if (a.sort_order !== null && b.sort_order !== null) {
                return a.sort_order - b.sort_order;
            }

            // Then by due date (null/no due date goes to bottom)
            if (!a.due_date && !b.due_date) return 0;
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;

            return new Date(a.due_date) - new Date(b.due_date);
        });
    }

    formatDueDate(dueDate) {
        if (!dueDate) return null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return { text: `${Math.abs(diffDays)}日超過`, class: 'overdue' };
        } else if (diffDays === 0) {
            return { text: '今日まで', class: 'today' };
        } else if (diffDays === 1) {
            return { text: '明日まで', class: 'soon' };
        } else if (diffDays <= 3) {
            return { text: `残り${diffDays}日`, class: 'soon' };
        } else {
            const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
            const dateStr = `${due.getFullYear()}/${String(due.getMonth() + 1).padStart(2, '0')}/${String(due.getDate()).padStart(2, '0')}`;
            return { text: `${dateStr}（${weekdays[due.getDay()]}）まで`, class: '' };
        }
    }

    // Task operations
    async toggleTaskComplete(taskId) {
        try {
            await api.completeTask(taskId);
            this.loadTasks();
            this.showToast('タスクを更新しました', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    openTaskModal(task = null, preset = null) {
        const modal = document.getElementById('task-modal');
        const form = document.getElementById('task-form');
        const title = document.getElementById('modal-title');

        form.reset();
        document.getElementById('task-id').value = task?.id || '';
        title.textContent = task ? 'タスクを編集' : '新規タスク';

        // Reset assignee select
        this.selectAssignee('');

        if (task) {
            document.getElementById('task-title').value = task.title || '';
            document.getElementById('task-description').value = task.description || '';
            document.getElementById('task-category').value = task.category_id || '';
            document.getElementById('task-priority').value = task.priority || 'medium';
            document.getElementById('task-due-date').value = task.due_date || '';
            document.getElementById('task-tags').value = (task.tags || []).join(', ');

            // Set assignee with custom select
            if (task.assignee_id) {
                this.selectAssignee(task.assignee_id);
            }
        } else if (preset) {
            if (preset.type === 'category') {
                document.getElementById('task-category').value = preset.id;
                // In "my tasks" view with category preset, also set self as assignee
                if (this.currentView === 'my' && this.user) {
                    this.selectAssignee(this.user.id);
                }
            } else if (preset.type === 'assignee' || preset.type === 'client') {
                this.selectAssignee(preset.id);
            }
        } else {
            // New task without preset - in "my tasks" view, default to self as assignee
            if (this.currentView === 'my' && this.user) {
                this.selectAssignee(this.user.id);
            }
        }

        modal.style.display = 'flex';
    }

    closeTaskModal() {
        document.getElementById('task-modal').style.display = 'none';
        // Also close the assignee sheet if it's open
        const assigneeSheet = document.getElementById('assignee-sheet');
        if (assigneeSheet) {
            assigneeSheet.style.display = 'none';
        }
        document.body.style.overflow = '';
    }

    async handleTaskSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const taskId = document.getElementById('task-id').value;
        const submitBtn = document.getElementById('modal-submit');

        const data = {
            title: document.getElementById('task-title').value,
            description: document.getElementById('task-description').value,
            category_id: document.getElementById('task-category').value || null,
            assignee_id: document.getElementById('task-assignee').value || null,
            priority: document.getElementById('task-priority').value,
            due_date: document.getElementById('task-due-date').value || null,
            tags: document.getElementById('task-tags').value
                .split(',')
                .map(t => t.trim())
                .filter(t => t),
        };

        submitBtn.querySelector('.btn-text').style.display = 'none';
        submitBtn.querySelector('.btn-loading').style.display = 'flex';
        submitBtn.disabled = true;

        try {
            if (taskId) {
                await api.updateTask(taskId, data);
                this.showToast('タスクを更新しました', 'success');
            } else {
                await api.createTask(data);
                this.showToast('タスクを作成しました', 'success');
            }
            this.closeTaskModal();
            this.loadTasks();
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            submitBtn.querySelector('.btn-text').style.display = 'inline';
            submitBtn.querySelector('.btn-loading').style.display = 'none';
            submitBtn.disabled = false;
        }
    }

    // Task detail
    async openTaskDetail(taskId) {
        try {
            const result = await api.getTask(taskId);
            this.selectedTask = result.data;
            this.renderTaskDetail();
            document.getElementById('task-detail-modal').style.display = 'flex';
            this.loadComments(taskId);
        } catch (error) {
            this.showToast('タスクの取得に失敗しました', 'error');
        }
    }

    renderTaskDetail() {
        const task = this.selectedTask;
        if (!task) return;

        document.getElementById('detail-ticket-id').textContent = task.ticket_id;
        document.getElementById('detail-title').textContent = task.title;

        // Status
        const statusEl = document.getElementById('detail-status');
        const statusLabels = { backlog: 'バックログ', todo: 'ToDo', in_progress: '進行中', done: '完了', cancelled: 'キャンセル' };
        const statusColors = { backlog: '#8E8E93', todo: '#007AFF', in_progress: '#FF9500', done: '#34C759', cancelled: '#FF3B30' };
        statusEl.textContent = statusLabels[task.status] || task.status;
        statusEl.style.setProperty('--status-color', statusColors[task.status]);

        // Priority
        const priorityEl = document.getElementById('detail-priority');
        const priorityLabels = { urgent: '緊急', high: '高', medium: '中', low: '低' };
        const priorityColors = { urgent: '#FF3B30', high: '#FF9500', medium: '#007AFF', low: '#8E8E93' };
        priorityEl.textContent = priorityLabels[task.priority] || task.priority;
        priorityEl.style.setProperty('--priority-color', priorityColors[task.priority]);
        priorityEl.style.setProperty('--priority-color-light', priorityColors[task.priority] + '20');

        // Due date
        const dueEl = document.getElementById('detail-due');
        const dueInfo = this.formatDueDate(task.due_date);
        if (dueInfo) {
            dueEl.textContent = dueInfo.text;
            dueEl.className = `task-due ${dueInfo.class}`;
            dueEl.style.display = 'inline';
        } else {
            dueEl.style.display = 'none';
        }

        // Description
        const descEl = document.getElementById('detail-description');
        if (task.description) {
            descEl.innerHTML = `<p>${escapeHtml(task.description)}</p>`;
        } else {
            descEl.innerHTML = '<p class="empty-text">説明なし</p>';
        }

        // Info
        document.getElementById('detail-category').textContent = task.category_name || '-';
        document.getElementById('detail-assignee').textContent = task.assignee_name || '未割り当て';
        document.getElementById('detail-creator').textContent = task.creator_name || '-';
        document.getElementById('detail-created').textContent = formatDateTime(task.created_at);

        // Tags
        const tagsBox = document.getElementById('detail-tags-box');
        const tagsList = document.getElementById('detail-tags');
        if (task.tags && task.tags.length > 0) {
            tagsBox.style.display = 'flex';
            tagsList.innerHTML = task.tags.map(tag => `<span class="tag">#${escapeHtml(tag)}</span>`).join('');
        } else {
            tagsBox.style.display = 'none';
        }

        // Complete button
        const completeBtn = document.getElementById('detail-complete');
        const completeText = document.getElementById('detail-complete-text');
        if (task.status === 'done') {
            completeText.textContent = '未完了に戻す';
            completeBtn.classList.add('btn-secondary');
            completeBtn.classList.remove('btn-primary');
        } else {
            completeText.textContent = '完了にする';
            completeBtn.classList.remove('btn-secondary');
            completeBtn.classList.add('btn-primary');
        }

        // Permissions
        const canEdit = this.user?.role === 'admin' ||
            task.creator_id === this.user?.id ||
            task.assignee_id === this.user?.id;
        const canDelete = this.user?.role === 'admin' ||
            task.creator_id === this.user?.id;

        document.getElementById('detail-edit').style.display = canEdit && this.user?.role !== 'client' ? 'block' : 'none';
        document.getElementById('detail-delete').style.display = canDelete && this.user?.role !== 'client' ? 'block' : 'none';
    }

    closeDetailModal() {
        document.getElementById('task-detail-modal').style.display = 'none';
        this.selectedTask = null;
    }

    editSelectedTask() {
        if (!this.selectedTask) return;
        const task = this.selectedTask;  // Save before closeDetailModal clears it
        this.closeDetailModal();
        this.openTaskModal(task);
    }

    async deleteSelectedTask() {
        if (!this.selectedTask) return;

        if (!confirm('このタスクを削除しますか？')) return;

        try {
            await api.deleteTask(this.selectedTask.id);
            this.showToast('タスクを削除しました', 'success');
            this.closeDetailModal();
            this.loadTasks();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async toggleSelectedTaskComplete() {
        if (!this.selectedTask) return;

        try {
            await api.completeTask(this.selectedTask.id);
            const result = await api.getTask(this.selectedTask.id);
            this.selectedTask = result.data;
            this.renderTaskDetail();
            this.loadTasks();
            this.showToast('タスクを更新しました', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    // Comments
    async loadComments(taskId) {
        try {
            const result = await api.getComments(taskId);
            this.renderComments(result.data);
        } catch (error) {
            console.error('Failed to load comments:', error);
        }
    }

    renderComments(comments) {
        const container = document.getElementById('comments-list');

        if (!comments || comments.length === 0) {
            container.innerHTML = '<p class="empty-text">コメントはありません</p>';
            return;
        }

        container.innerHTML = comments.map(comment => `
            <div class="comment-item">
                <div class="comment-header">
                    <span class="comment-author">${escapeHtml(comment.user_name)}</span>
                    <span class="comment-date">${formatDateTime(comment.created_at)}</span>
                </div>
                <div class="comment-content">${escapeHtml(comment.content)}</div>
            </div>
        `).join('');
    }

    async handleCommentSubmit(e) {
        e.preventDefault();

        if (!this.selectedTask) return;

        const input = document.getElementById('comment-input');
        const content = input.value.trim();

        if (!content) return;

        try {
            await api.createComment(this.selectedTask.id, content);
            input.value = '';
            this.loadComments(this.selectedTask.id);
            this.showToast('コメントを追加しました', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    // Search
    handleSearch(query) {
        this.searchQuery = (query || '').toLowerCase().trim();
        this.renderBoard();
    }

    // Filter tasks based on search query
    filterTasksForSearch(tasks) {
        if (!this.searchQuery) return tasks;

        return tasks.filter(task => {
            const searchFields = [
                task.title || '',
                task.description || '',
                task.assignee_name || '',
                task.creator_name || '',
                task.category_name || '',
                ...(task.tags || [])
            ].join(' ').toLowerCase();

            return searchFields.includes(this.searchQuery);
        });
    }

    // Settings
    initSettingsTabs() {
        const tabs = document.querySelectorAll('.settings-tab');
        const panels = document.querySelectorAll('.settings-panel');
        const userSegments = document.querySelectorAll('.settings-user-segment .segment-btn');

        // Tab switching
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;

                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                panels.forEach(p => {
                    p.classList.toggle('active', p.id === `panel-${targetTab}`);
                });
                
                // Exit edit mode when switching tabs
                this.exitEditMode('departments');
                this.exitEditMode('users');
            });
        });

        // User segment switching
        userSegments.forEach(btn => {
            btn.addEventListener('click', () => {
                userSegments.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentUserFilter = btn.dataset.userType;
                this.renderUserList();
                
                // Exit edit mode when switching user type
                this.exitEditMode('users');

                // Update add button text
                const addBtnText = document.getElementById('add-user-btn-text');
                if (addBtnText) {
                    addBtnText.textContent = this.currentUserFilter === 'client'
                        ? 'クライアントを追加'
                        : 'スタッフを追加';
                }
            });
        });

        this.currentUserFilter = 'staff';
        
        // Edit mode buttons
        document.getElementById('edit-departments-btn')?.addEventListener('click', () => {
            this.toggleEditMode('departments');
        });
        
        document.getElementById('edit-users-btn')?.addEventListener('click', () => {
            this.toggleEditMode('users');
        });
    }
    
    // Edit Mode Management
    toggleEditMode(type) {
        const btn = document.getElementById(`edit-${type}-btn`);
        const list = document.getElementById(`${type === 'departments' ? 'department' : 'user'}-list`);
        
        if (!btn || !list) return;
        
        const isEditMode = list.classList.contains('edit-mode');
        
        if (isEditMode) {
            this.exitEditMode(type);
        } else {
            this.enterEditMode(type);
        }
    }
    
    enterEditMode(type) {
        const btn = document.getElementById(`edit-${type}-btn`);
        const list = document.getElementById(`${type === 'departments' ? 'department' : 'user'}-list`);
        
        if (!btn || !list) return;
        
        btn.textContent = '完了';
        btn.classList.add('active');
        list.classList.add('edit-mode');
        
        // Enable draggable
        list.querySelectorAll(`.${type === 'departments' ? 'department' : 'user'}-item`).forEach(item => {
            item.draggable = true;
            item.addEventListener('dragstart', (e) => this.handleListDragStart(e, type));
            item.addEventListener('dragend', (e) => this.handleListDragEnd(e, type));
            item.addEventListener('dragover', (e) => this.handleListDragOver(e));
            item.addEventListener('dragleave', (e) => this.handleListDragLeave(e));
            item.addEventListener('drop', (e) => this.handleListDrop(e, type));
        });
    }
    
    async exitEditMode(type) {
        const btn = document.getElementById(`edit-${type}-btn`);
        const list = document.getElementById(`${type === 'departments' ? 'department' : 'user'}-list`);
        
        if (!btn || !list) return;
        
        if (!list.classList.contains('edit-mode')) return;
        
        btn.textContent = '編集';
        btn.classList.remove('active');
        list.classList.remove('edit-mode');
        
        // Save order
        const items = list.querySelectorAll(`.${type === 'departments' ? 'department' : 'user'}-item`);
        const order = Array.from(items).map((item, index) => ({
            id: parseInt(item.dataset.id),
            sort_order: index
        }));
        
        try {
            if (type === 'departments') {
                await api.reorderDepartments(order);
                await this.loadDepartments();
            } else {
                await api.reorderUsers(order);
                await this.loadUsers();
            }
        } catch (error) {
            this.showToast('並び替えの保存に失敗しました', 'error');
        }
        
        // Disable draggable and re-render to clean up event listeners
        if (type === 'departments') {
            this.renderDepartmentList();
        } else {
            this.renderUserList();
        }
    }
    
    // List Drag & Drop
    handleListDragStart(e, type) {
        this.draggedListItem = e.target.closest(`.${type === 'departments' ? 'department' : 'user'}-item`);
        if (this.draggedListItem) {
            this.draggedListItem.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        }
    }
    
    handleListDragEnd(e, type) {
        if (this.draggedListItem) {
            this.draggedListItem.classList.remove('dragging');
            this.draggedListItem = null;
        }
        // Remove all drag-over classes
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    }
    
    handleListDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const target = e.target.closest('.department-item, .user-item');
        if (target && target !== this.draggedListItem) {
            target.classList.add('drag-over');
        }
    }
    
    handleListDragLeave(e) {
        const target = e.target.closest('.department-item, .user-item');
        if (target) {
            target.classList.remove('drag-over');
        }
    }
    
    handleListDrop(e, type) {
        e.preventDefault();
        
        const target = e.target.closest(`.${type === 'departments' ? 'department' : 'user'}-item`);
        if (!target || !this.draggedListItem || target === this.draggedListItem) return;
        
        target.classList.remove('drag-over');
        
        const list = target.parentNode;
        const items = Array.from(list.children);
        const draggedIndex = items.indexOf(this.draggedListItem);
        const targetIndex = items.indexOf(target);
        
        if (draggedIndex < targetIndex) {
            list.insertBefore(this.draggedListItem, target.nextSibling);
        } else {
            list.insertBefore(this.draggedListItem, target);
        }
    }

    openSettingsModal() {
        document.getElementById('settings-modal').style.display = 'flex';

        // Show/hide tabs for staff and admin
        const usersTab = document.getElementById('users-tab');
        const departmentsTab = document.getElementById('departments-tab');
        const isStaffOrAdmin = this.user?.role === 'admin' || this.user?.role === 'staff';
        if (usersTab) {
            usersTab.style.display = isStaffOrAdmin ? 'flex' : 'none';
        }
        if (departmentsTab) {
            departmentsTab.style.display = isStaffOrAdmin ? 'flex' : 'none';
        }

        // Reset to first tab
        document.querySelectorAll('.settings-tab').forEach((t, i) => {
            t.classList.toggle('active', i === 0);
        });
        document.querySelectorAll('.settings-panel').forEach((p, i) => {
            p.classList.toggle('active', i === 0);
        });

        this.renderCategoryList();
        if (this.user?.role === 'admin' || this.user?.role === 'staff') {
            this.renderDepartmentList();
            this.currentUserFilter = 'staff';
            document.querySelectorAll('.settings-user-segment .segment-btn').forEach((b, i) => {
                b.classList.toggle('active', i === 0);
            });
            this.renderUserList();
        }
    }

    closeSettingsModal() {
        document.getElementById('settings-modal').style.display = 'none';
    }

    renderCategoryList() {
        const container = document.getElementById('category-list');

        if (this.categories.length === 0) {
            container.innerHTML = '<div class="settings-empty">カテゴリーがありません</div>';
            return;
        }

        container.innerHTML = this.categories.map(cat => `
            <div class="category-item" data-id="${cat.id}">
                <span class="color-dot" style="background: ${cat.color}"></span>
                <span class="name">${escapeHtml(cat.name)}</span>
                <div class="item-actions">
                    <button class="icon-btn edit-category" title="編集">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="icon-btn delete-category" title="削除">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.edit-category').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const item = e.target.closest('.category-item');
                const id = parseInt(item.dataset.id);
                const category = this.categories.find(c => c.id === id);
                if (category) {
                    this.openEditCategoryModal(category);
                }
            });
        });

        container.querySelectorAll('.delete-category').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.category-item').dataset.id;
                this.deleteCategory(parseInt(id));
            });
        });
    }

    openEditCategoryModal(category = null) {
        const modal = document.getElementById('category-edit-modal');
        const isNew = !category;
        
        document.getElementById('category-edit-id').value = category?.id || '';
        document.getElementById('category-edit-name').value = category?.name || '';
        document.getElementById('category-edit-title').textContent = isNew ? 'カテゴリーを追加' : 'カテゴリーを編集';
        
        // Set color
        const color = category?.color || '#007AFF';
        document.getElementById('category-edit-color').value = color;
        this.selectCategoryColor(color);
        
        modal.style.display = 'flex';
        document.getElementById('category-edit-name').focus();
    }

    selectCategoryColor(color) {
        document.querySelectorAll('#category-color-picker .color-option').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.color === color);
        });
        document.getElementById('category-edit-color').value = color;
    }

    closeCategoryEditModal() {
        document.getElementById('category-edit-modal').style.display = 'none';
    }

    initCategoryEditModal() {
        const modal = document.getElementById('category-edit-modal');
        const form = document.getElementById('category-edit-form');
        const closeBtn = document.getElementById('category-edit-close');
        const cancelBtn = document.getElementById('category-edit-cancel');
        const colorPicker = document.getElementById('category-color-picker');

        closeBtn?.addEventListener('click', () => this.closeCategoryEditModal());
        cancelBtn?.addEventListener('click', () => this.closeCategoryEditModal());

        modal?.addEventListener('click', (e) => {
            if (e.target === modal) this.closeCategoryEditModal();
        });

        // Color picker
        colorPicker?.addEventListener('click', (e) => {
            const btn = e.target.closest('.color-option');
            if (btn) {
                this.selectCategoryColor(btn.dataset.color);
            }
        });

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('category-edit-id').value;
            const name = document.getElementById('category-edit-name').value.trim();
            const color = document.getElementById('category-edit-color').value;
            
            if (name) {
                if (id) {
                    await this.updateCategory(parseInt(id), name, color);
                } else {
                    await this.createCategory(name, color);
                }
                this.closeCategoryEditModal();
            }
        });
    }

    initUserEditModal() {
        const modal = document.getElementById('user-edit-modal');
        const form = document.getElementById('user-edit-form');
        const closeBtn = document.getElementById('user-edit-close');
        const cancelBtn = document.getElementById('user-edit-cancel');
        const roleSelect = document.getElementById('user-edit-role');
        const companyGroup = document.getElementById('user-edit-company-group');

        closeBtn?.addEventListener('click', () => this.closeUserEditModal());
        cancelBtn?.addEventListener('click', () => this.closeUserEditModal());

        modal?.addEventListener('click', (e) => {
            if (e.target === modal) this.closeUserEditModal();
        });

        // Show/hide company/department field based on role
        roleSelect?.addEventListener('change', () => {
            const departmentGroup = document.getElementById('user-edit-department-group');
            if (roleSelect.value === 'client') {
                companyGroup.style.display = 'block';
                departmentGroup.style.display = 'none';
            } else {
                companyGroup.style.display = 'none';
                departmentGroup.style.display = 'block';
            }
        });

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idValue = document.getElementById('user-edit-id').value;
            const id = idValue ? parseInt(idValue) : null;
            const name = document.getElementById('user-edit-name').value.trim();
            const email = document.getElementById('user-edit-email').value.trim();
            const role = document.getElementById('user-edit-role').value;
            const password = document.getElementById('user-edit-password').value.trim();
            const company = document.getElementById('user-edit-company').value.trim();
            const departmentId = document.getElementById('user-edit-department').value;

            const data = {
                name,
                email,
                role,
                type: role === 'client' ? 'client' : 'internal'
            };

            if (password) {
                data.password = password;
            }

            if (role === 'client') {
                data.company = company || null;
                data.department_id = null;
            } else {
                data.department_id = departmentId ? parseInt(departmentId) : null;
            }

            if (id) {
                // Update existing user
                await this.updateUser(id, data);
            } else {
                // Create new user
                await this.createUser(data);
            }
        });
    }
    
    async createUser(data) {
        const submitBtn = document.getElementById('user-edit-submit');
        
        submitBtn.querySelector('.btn-text').style.display = 'none';
        submitBtn.querySelector('.btn-loading').style.display = 'flex';
        submitBtn.disabled = true;

        try {
            await api.createUser(data);
            await this.loadUsers();
            this.renderUserList();
            this.closeUserEditModal();
            const isClient = data.role === 'client';
            this.showToast(isClient ? 'クライアントを追加しました' : 'ユーザーを追加しました', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            submitBtn.querySelector('.btn-text').style.display = 'inline';
            submitBtn.querySelector('.btn-loading').style.display = 'none';
            submitBtn.disabled = false;
        }
    }

    openEditUserModal(user, isNew = false) {
        // Staff cannot edit admin users
        if (!isNew && this.user?.role !== 'admin' && user.role === 'admin') {
            this.showToast('管理者ユーザーは編集できません', 'error');
            return;
        }

        const modal = document.getElementById('user-edit-modal');
        const companyGroup = document.getElementById('user-edit-company-group');
        const departmentGroup = document.getElementById('user-edit-department-group');
        const departmentSelect = document.getElementById('user-edit-department');
        const roleSelect = document.getElementById('user-edit-role');
        const passwordInput = document.getElementById('user-edit-password');
        const passwordLabel = passwordInput?.previousElementSibling;
        const title = document.getElementById('user-edit-title');
        
        // Set title
        if (title) {
            title.textContent = isNew ? 'ユーザーを追加' : 'ユーザーを編集';
        }
        
        document.getElementById('user-edit-id').value = user.id || '';
        document.getElementById('user-edit-name').value = user.name || '';
        document.getElementById('user-edit-email').value = user.email || '';
        document.getElementById('user-edit-password').value = '';
        document.getElementById('user-edit-company').value = user.company || '';
        
        // Password is required for new users
        if (passwordLabel) {
            passwordLabel.textContent = isNew ? 'パスワード *' : 'パスワード（変更する場合のみ）';
        }
        if (passwordInput) {
            passwordInput.required = isNew;
            passwordInput.placeholder = isNew ? '必須' : '変更しない場合は空欄';
        }

        // Update role options based on current user's role
        if (this.user?.role === 'admin') {
            roleSelect.innerHTML = `
                <option value="staff">スタッフ</option>
                <option value="admin">管理者</option>
                <option value="client">クライアント</option>
            `;
        } else {
            roleSelect.innerHTML = `
                <option value="staff">スタッフ</option>
                <option value="client">クライアント</option>
            `;
        }
        roleSelect.value = user.role || 'staff';

        // Populate department dropdown
        departmentSelect.innerHTML = '<option value="">未設定</option>' +
            this.departments.map(d => 
                `<option value="${d.id}" ${d.id === user.department_id ? 'selected' : ''}>${escapeHtml(d.name)}</option>`
            ).join('');

        if (user.role === 'client') {
            companyGroup.style.display = 'block';
            departmentGroup.style.display = 'none';
        } else {
            companyGroup.style.display = 'none';
            departmentGroup.style.display = 'block';
        }

        modal.style.display = 'flex';
        document.getElementById('user-edit-name').focus();
    }

    closeUserEditModal() {
        document.getElementById('user-edit-modal').style.display = 'none';
    }

    async updateUser(id, data) {
        const submitBtn = document.getElementById('user-edit-submit');
        
        submitBtn.querySelector('.btn-text').style.display = 'none';
        submitBtn.querySelector('.btn-loading').style.display = 'flex';
        submitBtn.disabled = true;

        try {
            await api.updateUser(id, data);
            await this.loadUsers();
            this.renderUserList();
            this.closeUserEditModal();
            this.showToast('ユーザーを更新しました', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            submitBtn.querySelector('.btn-text').style.display = 'inline';
            submitBtn.querySelector('.btn-loading').style.display = 'none';
            submitBtn.disabled = false;
        }
    }

    async updateCategory(id, name, color) {
        try {
            await api.updateCategory(id, { name, color });
            await this.loadCategories();
            this.renderCategoryList();
            this.updateCategoryDropdowns();
            this.loadTasks();
            this.showToast('カテゴリーを更新しました', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async createCategory(name, color) {
        try {
            await api.createCategory({ name, color });
            await this.loadCategories();
            this.renderCategoryList();
            this.updateCategoryDropdowns();
            this.loadTasks();
            this.showToast('カテゴリーを追加しました', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    renderUserList() {
        const container = document.getElementById('user-list');
        const filterType = this.currentUserFilter || 'staff';

        const filteredUsers = this.users.filter(user => {
            if (filterType === 'staff') {
                return user.role !== 'client';
            } else {
                return user.role === 'client';
            }
        });

        if (filteredUsers.length === 0) {
            const emptyText = filterType === 'client' ? 'クライアントがいません' : 'スタッフがいません';
            container.innerHTML = `<div class="settings-empty">${emptyText}</div>`;
            return;
        }

        container.innerHTML = filteredUsers.map(user => {
            const initials = user.name.charAt(0).toUpperCase();
            const isClient = user.role === 'client';
            const displayName = isClient && user.company ? user.company : user.name;
            const roleBadgeClass = user.role === 'admin' ? 'admin' : (isClient ? 'client' : '');
            const roleLabel = user.role === 'admin' ? '管理者' : (user.role === 'staff' ? 'スタッフ' : 'クライアント');

            const deptBadge = !isClient && user.department_name 
                ? `<span class="dept-badge" style="background: ${user.department_color}20; color: ${user.department_color}">${escapeHtml(user.department_name)}</span>` 
                : '';

            return `
                <div class="user-item" data-id="${user.id}" draggable="false">
                    <span class="drag-handle">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="4" y1="8" x2="20" y2="8"/>
                            <line x1="4" y1="16" x2="20" y2="16"/>
                        </svg>
                    </span>
                    <span class="user-avatar-sm ${isClient ? 'client' : 'staff'}">${initials}</span>
                    <div class="user-info">
                        <div class="name">${escapeHtml(displayName)}</div>
                        <div class="email">${escapeHtml(user.email)}</div>
                    </div>
                    ${deptBadge}
                    <span class="role-badge ${roleBadgeClass}">${roleLabel}</span>
                    <div class="item-actions">
                        <button class="icon-btn edit-user" title="編集">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                    </div>
                    <button class="delete-btn-edit" title="削除" data-id="${user.id}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                    </button>
                </div>
            `;
        }).join('');

        // Bind edit user events
        container.querySelectorAll('.edit-user').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const item = e.target.closest('.user-item');
                const id = parseInt(item.dataset.id);
                const user = this.users.find(u => u.id === id);
                if (user) {
                    this.openEditUserModal(user);
                }
            });
        });

        // Bind delete button (edit mode)
        container.querySelectorAll('.user-item .delete-btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(e.currentTarget.dataset.id);
                this.deleteUser(id);
            });
        });
    }

    async deleteUser(id) {
        if (!confirm('このユーザーを削除しますか？')) return;

        try {
            await api.deleteUser(id);
            await this.loadUsers();
            this.renderUserList();
            this.showToast('ユーザーを削除しました', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    addUser() {
        // Open edit modal in create mode
        const isClient = this.currentUserFilter === 'client';
        this.openEditUserModal({
            id: null,
            name: '',
            email: '',
            role: isClient ? 'client' : 'staff',
            company: '',
            department_id: null
        }, true);
    }

    addCategory() {
        this.openEditCategoryModal(null);
    }

    async deleteCategory(id) {
        if (!confirm('このカテゴリーを削除しますか？')) return;

        try {
            await api.deleteCategory(id);
            await this.loadCategories();
            this.renderCategoryList();
            this.loadTasks();
            this.showToast('カテゴリーを削除しました', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    // Department management
    renderDepartmentList() {
        const container = document.getElementById('department-list');

        if (this.departments.length === 0) {
            container.innerHTML = '<div class="settings-empty">部署がありません</div>';
            return;
        }

        container.innerHTML = this.departments.map(dept => `
            <div class="department-item" data-id="${dept.id}" draggable="false">
                <span class="drag-handle">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="4" y1="8" x2="20" y2="8"/>
                        <line x1="4" y1="16" x2="20" y2="16"/>
                    </svg>
                </span>
                <span class="color-dot" style="background: ${dept.color}"></span>
                <span class="name">${escapeHtml(dept.name)}</span>
                <span class="count">${dept.user_count || 0}人</span>
                <div class="item-actions">
                    <button class="icon-btn edit-department" title="編集">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="icon-btn delete-department" title="削除">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
                <button class="delete-btn-edit" title="削除">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                </button>
            </div>
        `).join('');

        container.querySelectorAll('.edit-department').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const item = e.target.closest('.department-item');
                const id = parseInt(item.dataset.id);
                const dept = this.departments.find(d => d.id === id);
                if (dept) {
                    this.editDepartment(dept);
                }
            });
        });

        container.querySelectorAll('.delete-department, .department-item .delete-btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.department-item').dataset.id;
                this.deleteDepartment(parseInt(id));
            });
        });
    }

    async addDepartment() {
        const name = prompt('部署名を入力してください:');
        if (!name) return;

        const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

        try {
            await api.createDepartment({ name, color });
            await this.loadDepartments();
            this.renderDepartmentList();
            this.showToast('部署を追加しました', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async editDepartment(dept) {
        const name = prompt('部署名を入力してください:', dept.name);
        if (!name || name === dept.name) return;

        try {
            await api.updateDepartment(dept.id, { name });
            await this.loadDepartments();
            this.renderDepartmentList();
            this.showToast('部署を更新しました', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async deleteDepartment(id) {
        if (!confirm('この部署を削除しますか？\n所属ユーザーの部署は「未設定」になります。')) return;

        try {
            await api.deleteDepartment(id);
            await this.loadDepartments();
            this.renderDepartmentList();
            this.loadTasks();
            this.showToast('部署を削除しました', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    // Dropdowns
    updateCategoryDropdowns() {
        const select = document.getElementById('task-category');
        if (!select) return;

        select.innerHTML = '<option value="">未分類</option>' +
            this.categories.map(cat =>
                `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`
            ).join('');
    }

    updateAssigneeDropdowns() {
        // Custom component is now used, just trigger a re-render if dropdown is open
        const dropdown = document.getElementById('assignee-dropdown');
        if (dropdown && dropdown.style.display !== 'none') {
            this.renderAssigneeList();
        }
    }

    // Calendar View
    async loadCalendar() {
        if (!this.calendarDate) {
            this.calendarDate = new Date();
        }
        
        const year = this.calendarDate.getFullYear();
        const month = this.calendarDate.getMonth();
        
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        
        // Extend to show days from previous/next month
        startDate.setDate(startDate.getDate() - startDate.getDay());
        endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
        
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        
        try {
            const result = await api.getCalendarTasks(startStr, endStr);
            this.calendarTasks = result.data;
            this.renderCalendarView();
        } catch (error) {
            console.error('[App] Failed to load calendar:', error);
            // Show empty calendar instead of error
            this.calendarTasks = [];
            this.renderCalendarView();
        }
    }

    renderCalendarView() {
        const container = document.getElementById('board-container');
        const year = this.calendarDate.getFullYear();
        const month = this.calendarDate.getMonth();
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startOffset = firstDay.getDay();
        const daysInMonth = lastDay.getDate();
        
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Group tasks by date
        const tasksByDate = {};
        (this.calendarTasks || []).forEach(task => {
            const date = task.due_date;
            if (!tasksByDate[date]) tasksByDate[date] = [];
            tasksByDate[date].push(task);
        });
        
        // Generate calendar days
        let daysHtml = '';
        const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
        
        for (let i = 0; i < totalCells; i++) {
            const dayNum = i - startOffset + 1;
            const isOtherMonth = dayNum < 1 || dayNum > daysInMonth;
            
            let displayDate;
            if (dayNum < 1) {
                const prevMonth = new Date(year, month, dayNum);
                displayDate = prevMonth;
            } else if (dayNum > daysInMonth) {
                const nextMonth = new Date(year, month, dayNum);
                displayDate = nextMonth;
            } else {
                displayDate = new Date(year, month, dayNum);
            }
            
            const dateStr = displayDate.toISOString().split('T')[0];
            const isToday = dateStr === todayStr;
            const dayTasks = tasksByDate[dateStr] || [];
            
            const classes = ['calendar-day'];
            if (isOtherMonth) classes.push('other-month');
            if (isToday) classes.push('today');
            
            const tasksHtml = dayTasks.slice(0, 3).map(task => {
                const isOverdue = task.due_date < todayStr && task.status !== 'done';
                const taskClass = isOverdue ? 'overdue' : (task.is_my_task ? 'my-task' : 'my-request');
                return `<div class="calendar-task ${taskClass}" data-task-id="${task.id}" title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</div>`;
            }).join('');
            
            const moreHtml = dayTasks.length > 3 
                ? `<div class="calendar-task-more">+${dayTasks.length - 3}件</div>` 
                : '';
            
            daysHtml += `
                <div class="${classes.join(' ')}" data-date="${dateStr}">
                    <div class="day-number">${displayDate.getDate()}</div>
                    <div class="day-tasks">${tasksHtml}${moreHtml}</div>
                </div>
            `;
        }
        
        container.innerHTML = `
            <div class="calendar-view">
                <div class="calendar-header">
                    <div class="calendar-nav">
                        <button class="calendar-nav-btn" id="calendar-prev">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="15 18 9 12 15 6"/>
                            </svg>
                        </button>
                        <h2 class="calendar-title">${year}年 ${monthNames[month]}</h2>
                        <button class="calendar-nav-btn" id="calendar-next">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"/>
                            </svg>
                        </button>
                        <button class="calendar-today-btn" id="calendar-today">今日</button>
                    </div>
                </div>
                
                <div class="calendar-grid">
                    <div class="calendar-weekdays">
                        <div class="calendar-weekday">日</div>
                        <div class="calendar-weekday">月</div>
                        <div class="calendar-weekday">火</div>
                        <div class="calendar-weekday">水</div>
                        <div class="calendar-weekday">木</div>
                        <div class="calendar-weekday">金</div>
                        <div class="calendar-weekday">土</div>
                    </div>
                    <div class="calendar-days">${daysHtml}</div>
                </div>
                
                <div class="calendar-legend">
                    <div class="calendar-legend-item">
                        <span class="legend-color" style="background: var(--color-primary);"></span>
                        自分のタスク
                    </div>
                    <div class="calendar-legend-item">
                        <span class="legend-color" style="background: var(--color-success);"></span>
                        依頼したタスク
                    </div>
                    <div class="calendar-legend-item">
                        期限切れ
                    </div>
                </div>
            </div>
        `;
        
        // Event listeners
        document.getElementById('calendar-prev')?.addEventListener('click', () => {
            this.calendarDate.setMonth(this.calendarDate.getMonth() - 1);
            this.loadCalendar();
        });
        
        document.getElementById('calendar-next')?.addEventListener('click', () => {
            this.calendarDate.setMonth(this.calendarDate.getMonth() + 1);
            this.loadCalendar();
        });
        
        document.getElementById('calendar-today')?.addEventListener('click', () => {
            this.calendarDate = new Date();
            this.loadCalendar();
        });
        
        // Task click handlers
        container.querySelectorAll('.calendar-task').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = parseInt(el.dataset.taskId);
                if (taskId) this.openTaskDetail(taskId);
            });
        });
    }

    // Requested View with Workload
    renderRequestedWithWorkload() {
        const container = document.getElementById('board-container');
        const groupedData = this.tasks; // This is now { assigneeId: { assignee, my_tasks, others_tasks, ... } }
        
        if (!groupedData || Object.keys(groupedData).length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <h3>依頼中のタスクはありません</h3>
                    <p>他のメンバーにタスクを依頼すると、ここに表示されます</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '<div class="board-columns"></div>';
        const columnsContainer = container.querySelector('.board-columns');
        
        Object.values(groupedData).forEach(data => {
            const column = this.createRequestedWorkloadColumn(data);
            columnsContainer.appendChild(column);
        });
    }

    createRequestedWorkloadColumn(data) {
        const column = document.createElement('div');
        column.className = 'board-column';
        
        const { assignee, my_tasks, others_tasks, my_task_count, others_task_count } = data;
        const initials = assignee.name.charAt(0).toUpperCase();
        const isClient = assignee.type === 'client';
        const displayName = isClient && assignee.company ? assignee.company : assignee.name;
        
        column.innerHTML = `
            <div class="column-header">
                <div class="column-header-left">
                    <span class="column-avatar ${isClient ? 'client' : ''}">${escapeHtml(initials)}</span>
                    <span class="column-name">${escapeHtml(displayName)}</span>
                    <span class="column-count">${my_task_count}</span>
                    ${others_task_count > 0 ? `<span class="column-count" style="background: var(--color-text-disabled); color: white;" title="他の人からの依頼">+${others_task_count}</span>` : ''}
                </div>
            </div>
            <div class="column-content"></div>
        `;
        
        const content = column.querySelector('.column-content');
        
        // My tasks
        my_tasks.forEach(task => {
            const card = this.createTaskCard(task);
            content.appendChild(card);
        });
        
        // Others' tasks (if any)
        if (others_tasks && others_tasks.length > 0) {
            const othersSection = document.createElement('div');
            othersSection.className = 'others-tasks-section';
            othersSection.innerHTML = `
                <div class="others-tasks-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    他の人からの依頼 (${others_tasks.length}件)
                </div>
            `;
            
            others_tasks.forEach(task => {
                const card = this.createTaskCard(task);
                card.classList.add('others-task');
                card.style.position = 'relative';
                othersSection.appendChild(card);
            });
            
            content.appendChild(othersSection);
        }
        
        return column;
    }

    // Stats
    async loadStats() {
        try {
            const result = await api.getStats();
            this.stats = result.data;
            this.renderStatsView();
        } catch (error) {
            console.error('[App] Failed to load stats:', error);
            // Show empty stats
            this.stats = { total: 0, completed: 0, in_progress: 0, todo: 0, backlog: 0, cancelled: 0, urgent: 0, high: 0, medium: 0, low: 0, overdue: 0, completion_rate: 0, recent_tasks: [] };
            this.renderStatsView();
        }
    }

    renderStatsView() {
        const container = document.getElementById('board-container');
        const stats = this.stats;

        if (!stats) return;

        const statusData = [
            { label: 'バックログ', value: parseInt(stats.backlog) || 0, color: '#8E8E93' },
            { label: 'ToDo', value: parseInt(stats.todo) || 0, color: '#007AFF' },
            { label: '進行中', value: parseInt(stats.in_progress) || 0, color: '#FF9500' },
            { label: '完了', value: parseInt(stats.completed) || 0, color: '#34C759' },
            { label: 'キャンセル', value: parseInt(stats.cancelled) || 0, color: '#FF3B30' }
        ];

        const priorityData = [
            { label: '緊急', value: parseInt(stats.urgent) || 0, color: '#FF3B30' },
            { label: '高', value: parseInt(stats.high) || 0, color: '#FF9500' },
            { label: '中', value: parseInt(stats.medium) || 0, color: '#007AFF' },
            { label: '低', value: parseInt(stats.low) || 0, color: '#8E8E93' }
        ];

        container.innerHTML = `
            <div class="stats-view">
                <div class="stats-header">
                    <h2 class="stats-title">統計ダッシュボード</h2>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">総タスク数</div>
                        <div class="stat-value">${stats.total || 0}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">完了タスク</div>
                        <div class="stat-value" style="color: #34C759;">${stats.completed || 0}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">進行中</div>
                        <div class="stat-value" style="color: #FF9500;">${stats.in_progress || 0}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">期限超過</div>
                        <div class="stat-value" style="color: #FF3B30;">${stats.overdue || 0}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">完了率</div>
                        <div class="stat-value">${stats.completion_rate || 0}%</div>
                        <div class="stat-progress">
                            <div class="stat-progress-bar" style="width: ${stats.completion_rate || 0}%;"></div>
                        </div>
                    </div>
                </div>

                <div class="stats-charts">
                    <div class="chart-card">
                        <h3 class="chart-title">ステータス別</h3>
                        <div class="chart-bars">
                            ${statusData.map(item => `
                                <div class="chart-bar-item">
                                    <div class="chart-bar-label">${item.label}</div>
                                    <div class="chart-bar-wrapper">
                                        <div class="chart-bar" style="width: ${stats.total > 0 ? (item.value / stats.total * 100) : 0}%; background: ${item.color};"></div>
                                    </div>
                                    <div class="chart-bar-value">${item.value}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="chart-card">
                        <h3 class="chart-title">優先度別</h3>
                        <div class="chart-bars">
                            ${priorityData.map(item => `
                                <div class="chart-bar-item">
                                    <div class="chart-bar-label">${item.label}</div>
                                    <div class="chart-bar-wrapper">
                                        <div class="chart-bar" style="width: ${stats.total > 0 ? (item.value / stats.total * 100) : 0}%; background: ${item.color};"></div>
                                    </div>
                                    <div class="chart-bar-value">${item.value}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                ${stats.recent_tasks && stats.recent_tasks.length > 0 ? `
                    <div class="stats-recent">
                        <h3 class="stats-section-title">最近のタスク</h3>
                        <div class="stats-task-list">
                            ${stats.recent_tasks.map(task => {
                                const dueInfo = this.formatDueDate(task.due_date);
                                return `
                                    <div class="stats-task-item" data-id="${task.id}">
                                        <div class="task-checkbox ${task.status === 'done' ? 'checked' : ''}">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                                <polyline points="20 6 9 17 4 12"/>
                                            </svg>
                                        </div>
                                        <div class="stats-task-content">
                                            <div class="stats-task-title">${escapeHtml(task.title)}</div>
                                            <div class="stats-task-meta">
                                                ${task.category_name ? `<span class="tag category" style="--tag-color: ${task.category_color}">${escapeHtml(task.category_name)}</span>` : ''}
                                                ${task.assignee_name ? `<span class="stats-task-assignee">${escapeHtml(task.assignee_name)}</span>` : ''}
                                                ${dueInfo ? `<span class="task-due ${dueInfo.class}">${dueInfo.text}</span>` : ''}
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        // Bind click events for recent tasks
        container.querySelectorAll('.stats-task-item').forEach(item => {
            item.addEventListener('click', () => {
                this.openTaskDetail(parseInt(item.dataset.id));
            });
        });
    }

    // Change Password
    initChangePasswordModal() {
        const modal = document.getElementById('change-password-modal');
        const form = document.getElementById('change-password-form');
        const closeBtn = document.getElementById('change-password-close');
        const cancelBtn = document.getElementById('change-password-cancel');

        closeBtn?.addEventListener('click', () => this.closeChangePasswordModal());
        cancelBtn?.addEventListener('click', () => this.closeChangePasswordModal());

        modal?.addEventListener('click', (e) => {
            if (e.target === modal) this.closeChangePasswordModal();
        });

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleChangePassword();
        });
    }

    openChangePasswordModal() {
        const modal = document.getElementById('change-password-modal');
        const form = document.getElementById('change-password-form');
        const errorDiv = document.getElementById('change-password-error');
        
        form.reset();
        errorDiv.style.display = 'none';
        modal.style.display = 'flex';
        document.getElementById('current-password').focus();

        // Close user dropdown
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) dropdown.style.display = 'none';
    }

    closeChangePasswordModal() {
        document.getElementById('change-password-modal').style.display = 'none';
    }

    async handleChangePassword() {
        const submitBtn = document.getElementById('change-password-submit');
        const errorDiv = document.getElementById('change-password-error');
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const newPasswordConfirmation = document.getElementById('new-password-confirmation').value;

        errorDiv.style.display = 'none';

        submitBtn.querySelector('.btn-text').style.display = 'none';
        submitBtn.querySelector('.btn-loading').style.display = 'flex';
        submitBtn.disabled = true;

        try {
            await api.changePassword({
                current_password: currentPassword,
                new_password: newPassword,
                new_password_confirmation: newPasswordConfirmation
            });

            this.closeChangePasswordModal();
            this.showToast('パスワードを変更しました', 'success');
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        } finally {
            submitBtn.querySelector('.btn-text').style.display = 'inline';
            submitBtn.querySelector('.btn-loading').style.display = 'none';
            submitBtn.disabled = false;
        }
    }

    // Notifications
    async loadNotifications() {
        try {
            const result = await api.getNotifications({ limit: 20 });
            this.notifications = result.data.notifications;
            this.unreadCount = result.data.unread_count;
            this.updateNotificationBadge();
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    }

    startNotificationPolling() {
        setInterval(() => {
            if (this.user) {
                this.loadNotifications();
            }
        }, 30000); // Poll every 30 seconds
    }

    updateNotificationBadge() {
        const badge = document.getElementById('notification-badge');
        if (this.unreadCount > 0) {
            badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    toggleNotificationsPanel() {
        const panel = document.getElementById('notifications-panel');
        if (panel.style.display === 'none' || !panel.style.display) {
            this.openNotificationsPanel();
        } else {
            this.closeNotificationsPanel();
        }
    }

    openNotificationsPanel() {
        const panel = document.getElementById('notifications-panel');
        panel.style.display = 'flex';
        this.renderNotifications();

        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', this.handleNotificationOutsideClick);
        }, 0);
    }

    closeNotificationsPanel() {
        const panel = document.getElementById('notifications-panel');
        panel.style.display = 'none';
        document.removeEventListener('click', this.handleNotificationOutsideClick);
    }

    handleNotificationOutsideClick = (e) => {
        const panel = document.getElementById('notifications-panel');
        const btn = document.getElementById('notifications-btn');
        if (!panel.contains(e.target) && !btn.contains(e.target)) {
            this.closeNotificationsPanel();
        }
    }

    renderNotifications() {
        const container = document.getElementById('notifications-list');

        if (this.notifications.length === 0) {
            container.innerHTML = '<div class="notifications-empty">通知はありません</div>';
            return;
        }

        container.innerHTML = this.notifications.map(notif => {
            const typeIcons = {
                task_assigned: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
                task_completed: '<polyline points="20 6 9 17 4 12"/>',
                comment_added: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
                task_updated: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
            };

            const icon = typeIcons[notif.type] || typeIcons.task_assigned;
            const timeAgo = this.formatTimeAgo(notif.created_at);

            return `
                <div class="notification-item ${notif.is_read ? '' : 'unread'}" data-id="${notif.id}" data-task-id="${notif.task_id || ''}">
                    <div class="notification-icon ${notif.type}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            ${icon}
                        </svg>
                    </div>
                    <div class="notification-content">
                        <div class="notification-title">${escapeHtml(notif.title)}</div>
                        <div class="notification-message">${escapeHtml(notif.message || '')}</div>
                        <div class="notification-time">${timeAgo}</div>
                    </div>
                </div>
            `;
        }).join('');

        // Bind click events
        container.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id);
                const taskId = item.dataset.taskId ? parseInt(item.dataset.taskId) : null;
                this.handleNotificationClick(id, taskId);
            });
        });
    }

    async handleNotificationClick(notificationId, taskId) {
        // Mark as read
        try {
            await api.markNotificationAsRead(notificationId);
            await this.loadNotifications();
            this.renderNotifications();
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }

        // Open task if applicable
        if (taskId) {
            this.closeNotificationsPanel();
            this.openTaskDetail(taskId);
        }
    }

    async markAllNotificationsAsRead() {
        try {
            await api.markAllNotificationsAsRead();
            await this.loadNotifications();
            this.renderNotifications();
            this.showToast('すべて既読にしました', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    formatTimeAgo(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'たった今';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}分前`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}時間前`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}日前`;
        
        return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    }

    // Toast notifications
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Utility functions
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
