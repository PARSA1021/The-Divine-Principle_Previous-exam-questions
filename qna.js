/**
 * QnA 상수 정의
 */
const QNA_CONFIG = {
    ITEMS_PER_PAGE: 10,
    NOTIFICATION_DURATION: 3000,
    MAX_VISIBLE_PAGES: 5,
    DATA_FILE: 'qna_data_2.json',
    STRINGS: {
        LOADING: '로드 중...',
        ERROR: '질문 데이터를 불러오지 못했습니다. 나중에 다시 시도해주세요.',
        NO_RESULTS: '검색 결과가 없습니다.',
        COPY_SUCCESS: '클립보드에 질문과 답변이 복사되었습니다! ✨',
        COPY_ERROR: '복사에 실패했습니다. 다시 시도해주세요. 😔',
        ALL: '전체'
    }
};

const STYLES = {
    questionNumber: `
        font-weight: 700;
        color: #3B82F6;
        margin-right: 8px;
        background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
        padding: 4px 10px;
        border-radius: 8px;
        font-size: 0.9rem;
        border: 1px solid rgba(59, 130, 246, 0.2);
        box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
    `,
    pagination: `
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 12px;
        margin: 3rem auto 2rem;
        flex-wrap: wrap;
        max-width: 52rem;
        padding: 2rem 1rem;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(249, 250, 251, 0.95) 100%);
        border-radius: 20px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.06);
        border: 1px solid rgba(229, 231, 235, 0.8);
        backdrop-filter: blur(10px);
        animation: fadeIn 0.8s ease-out;
    `,
    pageBtn: (isActive, isDisabled) => `
        padding: ${isDisabled ? '12px 20px' : '10px 16px'};
        border: 2px solid ${isDisabled ? '#E5E7EB' : isActive ? '#3B82F6' : '#E5E7EB'};
        background: ${isDisabled ? '#F9FAFB' : isActive ? 'linear-gradient(135deg, #3B82F6 0%, #6B7280 100%)' : '#FFFFFF'};
        color: ${isDisabled ? '#9CA3AF' : isActive ? '#FFFFFF' : '#374151'};
        cursor: ${isDisabled ? 'not-allowed' : 'pointer'};
        border-radius: ${isDisabled ? '12px' : '10px'};
        font-weight: ${isActive ? '700' : '600'};
        font-size: 0.95rem;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: ${isDisabled ? 'none' : isActive ? '0 4px 12px rgba(59, 130, 246, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.06)'};
        ${!isDisabled ? 'min-width: 44px; display: flex; align-items: center; justify-content: center;' : ''}
        opacity: ${isDisabled ? '0.6' : '1'};
        transform: ${isActive ? 'translateY(-1px) scale(1.05)' : 'translateY(0)'};
    `,
    pageInfo: `
        font-size: 0.95rem;
        color: #6B7280;
        font-weight: 600;
        margin-left: 20px;
        padding: 12px 20px;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(249, 250, 251, 0.95) 100%);
        border-radius: 12px;
        border: 1px solid rgba(229, 231, 235, 0.8);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        backdrop-filter: blur(5px);
        letter-spacing: 0.02em;
        white-space: nowrap;
    `
};

/**
 * 전역 상태
 */
let qnaData = [];
let currentPage = 1;

/**
 * DOM 캐싱
 */
const getQnAElements = () => ({
    list: document.getElementById('qna-list'),
    pagination: document.getElementById('pagination'),
    searchInput: document.getElementById('search-input'),
    filterButtons: document.querySelectorAll('.qna-filter button')
});

let QNA_DOM = {};

/**
 * 데이터 로드
 */
