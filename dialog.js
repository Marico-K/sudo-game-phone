/**
 * 自定义弹窗组件
 * 替代原生 alert 和 confirm
 * 使用方法：
 *   customAlert('提示信息', 'success')
 *   customConfirm('确定要执行吗？', () => { ... }, () => { ... })
 *   showToast('操作成功', 'success')
 */

// 自定义提示弹窗（替代 alert）
function customAlert(message, type = 'info', callback = null, options = {}) {
    const typeConfig = {
        info:    { icon: 'ℹ️', color: '#2196F3', title: '提示' },
        success: { icon: '✅', color: '#4CAF50', title: '成功' },
        warning: { icon: '⚠️', color: '#FF9800', title: '警告' },
        error:   { icon: '❌', color: '#F44336', title: '错误' },
        question:{ icon: '❓', color: '#9C27B0', title: '提示' }
    };
    const config = typeConfig[type] || typeConfig.info;
    const { allowHtml = false } = options;

    // 处理多行消息
    const messageHtml = String(message).split('\n').map(line => {
        return `<div class="dialog-message-line">${allowHtml ? line : escapeHtml(line)}</div>`;
    }).join('');

    const overlay = document.createElement('div');
    overlay.className = 'custom-dialog-overlay';
    overlay.innerHTML = `
        <div class="custom-dialog" role="alertdialog" aria-labelledby="customDialogTitle">
            <div class="custom-dialog-header" style="background: ${config.color}">
                <span class="custom-dialog-icon">${config.icon}</span>
                <span class="custom-dialog-title" id="customDialogTitle">${config.title}</span>
            </div>
            <div class="custom-dialog-body">
                ${messageHtml}
            </div>
            <div class="custom-dialog-footer">
                <button class="custom-dialog-btn custom-dialog-btn-primary" data-action="ok" style="background: ${config.color}">确定</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // 触发动画
    requestAnimationFrame(() => {
        overlay.classList.add('show');
    });

    const closeDialog = () => {
        overlay.classList.remove('show');
        setTimeout(() => {
            overlay.remove();
            if (callback) callback();
        }, 200);
    };

    overlay.querySelector('[data-action="ok"]').addEventListener('click', closeDialog);
    // 点击遮罩不关闭，避免误操作

    // ESC 关闭
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeDialog();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// 自定义确认弹窗（替代 confirm）
function customConfirm(message, onConfirm = null, onCancel = null, options = {}) {
    const {
        title = '确认',
        confirmText = '确定',
        cancelText = '取消',
        type = 'question',
        danger = false,
        customContent = false
    } = options;

    const typeConfig = {
        question: { icon: '❓', color: '#9C27B0' },
        warning:  { icon: '⚠️', color: '#FF9800' },
        danger:   { icon: '⚠️', color: '#F44336' },
        info:     { icon: 'ℹ️', color: '#2196F3' }
    };
    const config = typeConfig[type] || typeConfig.question;
    const confirmColor = danger ? '#F44336' : config.color;

    // 处理消息内容
    const messageHtml = customContent 
        ? message  // 自定义内容不转义，直接使用
        : String(message).split('\n').map(line => {
            return `<div class="dialog-message-line">${escapeHtml(line)}</div>`;
        }).join('');

    const overlay = document.createElement('div');
    overlay.className = 'custom-dialog-overlay';
    overlay.innerHTML = `
        <div class="custom-dialog" role="alertdialog" aria-labelledby="customDialogTitle2">
            <div class="custom-dialog-header" style="background: ${config.color}">
                <span class="custom-dialog-icon">${config.icon}</span>
                <span class="custom-dialog-title" id="customDialogTitle2">${escapeHtml(title)}</span>
            </div>
            <div class="custom-dialog-body">
                ${messageHtml}
            </div>
            <div class="custom-dialog-footer">
                <button class="custom-dialog-btn custom-dialog-btn-secondary" data-action="cancel">${escapeHtml(cancelText)}</button>
                <button class="custom-dialog-btn custom-dialog-btn-primary" data-action="confirm" style="background: ${confirmColor}">${escapeHtml(confirmText)}</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.classList.add('show');
    });

    const closeDialog = (result) => {
        overlay.classList.remove('show');
        setTimeout(() => {
            overlay.remove();
            if (result && onConfirm) onConfirm();
            if (!result && onCancel) onCancel();
        }, 200);
    };

    overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => closeDialog(true));
    overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => closeDialog(false));

    // ESC 取消
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeDialog(false);
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    // 聚焦到确认按钮
    setTimeout(() => {
        overlay.querySelector('[data-action="confirm"]').focus();
    }, 100);
}

