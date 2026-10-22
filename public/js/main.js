// Main JavaScript file for Exam System

document.addEventListener('DOMContentLoaded', function() {
    // Auto-fade alert banners after 5 seconds
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 150);
        }, 5000);
    });

    // Confirm form submissions for marked forms
    const confirmForms = document.querySelectorAll('[data-confirm]');
    confirmForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!confirm(this.dataset.confirm)) {
                e.preventDefault();
            }
        });
    });

    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Collapsible Sidebar Script with LocalStorage Persistence
    (function() {
        const sidebar = document.getElementById('globalSidebar');
        const collapseBtn = document.getElementById('sidebarCollapseBtn');
        const backdrop = document.getElementById('sidebarBackdrop');
        const body = document.body;

        if (!sidebar || !collapseBtn) return;

        // Restore sidebar collapse state from localStorage
        const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
        if (isCollapsed && window.innerWidth > 991) {
            sidebar.classList.add('collapsed');
            body.classList.add('sidebar-collapsed');
        }

        function toggleSidebar() {
            if (window.innerWidth <= 991) {
                // Mobile Drawer Mode
                const isActive = sidebar.classList.toggle('active');
                if (backdrop) {
                    backdrop.classList.toggle('active', isActive);
                }
            } else {
                // Desktop Collapse Mode
                const collapsed = sidebar.classList.toggle('collapsed');
                body.classList.toggle('sidebar-collapsed', collapsed);
                localStorage.setItem('sidebar-collapsed', collapsed);
                dispatchLayoutResize();
            }
        }

        collapseBtn.addEventListener('click', toggleSidebar);

        if (backdrop) {
            backdrop.addEventListener('click', () => {
                sidebar.classList.remove('active');
                backdrop.classList.remove('active');
            });
        }

        sidebar.querySelectorAll('.sidebar-menu a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 991) {
                    sidebar.classList.remove('active');
                    if (backdrop) backdrop.classList.remove('active');
                }
            });
        });

        function dispatchLayoutResize() {
            window.dispatchEvent(new Event('resize'));
        }

        // Close mobile drawer on resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 991) {
                sidebar.classList.remove('active');
                if (backdrop) backdrop.classList.remove('active');
                
                // apply desktop collapsed class if persistent
                const desktopCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
                sidebar.classList.toggle('collapsed', desktopCollapsed);
                body.classList.toggle('sidebar-collapsed', desktopCollapsed);
            } else {
                sidebar.classList.remove('collapsed');
                body.classList.remove('sidebar-collapsed');
            }
        });
    })();

    // Autosave grading on admin report detail
    (function() {
        const answerBlocks = document.querySelectorAll('[data-answer-block]');
        if (!answerBlocks.length) return;
        const totalScoreEl = document.getElementById('submission-total-score');
        const submissionId = totalScoreEl ? totalScoreEl.getAttribute('data-submission-id') : null;
        if (!submissionId) return;

        function updateCorrectBadge(block, isCorrect) {
            const badge = block.querySelector('[data-answer-correct]');
            if (!badge) return;
            badge.textContent = isCorrect ? 'Correct' : 'Wrong';
            badge.classList.toggle('bg-success', !!isCorrect);
            badge.classList.toggle('bg-danger', !isCorrect);
        }

        function debounce(fn, ms) {
            let t;
            return function(...args) {
                clearTimeout(t);
                t = setTimeout(() => fn.apply(this, args), ms);
            };
        }

        async function sendUpdate(index, payload, block) {
            try {
                const res = await fetch(`/admin/exam-reports/${submissionId}/answers/${index}`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-Token': document.querySelector('input[name="_csrf"]')?.value || ''
                    },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data && data.ok) {
                    if (typeof data.score === 'number' && totalScoreEl) {
                        totalScoreEl.textContent = data.score;
                    }
                    if ('isCorrect' in data) updateCorrectBadge(block, data.isCorrect);
                }
            } catch (e) {
                console.error('Autosave grading error:', e);
            }
        }

        answerBlocks.forEach(block => {
            const idx = block.getAttribute('data-answer-index');
            const scoreInput = block.querySelector('[data-autosave-score]');

            if (scoreInput) {
                const debounced = debounce(() => {
                    const val = scoreInput.value;
                    if (val === '' || val === null) return;
                    sendUpdate(idx, { manualScore: val }, block);
                }, 400);
                scoreInput.addEventListener('input', debounced);
                scoreInput.addEventListener('change', () => sendUpdate(idx, { manualScore: scoreInput.value }, block));
            }
        });
    })();

    // Dark Mode Toggle Listener
    (function() {
        const darkModeBtn = document.getElementById('darkModeToggleBtn');
        if (!darkModeBtn) return;
        
        function updateIcon() {
            const isDark = document.body.classList.contains('dark-theme');
            darkModeBtn.innerHTML = isDark ? 
                '<i class="bi bi-moon-stars-fill fs-5 text-warning"></i>' : 
                '<i class="bi bi-sun-fill fs-5 text-secondary"></i>';
        }
        
        updateIcon();
        
        darkModeBtn.addEventListener('click', () => {
            const darkActive = document.body.classList.toggle('dark-theme');
            document.documentElement.classList.toggle('dark-theme', darkActive);
            localStorage.setItem('theme', darkActive ? 'dark' : 'light');
            updateIcon();
        });
    })();

    // Sidebar Active State Sync for dynamic tabs (Student panel hash navigation)
    (function() {
        function syncSidebarActiveState() {
            const hash = window.location.hash || '#dashboard';
            const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
            sidebarLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (href) {
                    if (href.includes('my-results') && window.location.pathname.includes('my-results')) {
                        link.classList.add('active');
                    } else if (href.includes(hash)) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                }
            });
        }
        
        if (document.querySelector('.admin-sidebar')) {
            window.addEventListener('hashchange', syncSidebarActiveState);
            syncSidebarActiveState();
        }
    })();
});

// Loading state utilities
function showLoading(element) {
    element.disabled = true;
    element.innerHTML = '<span class="loading"></span> Loading...';
}

function hideLoading(element, originalText) {
    element.disabled = false;
    element.innerHTML = originalText;
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}