const fetchQnA = async () => {
    const listEl = QNA_DOM.list;
    if (!listEl) return;

    listEl.innerHTML = `<p class="loading">${QNA_CONFIG.STRINGS.LOADING}</p>`;
    
    try {
        const response = await fetch(QNA_CONFIG.DATA_FILE, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        qnaData = await response.json();
        if (!Array.isArray(qnaData) || qnaData.length === 0) {
            throw new Error(QNA_CONFIG.STRINGS.NO_RESULTS);
        }
        
        renderQnA();
    } catch (error) {
        console.error('Failed to fetch Q&A data:', error);
        listEl.innerHTML = `<p class="error">${QNA_CONFIG.STRINGS.ERROR}</p>`;
    }
};

/**
 * 텍스트 정제
 */
const cleanText = (text, patterns = []) => {
    let cleaned = text;
    patterns.forEach(pattern => {
        cleaned = cleaned.replace(new RegExp(pattern, 'gu'), '');
    });
    return cleaned.trim();
};

const extractQnAText = (card) => ({
    question: cleanText(
        card.querySelector('.question').textContent,
        ['^\\d+\\.', '질문 펼치기:', '질문과 답변 복사:', '[\\u{1F4AD}\\u{2753}\\u{2754}]']
    ),
    answer: cleanText(
        card.querySelector('.answer').textContent,
        ['[\\u{1F4AC}\\u{1F4DD}]']
    ),
    category: cleanText(card.querySelector('.category-label').textContent, [])
});

/**
 * 알림 표시
 */
const showNotification = (message, type = 'success') => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'assertive');
    notification.textContent = message;

    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: '1000',
        padding: '12px 20px',
        borderRadius: '8px',
        color: 'white',
        backgroundColor: type === 'success' ? '#28a745' : '#dc3545',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        transition: 'all 0.3s ease-in-out',
        opacity: '0',
        transform: 'translateY(-10px)'
    });

    document.body.appendChild(notification);

    requestAnimationFrame(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-10px)';
        setTimeout(() => notification.remove(), 300);
    }, QNA_CONFIG.NOTIFICATION_DURATION);
};

/**
 * 필터링 및 검색
 */
const getFilteredData = (category = QNA_CONFIG.STRINGS.ALL, searchQuery = '') => {
    let filtered = category === QNA_CONFIG.STRINGS.ALL ? qnaData : 
        qnaData.filter(q => q.category === category);

    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(q =>
            q.question.toLowerCase().includes(query) ||
            q.answer.toLowerCase().includes(query)
        );
    }

    return filtered;
};

/**
 * QnA 렌더링
 */
const renderQnA = (category = QNA_CONFIG.STRINGS.ALL, searchQuery = '') => {
    const listEl = QNA_DOM.list;
    if (!listEl) return;

    const filtered = getFilteredData(category, searchQuery);
    const totalPages = Math.ceil(filtered.length / QNA_CONFIG.ITEMS_PER_PAGE);

    // 현재 페이지 조정
    if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
    } else if (totalPages === 0) {
        currentPage = 1;
    }

    const start = (currentPage - 1) * QNA_CONFIG.ITEMS_PER_PAGE;
    const end = start + QNA_CONFIG.ITEMS_PER_PAGE;
    const paginated = filtered.slice(start, end);

    if (paginated.length > 0) {
        listEl.innerHTML = paginated.map((q, index) => `
            <div class="qna-card" role="listitem" aria-expanded="false" data-index="${start + index + 1}">
                <div class="question" role="button" tabindex="0" aria-label="질문 펼치기: ${q.question}">
                    <span class="question-number" style="${STYLES.questionNumber}">${start + index + 1}.</span>
                    <i class="fas fa-question-circle"></i> ${q.question}
                    <button class="copy-btn" aria-label="질문과 답변 복사: ${q.question}" title="질문과 답변 복사">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
                <div class="answer"><i class="fas fa-comment-dots"></i> ${q.answer}</div>
                <div class="category-label">${q.category}</div>
            </div>
        `).join('');
    } else {
        listEl.innerHTML = `<p class="no-results">${QNA_CONFIG.STRINGS.NO_RESULTS}</p>`;
    }

    renderPagination(totalPages, filtered.length);
    addEventListeners();
};

/**
 * 페이지네이션 렌더링
 */