// 轻量级 toast 提示（推荐用于成功/简单提示）
function showToast(message, type = 'info', duration = 2500) {
    const typeConfig = {
        info:    { icon: 'ℹ️', color: '#2196F3' },
        success: { icon: '✅', color: '#4CAF50' },
        warning: { icon: '⚠️', color: '#FF9800' },
        error:   { icon: '❌', color: '#F44336' }
    };
    const config = typeConfig[type] || typeConfig.info;

    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.style.borderLeftColor = config.color;
    toast.innerHTML = `
        <span class="custom-toast-icon">${config.icon}</span>
        <span class="custom-toast-message">${escapeHtml(String(message))}</span>
    `;

    // 多个 toast 堆叠
    const existing = document.querySelectorAll('.custom-toast');
    const top = 20 + existing.length * 60;
    toast.style.top = top + 'px';

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// HTML 转义
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// 同步风格的 confirm（用于替代需要立即返回值的场景）
// 由于原生 confirm 被禁用，这里使用 Promise 风格
window.customConfirmAsync = function(message, options = {}) {
    return new Promise((resolve) => {
        customConfirm(message, () => resolve(true), () => resolve(false), options);
    });
};

// 自定义输入弹窗（替代原生 prompt）
function customPrompt(message, defaultValue = '', options = {}) {
    return new Promise((resolve) => {
        const {
            title = '输入',
            placeholder = '',
            type = 'text',
            validate = null,
            cancelText = '取消',
            confirmText = '确定'
        } = options;

        const overlay = document.createElement('div');
        overlay.className = 'custom-dialog-overlay';
        overlay.innerHTML = `
            <div class="custom-dialog custom-dialog-prompt" role="dialog" aria-labelledby="customPromptTitle">
                <div class="custom-dialog-header" style="background: #667eea">
                    <span class="custom-dialog-icon">📝</span>
                    <span class="custom-dialog-title" id="customPromptTitle">${escapeHtml(title)}</span>
                </div>
                <div class="custom-dialog-body">
                    <div class="dialog-message-line">${escapeHtml(String(message))}</div>
                    <input 
                        type="${type}" 
                        class="custom-dialog-input" 
                        placeholder="${escapeHtml(placeholder)}" 
                        value="${escapeHtml(defaultValue)}"
                        autocomplete="off"
                    />
                </div>
                <div class="custom-dialog-footer">
                    <button class="custom-dialog-btn custom-dialog-btn-secondary" data-action="cancel">${escapeHtml(cancelText)}</button>
                    <button class="custom-dialog-btn custom-dialog-btn-primary" data-action="confirm" style="background: #667eea">${escapeHtml(confirmText)}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.classList.add('show');
            // 聚焦输入框
            const input = overlay.querySelector('.custom-dialog-input');
            input.focus();
            input.select();
        });

        const closeDialog = (result) => {
            overlay.classList.remove('show');
            setTimeout(() => {
                overlay.remove();
                resolve(result);
            }, 200);
        };

        const handleConfirm = () => {
            const input = overlay.querySelector('.custom-dialog-input');
            const value = input.value;
            
            if (validate && !validate(value)) {
                input.classList.add('error');
                return;
            }
            
            closeDialog(value);
        };

        overlay.querySelector('[data-action="confirm"]').addEventListener('click', handleConfirm);
        overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => closeDialog(null));

        // Enter 确认，ESC 取消
        const keyHandler = (e) => {
            if (e.key === 'Enter') {
                handleConfirm();
            } else if (e.key === 'Escape') {
                closeDialog(null);
                document.removeEventListener('keydown', keyHandler);
            }
        };
        document.addEventListener('keydown', keyHandler);
    });
}