const createPageButton = (pageNum, isActive, isDisabled, onClick) => {
    const btn = document.createElement('button');
    btn.className = `page-btn ${isActive ? 'active' : ''}`;
    btn.textContent = pageNum;
    btn.onclick = onClick;
    btn.disabled = isDisabled;
    btn.style.cssText = STYLES.pageBtn(isActive, isDisabled);
    
    if (!isDisabled && !isActive) {
        btn.onmouseover = () => {
            btn.style.borderColor = '#3B82F6';
            btn.style.background = '#EFF6FF';
            btn.style.transform = 'translateY(-2px)';
            btn.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)';
        };
        btn.onmouseout = () => {
            btn.style.borderColor = '#E5E7EB';
            btn.style.background = '#FFFFFF';
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
        };
    }
    
    return btn;
};

const renderPagination = (totalPages, totalItems) => {
    let paginationEl = QNA_DOM.pagination;
    
    if (!paginationEl) {
        paginationEl = document.createElement('div');
        paginationEl.id = 'pagination';
        paginationEl.style.cssText = STYLES.pagination;
        const listEl = QNA_DOM.list;
        if (listEl?.parentNode) {
            listEl.parentNode.insertBefore(paginationEl, listEl.nextSibling);
        }
        QNA_DOM.pagination = paginationEl;
    }

    if (totalPages <= 1) {
        paginationEl.style.display = 'none';
        return;
    }

    paginationEl.style.display = 'flex';
    paginationEl.innerHTML = '';

    // 이전 페이지 버튼
    const prevBtn = createPageButton('이전', false, currentPage === 1, 
        () => changePage(currentPage - 1));
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> 이전';
    paginationEl.appendChild(prevBtn);

    // 페이지 번호
    const startPage = Math.max(1, currentPage - Math.floor(QNA_CONFIG.MAX_VISIBLE_PAGES / 2));
    const endPage = Math.min(totalPages, startPage + QNA_CONFIG.MAX_VISIBLE_PAGES - 1);
    const adjustedStart = Math.max(1, endPage - QNA_CONFIG.MAX_VISIBLE_PAGES + 1);

    if (adjustedStart > 1) {
        paginationEl.appendChild(createPageButton(1, false, false, () => changePage(1)));
        if (adjustedStart > 2) {
            const dots = document.createElement('span');
            dots.className = 'page-dots';
            dots.textContent = '⋯';
            dots.style.cssText = 'padding: 12px 8px; color: #6B7280; font-weight: 600; font-size: 1.1rem;';
            paginationEl.appendChild(dots);
        }
    }

    for (let i = adjustedStart; i <= endPage; i++) {
        paginationEl.appendChild(
            createPageButton(i, i === currentPage, false, () => changePage(i))
        );
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const dots = document.createElement('span');
            dots.className = 'page-dots';
            dots.textContent = '⋯';
            dots.style.cssText = 'padding: 12px 8px; color: #6B7280; font-weight: 600; font-size: 1.1rem;';
            paginationEl.appendChild(dots);
        }
        paginationEl.appendChild(createPageButton(totalPages, false, false, () => changePage(totalPages)));
    }

    // 다음 페이지 버튼
    const nextBtn = createPageButton('다음', false, currentPage === totalPages, 
        () => changePage(currentPage + 1));
    nextBtn.innerHTML = '다음 <i class="fas fa-chevron-right"></i>';
    paginationEl.appendChild(nextBtn);

    // 페이지 정보
    const startItem = (currentPage - 1) * QNA_CONFIG.ITEMS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * QNA_CONFIG.ITEMS_PER_PAGE, totalItems);
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'page-info';
    infoDiv.style.cssText = STYLES.pageInfo;
    infoDiv.innerHTML = `
        <i class="fas fa-info-circle" style="color: #3B82F6; margin-right: 8px;"></i>
        ${startItem}-${endItem} / 이 <span style="color: #3B82F6; font-weight: 700;">${totalItems}</span>개 
        <span style="color: #9CA3AF; margin: 0 8px;">•</span>
        <span style="color: #3B82F6; font-weight: 700;">${currentPage}</span>/${totalPages} 페이지
    `;
    paginationEl.appendChild(infoDiv);
};

/**
 * 페이지 변경
 */
const changePage = (page) => {
    const category = document.querySelector('.qna-filter button.active')?.dataset.category || QNA_CONFIG.STRINGS.ALL;
    const searchQuery = QNA_DOM.searchInput?.value || '';

    const filtered = getFilteredData(category, searchQuery);
    const totalPages = Math.ceil(filtered.length / QNA_CONFIG.ITEMS_PER_PAGE);

    if (page < 1 || page > totalPages || page === currentPage) return;

    currentPage = page;
    renderQnA(category, searchQuery);

    QNA_DOM.list?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/**
 * 이벤트 리스너
 */
const addEventListeners = () => {
    const listEl = QNA_DOM.list;
    if (!listEl) return;

    // 질문 클릭 이벤트
    listEl.querySelectorAll('.qna-card .question').forEach(question => {
        const handler = (e) => {
            if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
            if (e.type === 'keydown') e.preventDefault();
            
            const card = question.closest('.qna-card');
            const isExpanded = card.getAttribute('aria-expanded') === 'true';
            card.setAttribute('aria-expanded', !isExpanded);
        };

        question.removeEventListener('click', handler);
        question.removeEventListener('keydown', handler);
        question.addEventListener('click', handler);
        question.addEventListener('keydown', handler);
    });

    // 복사 버튼 이벤트
    listEl.querySelectorAll('.copy-btn').forEach(btn => {
        const handler = (e) => {
            e.stopPropagation();
            const card = btn.closest('.qna-card');
            const { question, answer, category } = extractQnAText(card);
            const questionNumber = card.dataset.index;

            const copyText = `
---
📢 TruePath Q&A (${questionNumber}번)
---
🤔 질문: ${question}

💡 답변: ${answer}

🏷️ 카테고리: ${category}
---
`.trim();

            navigator.clipboard.writeText(copyText)
                .then(() => showNotification(QNA_CONFIG.STRINGS.COPY_SUCCESS, 'success'))
                .catch(() => showNotification(QNA_CONFIG.STRINGS.COPY_ERROR, 'error'));
        };

        btn.removeEventListener('click', handler);
        btn.addEventListener('click', handler);
    });
};

/**
 * 초기화
 */
const initializeQnA = () => {
    QNA_DOM = getQnAElements();
    if (!QNA_DOM.list) return;

    fetchQnA();

    // 필터 버튼
    QNA_DOM.filterButtons?.forEach(btn => {
        btn.addEventListener('click', () => {
            QNA_DOM.filterButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            currentPage = 1;
            renderQnA(btn.dataset.category, QNA_DOM.searchInput?.value || '');
        });
    });

    // 검색 입력
    if (QNA_DOM.searchInput) {
        const handler = (e) => {
            currentPage = 1;
            renderQnA(
                document.querySelector('.qna-filter button.active')?.dataset.category || QNA_CONFIG.STRINGS.ALL,
                e.target.value
            );
        };
        QNA_DOM.searchInput.removeEventListener('input', handler);
        QNA_DOM.searchInput.addEventListener('input', handler);
    }

    // 키보드 네비게이션
    const keyHandler = (e) => {
        if (e.target.tagName === 'INPUT') return;

        const category = document.querySelector('.qna-filter button.active')?.dataset.category || QNA_CONFIG.STRINGS.ALL;
        const searchQuery = QNA_DOM.searchInput?.value || '';
        const filtered = getFilteredData(category, searchQuery);
        const totalPages = Math.ceil(filtered.length / QNA_CONFIG.ITEMS_PER_PAGE);

        if (e.key === 'ArrowLeft' && currentPage > 1) {
            changePage(currentPage - 1);
        } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
            changePage(currentPage + 1);
        }
    };

    document.removeEventListener('keydown', keyHandler);
    document.addEventListener('keydown', keyHandler);
};

document.addEventListener('DOMContentLoaded', initializeQnA);