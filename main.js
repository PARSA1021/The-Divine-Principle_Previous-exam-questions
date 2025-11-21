/**
 * 애플리케이션 상수 정의
 */
const CONSTANTS = {
    RESULTS_PER_PAGE: 10,
    DEBOUNCE_DELAY: 300,
    TOAST_DURATION: 3000,
    ACCOUNT_NUMBER: '02060204230715',
    ACCOUNT_HOLDER: '국민은행 020602-04-230715 (예금주: 문성민)',
    PAGES: { HOME: 'home', WORKBOOK: 'workbook', QUIZ_SELECTION: 'quiz-selection' },
    MAX_TEXT_LENGTH: 1000,
    MAX_PREVIEW_LENGTH: 150,
    MAX_SEARCH_HISTORY: 10,
    SCROLL_DURATION: 600,
    HEADER_OFFSET: 80,
    SORT_ORDER: { DEFAULT: 'default', LENGTH_ASC: 'length_asc', LENGTH_DESC: 'length_desc' },
    STORAGE: { LAST_MESSAGE_COUNT: 'lastMessageCount', NEW_MESSAGES: 'newlyAddedMessages' }
};

const CATEGORIES = {
    ALL: '전체', CHEON_SEONG_GYEONG: '천성경', CHAM_BUMO_GYEONG: '참부모경',
    CHAM_BUMO_NIM: '참부모님 말씀', CHAM_EOMEONIM: '참어머님 말씀',
    CHEON_SHIM_WON: '천심원', TRUE_FATHER_PRAYER: '참아버님 기도문',
    THE_WILL_ROAD: '뜻 길', THE_CHEON_IL_GUK_WILL_ROAD: '천일국시대 뜻 길',
    COLLECTED_SERMONS: '말씀선 집', A_PEACE_LOVING_GLOBAL_CITIZEN: '평화를 사랑하는 세계인으로',
    MOTHER_OF_PEACE: '평화의 어머니', PYEONG_HWA_GYEONG: '평화경'
};

const QUIZ_TYPES = { DIVINE_PRINCIPLE: '원리강론', BIBLE: '성경' };

const QUIZ_PAGES = {
    [QUIZ_TYPES.DIVINE_PRINCIPLE]: 'divine.html',
    [QUIZ_TYPES.BIBLE]: 'bible.html'
};

/**
 * 전역 상태 관리
 */
const state = {
    messages: [],
    currentCategory: localStorage.getItem('currentCategory') || CATEGORIES.ALL,
    searchHistory: JSON.parse(localStorage.getItem('searchHistory')) || [],
    currentPage: 1,
    currentSortOrder: CONSTANTS.SORT_ORDER.DEFAULT,
    newlyAddedMessages: JSON.parse(sessionStorage.getItem(CONSTANTS.STORAGE.NEW_MESSAGES)) || []
};

/**
 * DOM 캐싱 (필요한 것만 선택)
 */
const getDOMElements = () => ({
    searchInput: document.getElementById('search-input'),
    searchResults: document.getElementById('search-results'),
    searchStats: document.getElementById('search-stats'),
    searchLoading: document.getElementById('search-loading'),
    searchSuggestions: document.getElementById('search-suggestions'),
    progressBar: document.querySelector('.progress-bar div'),
    categoryButtons: document.querySelectorAll('.category-container button'),
    navButtons: document.querySelectorAll('.nav-bar button[data-page]'),
    backToTop: document.querySelector('.back-to-top'),
    clearSearch: document.getElementById('clear-search'),
    sortSelect: document.getElementById('sort-select'),
    randomMessageButton: document.getElementById('random-message-button'),
    quizButtons: document.querySelectorAll('.quiz-selection-container button'),
    homePageButtonsContainer: document.getElementById('home-page-buttons')
});

let DOM = {};

/**
 * 유틸리티 함수
 */
const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

const updateProgressBar = (percentage, resetDelay) => {
    if (DOM.progressBar) {
        DOM.progressBar.style.width = percentage;
        if (resetDelay) {
            setTimeout(() => { DOM.progressBar.style.width = '0'; }, resetDelay);
        }
    }
};

const smoothScroll = (targetY, duration) => {
    const startY = window.scrollY;
    const distance = targetY - startY;
    const startTime = performance.now();
    const easeInOutQuad = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    const animation = currentTime => {
        const progress = Math.min((currentTime - startTime) / duration, 1);
        window.scrollTo(0, startY + distance * easeInOutQuad(progress));
        if (progress < 1) requestAnimationFrame(animation);
    };
    requestAnimationFrame(animation);
};

const smoothScrollTo = (target, duration) => {
    let targetY = typeof target === 'number' ? target :
        target instanceof HTMLElement ? target.getBoundingClientRect().top + window.scrollY - CONSTANTS.HEADER_OFFSET : 0;
    if (targetY) smoothScroll(targetY, duration);
};

const scrollToTop = () => smoothScrollTo(0, CONSTANTS.SCROLL_DURATION);
const scrollToResultsTop = () => DOM.searchResults && smoothScrollTo(DOM.searchResults, CONSTANTS.SCROLL_DURATION);

const toggleDarkMode = () => {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
};

/**
 * 복사 기능
 */
const copyToClipboard = async (text, message) => {
    try {
        await navigator.clipboard.writeText(text);
        showToast(message);
        return true;
    } catch (err) {
        console.error('복사 실패:', err);
        return false;
    }
};

const copyAccountNumber = async () => {
    const success = await copyToClipboard(CONSTANTS.ACCOUNT_NUMBER, '계좌번호가 복사되었습니다!');
    if (!success) {
        showToast(`계좌번호 복사 실패: ${CONSTANTS.ACCOUNT_HOLDER}. 직접 복사해주세요.`);
    }
};

const extractTextElements = (element) => ({
    text: element.querySelector('.full-text')?.innerText ||
           element.querySelector('.truncated-text')?.innerText ||
           element.querySelector('p')?.innerText || '',
    source: element.querySelector('.source')?.innerText || '',
    category: element.querySelector('h3')?.innerText || ''
});

const formatMessageForClipboard = (text, source, category) => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return `[말씀 공유] 📖
───────────────────
📅 ${today}

💬 말씀:
"${text}"

📚 출처 정보
- 카테고리: ${category.replace(/<span.*?>NEW<\/span>/i, '').trim()}
- 출처: ${source}
───────────────────`;
};

const copyMessageToClipboard = async (text, source, category, element) => {
    const extracted = extractTextElements(element);
    const finalMessage = formatMessageForClipboard(extracted.text || text, extracted.source || source, extracted.category || category);

    const success = await copyToClipboard(finalMessage, '✅ 현재 화면에 보이는 번역 텍스트가 클립보드에 복사되었습니다!');
    
    if (success && element) {
        element.classList.add('copied');
        setTimeout(() => element.classList.remove('copied'), 1000);
    } else if (!success) {
        showToast('❌ 복사에 실패했어요. 직접 선택해서 복사해주세요.');
    }
};

/**
 * 토스트 메시지
 */
const showToast = (message) => {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${message}</span><button class="close-toast" aria-label="알림 닫기">✕</button>`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');

    const closeToast = () => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    };

    toast.addEventListener('click', closeToast);
    toast.querySelector('.close-toast').addEventListener('click', e => {
        e.stopPropagation();
        closeToast();
    });

    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(closeToast, CONSTANTS.TOAST_DURATION);
};

/**
 * 새 메시지 감지
 */
const checkForNewMessages = (newMessages) => {
    const lastCount = parseInt(localStorage.getItem(CONSTANTS.STORAGE.LAST_MESSAGE_COUNT) || '0', 10);
    const newCount = newMessages.length;

    if (newCount === lastCount || lastCount === 0) {
        localStorage.setItem(CONSTANTS.STORAGE.LAST_MESSAGE_COUNT, newCount.toString());
        return;
    }

    const addedCount = newCount - lastCount;
    if (newCount > lastCount) {
        showToast(`🎉 새로운 말씀 ${addedCount}개가 추가되었습니다!`);
        state.newlyAddedMessages = newMessages.slice(lastCount, newCount);
        sessionStorage.setItem(CONSTANTS.STORAGE.NEW_MESSAGES, JSON.stringify(state.newlyAddedMessages));
        renderNewMessageButton(addedCount);
    } else {
        showToast(`⚠️ 말씀 ${lastCount - newCount}개가 삭제되거나 변경되었습니다.`);
    }

    localStorage.setItem(CONSTANTS.STORAGE.LAST_MESSAGE_COUNT, newCount.toString());
};

const renderNewMessageButton = (count) => {
    if (!DOM.homePageButtonsContainer || count <= 0) return;

    document.getElementById('view-new-messages-button')?.remove();

    const button = document.createElement('button');
    button.id = 'view-new-messages-button';
    button.className = 'quiz-button blue fade-in';
    button.style.marginBottom = '20px';
    button.innerHTML = `<i class="fas fa-magic" aria-hidden="true"></i> 새 말씀 ${count}개 확인하기`;
    button.onclick = showNewMessagesPage;
    button.setAttribute('aria-label', `새롭게 추가된 말씀 ${count}개 확인`);

    DOM.homePageButtonsContainer.insertAdjacentElement('afterbegin', button);
};

/**
 * 텍스트 처리
 */
const truncateTextForPreview = (text) => {
    const clean = text.replace(/<br\s*\/?>/gi, ' ').trim();
    if (clean.length <= CONSTANTS.MAX_PREVIEW_LENGTH) return clean;

    let truncated = clean.substring(0, CONSTANTS.MAX_PREVIEW_LENGTH);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 0) truncated = truncated.substring(0, lastSpace);
    return `${truncated}...`;
};

const highlightText = (text, query) => {
    if (!query) return text;
    try {
        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        return text.replace(regex, match => `<span class="highlight">${match}</span>`);
    } catch (e) {
        console.warn('유효하지 않은 정규식 쿼리:', e);
        return text;
    }
};

const truncateText = (text, query) => {
    if (text.length <= CONSTANTS.MAX_TEXT_LENGTH) {
        return highlightText(text, query);
    }
    return `
        <span class="truncated-text">${highlightText(text, query)}</span>
        <span class="full-text" style="display: none;">${highlightText(text, query)}</span>
        <button class="toggle-text" onclick="toggleText(this)" aria-expanded="false">전체 보기</button>
    `;
};

const toggleText = (button) => {
    const resultItem = button.closest('.result-item');
    if (!resultItem) return;

    const truncated = resultItem.querySelector('.truncated-text');
    const full = resultItem.querySelector('.full-text');
    const isExpanded = button.getAttribute('aria-expanded') === 'true';

    if (truncated) truncated.style.display = isExpanded ? 'inline' : 'none';
    if (full) full.style.display = isExpanded ? 'none' : 'inline';

    button.textContent = isExpanded ? '전체 보기' : '접기';
    button.setAttribute('aria-expanded', !isExpanded);
};

/**
 * 카테고리 결정
 */
const CATEGORY_KEYWORDS = [
    { key: '천성경', value: CATEGORIES.CHEON_SEONG_GYEONG },
    { key: '참부모경', value: CATEGORIES.CHAM_BUMO_GYEONG },
    { key: '평화경', value: CATEGORIES.PYEONG_HWA_GYEONG },
    { key: '참부모님 말씀', value: CATEGORIES.CHAM_BUMO_NIM },
    { key: '참어머님 말씀', value: CATEGORIES.CHAM_EOMEONIM },
    { key: '천심원', value: CATEGORIES.CHEON_SHIM_WON },
    { key: '참아버님 기도문', value: CATEGORIES.TRUE_FATHER_PRAYER },
    { key: '뜻 길', value: CATEGORIES.THE_WILL_ROAD },
    { key: '천일국시대 뜻 길', value: CATEGORIES.THE_CHEON_IL_GUK_WILL_ROAD },
    { key: '말씀선 집', value: CATEGORIES.COLLECTED_SERMONS },
    { key: '평화를 사랑하는 세계인으로', value: CATEGORIES.A_PEACE_LOVING_GLOBAL_CITIZEN },
    { key: '평화의 어머니', value: CATEGORIES.MOTHER_OF_PEACE }
];

const categorizeMessage = (source) => {
    return CATEGORY_KEYWORDS.find(cat => source.includes(cat.key))?.value || CATEGORIES.ALL;
};

/**
 * 검색 기록 관리
 */
const renderSearchSuggestions = () => {
    const query = DOM.searchInput.value.trim().toLowerCase();
    let html = '';

    if (query && state.searchHistory.length > 0) {
        html = state.searchHistory
            .filter(q => q.toLowerCase().includes(query))
            .map((q, i) => `
                <div class="suggestion" role="option" tabindex="0">
                    <span onclick="selectSuggestion('${q.replace(/'/g, "\\'")}')">${q}</span>
                    <button class="delete-suggestion" onclick="deleteSearchHistory(${i})" aria-label="검색 기록 삭제: ${q}">✕</button>
                </div>
            `).join('');
    }

    if (state.searchHistory.length > 0 && DOM.searchSuggestions) {
        html += `<div class="suggestion clear-all" role="button" tabindex="0" onclick="clearSearchHistory()" aria-label="모든 검색 기록 삭제">모든 검색 기록 삭제</div>`;
    }

    if (DOM.searchSuggestions) {
        DOM.searchSuggestions.innerHTML = html;
        const show = state.searchHistory.length > 0 && DOM.searchInput.value.trim() !== '';
        DOM.searchSuggestions.style.display = show ? 'block' : 'none';
        DOM.searchSuggestions.setAttribute('aria-hidden', !show);
        DOM.searchSuggestions.setAttribute('role', 'listbox');
    }
};

const deleteSearchHistory = (index) => {
    state.searchHistory.splice(index, 1);
    localStorage.setItem('searchHistory', JSON.stringify(state.searchHistory));
    renderSearchSuggestions();
    showToast('검색 기록이 삭제되었습니다.');
};

const clearSearchHistory = () => {
    state.searchHistory = [];
    localStorage.setItem('searchHistory', JSON.stringify(state.searchHistory));
    if (DOM.searchSuggestions) {
        DOM.searchSuggestions.style.display = 'none';
        DOM.searchSuggestions.setAttribute('aria-hidden', 'true');
    }
    showToast('모든 검색 기록이 삭제되었습니다.');
};

const selectSuggestion = (query) => {
    if (DOM.searchInput) {
        DOM.searchInput.value = query;
        DOM.searchInput.focus();
    }
    if (DOM.searchSuggestions) {
        DOM.searchSuggestions.style.display = 'none';
        DOM.searchSuggestions.setAttribute('aria-hidden', 'true');
    }
    searchMessages();
};

/**
 * 메시지 로드
 */
const loadMessages = async () => {
    if (DOM.searchLoading) DOM.searchLoading.style.display = 'flex';
    updateProgressBar('20%');

    try {
        const response = await fetch('messages.json', { cache: 'no-store' });
        updateProgressBar('60%');

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const newMessages = await response.json();
        checkForNewMessages(newMessages);

        state.messages = newMessages.map(msg => ({
            ...msg,
            category: msg.category || categorizeMessage(msg.source),
            textLength: msg.text.length
        }));

        updateProgressBar('100%');
    } catch (error) {
        console.error('메시지 로드 실패:', error);
        const errorMsg = error.message.includes('JSON') ?
            '데이터 형식이 잘못되었습니다. 관리자에게 문의하세요.' :
            '메시지 로드 실패. 네트워크를 확인하거나 나중에 다시 시도해주세요.';

        if (DOM.searchResults) {
            DOM.searchResults.innerHTML = `
                <p class="no-results" role="alert" style="text-align: center; padding: 20px;">
                    ${errorMsg}
                    <button onclick="loadMessages()" aria-label="다시 시도" class="quiz-button blue" style="margin-top: 15px;">
                        <i class="fas fa-sync-alt" aria-hidden="true"></i> 다시 시도
                    </button>
                </p>`;
            DOM.searchResults.style.display = 'block';
        }
        showToast(errorMsg);
    } finally {
        setTimeout(() => {
            if (DOM.searchLoading) DOM.searchLoading.style.display = 'none';
            updateProgressBar('0', 300);
        }, 300);
    }
};

/**
 * 새 메시지 페이지 표시
 */
const showNewMessagesPage = () => {
    showPage(CONSTANTS.PAGES.WORKBOOK);

    if (DOM.searchInput) DOM.searchInput.value = '';
    state.currentCategory = CATEGORIES.ALL;

    if (DOM.searchResults && DOM.searchStats) {
        DOM.searchStats.style.display = 'block';
        DOM.searchStats.innerHTML = `🌟 새롭게 추가된 말씀 ${state.newlyAddedMessages.length}개`;

        DOM.searchResults.innerHTML = state.newlyAddedMessages.map(msg => {
            const preview = truncateTextForPreview(msg.text);
            const fullText = `<span class="full-text" style="display: none;">${msg.text}</span>`;

            return `
                <div class="result-item new-message-item fade-in" role="listitem" tabindex="0" style="border-left: 5px solid var(--color-blue); margin-top: 10px;">
                    <h3><i class="fas fa-star" aria-hidden="true"></i> ${msg.category} <span class="new-tag">NEW</span></h3>
                    <p>
                        <span class="truncated-text">${preview}</span>
                        ${fullText}
                    </p>
                    <p class="source"><i class="fas fa-bookmark" aria-hidden="true"></i> ${msg.source}</p>
                    <div class="action-buttons">
                        <button class="copy-button" onclick="copyMessageToClipboard('${msg.text.replace(/'/g, "\\'").replace(/"/g, '\\"')}','${msg.source.replace(/'/g, "\\'").replace(/"/g, '\\"')}','${msg.category.replace(/'/g, "\\'").replace(/"/g, '\\"')}',this.closest('.result-item'))" aria-label="${msg.category} 말씀과 출처 복사">
                            <i class="fas fa-copy" aria-hidden="true"></i> 복사하기
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        DOM.searchResults.style.display = 'flex';
        scrollToResultsTop();
        document.getElementById('view-new-messages-button')?.remove();
    }
};

/**
 * 메시지 검색
 */
const searchMessages = debounce((page = 1) => {
    if (state.newlyAddedMessages.length > 0 && page === 1) {
        state.newlyAddedMessages = [];
        sessionStorage.removeItem(CONSTANTS.STORAGE.NEW_MESSAGES);
        document.getElementById('view-new-messages-button')?.remove();
    }

    const query = DOM.searchInput?.value.trim() || '';
    const searchType = document.querySelector('input[name="search-type"]:checked')?.value || 'message';

    if (DOM.searchLoading) DOM.searchLoading.style.display = 'flex';
    updateProgressBar('20%');
    if (DOM.searchResults) {
        DOM.searchResults.innerHTML = '';
        DOM.searchResults.style.display = 'none';
    }
    if (DOM.searchStats) DOM.searchStats.style.display = 'none';

    state.currentPage = page;
    let filtered = [...state.messages];

    if (state.currentCategory !== CATEGORIES.ALL) {
        filtered = filtered.filter(msg => msg.category === state.currentCategory);
    }

    if (query) {
        try {
            const queryRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

            filtered = filtered.map(msg => {
                let matchCount = 0;

                if (searchType === 'message') {
                    matchCount = (msg.text.match(queryRegex) || []).length;
                } else {
                    const cat = (msg.category.match(queryRegex) || []).length;
                    const src = (msg.source.match(queryRegex) || []).length;
                    matchCount = cat + src;
                }

                return { ...msg, matchCount };
            }).filter(msg => msg.matchCount > 0);

            filtered.sort((a, b) => b.matchCount - a.matchCount);

            if (query && !state.searchHistory.includes(query)) {
                state.searchHistory.unshift(query);
                if (state.searchHistory.length > CONSTANTS.MAX_SEARCH_HISTORY) {
                    state.searchHistory.pop();
                }
                localStorage.setItem('searchHistory', JSON.stringify(state.searchHistory));
            }
        } catch (e) {
            console.warn('유효하지 않은 검색어 정규식:', e);
            if (DOM.searchResults) {
                DOM.searchResults.innerHTML = '<p class="no-results" role="alert">유효하지 않은 검색어입니다. 특수문자를 확인해주세요.</p>';
                DOM.searchResults.style.display = 'block';
            }
            if (DOM.searchLoading) DOM.searchLoading.style.display = 'none';
            updateProgressBar('0');
            return;
        }
    }

    switch (state.currentSortOrder) {
        case CONSTANTS.SORT_ORDER.LENGTH_ASC:
            filtered.sort((a, b) => a.textLength - b.textLength);
            break;
        case CONSTANTS.SORT_ORDER.LENGTH_DESC:
            filtered.sort((a, b) => b.textLength - a.textLength);
            break;
    }

    updateProgressBar('60%');

    const startIdx = (page - 1) * CONSTANTS.RESULTS_PER_PAGE;
    const endIdx = startIdx + CONSTANTS.RESULTS_PER_PAGE;
    const paginated = filtered.slice(startIdx, endIdx);

    if (DOM.searchResults) {
        if (filtered.length === 0 && (query || state.currentCategory !== CATEGORIES.ALL)) {
            DOM.searchResults.innerHTML = `
                <p class="no-results" role="alert" style="text-align: center; padding: 20px;">
                    검색 결과가 없습니다.
                    <button class="quiz-button blue" onclick="clearSearch()" style="margin-top: 15px;">
                        <i class="fas fa-undo" aria-hidden="true"></i> 검색 초기화
                    </button>
                </p>`;
            DOM.searchResults.style.display = 'block';
        } else if (paginated.length > 0) {
            DOM.searchResults.innerHTML = paginated.map(msg => {
                const highlightCat = searchType === 'title' ? highlightText(msg.category, query) : msg.category;
                const highlightSrc = searchType === 'title' ? highlightText(msg.source, query) : msg.source;
                const display = searchType === 'message' ? truncateText(msg.text, query) : truncateText(msg.text, '');

                return `
                    <div class="result-item fade-in" role="listitem" tabindex="0">
                        <h3><i class="fas fa-book" aria-hidden="true"></i> ${highlightCat}</h3>
                        <p>${display} ${msg.matchCount > 0 && query ? `<span class="match-count" aria-label="일치 횟수 ${msg.matchCount}회">${msg.matchCount}</span>` : ''}</p>
                        <p class="source"><i class="fas fa-bookmark" aria-hidden="true"></i> ${highlightSrc}</p>
                        <div class="action-buttons">
                            <button class="copy-button" onclick="copyMessageToClipboard('${msg.text.replace(/'/g, "\\'").replace(/"/g, '\\"')}','${msg.source.replace(/'/g, "\\'").replace(/"/g, '\\"')}','${msg.category.replace(/'/g, "\\'").replace(/"/g, '\\"')}',this.closest('.result-item'))" aria-label="${msg.category} 말씀과 출처 복사">
                                <i class="fas fa-copy" aria-hidden="true"></i> 복사하기
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            if (filtered.length > endIdx) {
                DOM.searchResults.innerHTML += `<button onclick="searchMessages(${page + 1})" class="quiz-button blue next-page-button" aria-label="다음 페이지">다음 페이지</button>`;
            }
            DOM.searchResults.innerHTML += `<button class="back-to-top result-top" onclick="scrollToResultsTop()" aria-label="검색 결과 맨 위로 이동" style="position: static; margin: 1rem auto; display: block; opacity: 1;"><i class="fas fa-arrow-up" aria-hidden="true"></i> 맨 위로</button>`;
            DOM.searchResults.style.display = 'flex';
            DOM.searchResults.setAttribute('aria-live', 'polite');
        }
    }

    if (DOM.searchStats && filtered.length > 0) {
        DOM.searchStats.style.display = 'block';
        DOM.searchStats.innerHTML = `총 ${filtered.length}개의 결과`;
    }

    if (DOM.searchLoading) DOM.searchLoading.style.display = 'none';
    updateProgressBar('100%');
    setTimeout(() => updateProgressBar('0'), 300);

    if (page > 1) scrollToResultsTop();
}, CONSTANTS.DEBOUNCE_DELAY);

/**
 * 검색 초기화
 */
const clearSearch = () => {
    if (DOM.searchInput) DOM.searchInput.value = '';
    state.currentCategory = CATEGORIES.ALL;
    localStorage.setItem('currentCategory', state.currentCategory);

    DOM.categoryButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-category') === CATEGORIES.ALL);
        btn.setAttribute('aria-current', btn.getAttribute('data-category') === CATEGORIES.ALL ? 'true' : 'false');
    });

    state.currentSortOrder = CONSTANTS.SORT_ORDER.DEFAULT;
    if (DOM.sortSelect) DOM.sortSelect.value = CONSTANTS.SORT_ORDER.DEFAULT;

    state.newlyAddedMessages = [];
    sessionStorage.removeItem(CONSTANTS.STORAGE.NEW_MESSAGES);
    document.getElementById('view-new-messages-button')?.remove();

    if (DOM.searchResults) {
        DOM.searchResults.innerHTML = '';
        DOM.searchResults.style.display = 'none';
    }
    if (DOM.searchStats) DOM.searchStats.style.display = 'none';
    if (DOM.searchSuggestions) {
        DOM.searchSuggestions.style.display = 'none';
        DOM.searchSuggestions.setAttribute('aria-hidden', 'true');
    }

    DOM.clearSearch?.classList.add('shake');
    setTimeout(() => DOM.clearSearch?.classList.remove('shake'), 300);

    searchMessages();
    showToast('검색 조건이 초기화되었습니다.');
};

/**
 * 랜덤 메시지 생성
 */
const generateRandomMessage = () => {
    if (state.messages.length === 0) {
        showToast('로드된 말씀이 없습니다. 잠시 후 다시 시도해주세요.');
        return;
    }

    let available = state.messages;
    const query = DOM.searchInput?.value.trim() || '';

    if (state.currentCategory !== CATEGORIES.ALL) {
        available = available.filter(msg => msg.category === state.currentCategory);
    }
    if (query) {
        available = available.filter(msg => msg.text.toLowerCase().includes(query.toLowerCase()));
    }

    if (available.length === 0) {
        const isFiltered = query !== '' || state.currentCategory !== CATEGORIES.ALL;
        DOM.searchResults.innerHTML = `
            <p class="no-results" role="alert" style="text-align: center; padding: 20px;">
                현재 조건에 맞는 랜덤 말씀이 없습니다.
                ${isFiltered ? `
                    <button class="quiz-button blue" onclick="clearSearch()" style="margin-top: 10px; margin-right: 10px;">
                        <i class="fas fa-undo" aria-hidden="true"></i> 검색 초기화
                    </button>
                ` : ''}
                <button class="quiz-button blue" onclick="generateRandomMessage()" style="margin-top: 10px;">
                    <i class="fas fa-random" aria-hidden="true"></i> 다른 랜덤 말씀 보기
                </button>
            </p>`;
        if (DOM.searchResults) DOM.searchResults.style.display = 'block';
        if (DOM.searchStats) DOM.searchStats.style.display = 'none';
        return;
    }

    const random = available[Math.floor(Math.random() * available.length)];

    if (DOM.searchResults) {
        DOM.searchResults.innerHTML = `
            <div class="result-item random-message fade-in" role="listitem" tabindex="0">
                <h3><i class="fas fa-book" aria-hidden="true"></i> ${random.category}</h3>
                <p>${highlightText(random.text, query)}</p>
                <p class="source"><i class="fas fa-bookmark" aria-hidden="true"></i> ${random.source}</p>
                <div class="action-buttons">
                    <button class="copy-button" onclick="copyMessageToClipboard('${random.text.replace(/'/g, "\\'").replace(/"/g, '\\"')}','${random.source.replace(/'/g, "\\'").replace(/"/g, '\\"')}','${random.category.replace(/'/g, "\\'").replace(/"/g, '\\"')}',this.closest('.result-item'))" aria-label="${random.category} 말씀과 출처 복사">
                        <i class="fas fa-copy" aria-hidden="true"></i> 복사하기
                    </button>
                </div>
                <button class="quiz-button blue" onclick="generateRandomMessage()" style="margin-top: 10px;">
                    <i class="fas fa-random" aria-hidden="true"></i> 다른 랜덤 말씀 보기
                </button>
            </div>`;
        DOM.searchResults.style.display = 'flex';
        DOM.searchResults.setAttribute('aria-live', 'polite');
    }
    if (DOM.searchStats) DOM.searchStats.style.display = 'none';
    scrollToResultsTop();
    showToast('새로운 랜덤 말씀을 불러왔습니다!');
};

/**
 * 페이지 표시
 */
const showPage = (pageId) => {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active', 'fade-in');
    });

    const active = document.querySelector(`#${pageId}`);
    if (active) {
        active.classList.add('active');
        setTimeout(() => active.classList.add('fade-in'), 10);
    }

    DOM.navButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-page') === pageId);
        btn.setAttribute('aria-current', btn.getAttribute('data-page') === pageId ? 'page' : 'false');
    });

    if (pageId === CONSTANTS.PAGES.WORKBOOK) {
        if (state.messages.length === 0) {
            loadMessages().then(() => searchMessages());
        } else if (state.newlyAddedMessages.length === 0) {
            searchMessages();
        }
        setTimeout(() => DOM.searchInput?.focus(), CONSTANTS.SCROLL_DURATION);
    }

    scrollToTop();
};

/**
 * 퀴즈 시작
 */
const startQuiz = (quizType) => {
    const url = QUIZ_PAGES[quizType];
    if (url) {
        window.location.href = url;
    } else {
        console.error('유효하지 않은 퀴즈 유형:', quizType);
        showToast('퀴즈를 시작할 수 없습니다. 다시 시도하세요.');
    }
};

/**
 * 이벤트 리스너 등록
 */
const attachEventListeners = () => {
    // 네비게이션 버튼
    DOM.navButtons.forEach(btn => {
        btn.addEventListener('click', () => showPage(btn.getAttribute('data-page')));
    });

    // 카테고리 버튼
    DOM.categoryButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            DOM.categoryButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-current', 'false');
            });
            this.classList.add('active');
            this.setAttribute('aria-current', 'true');
            state.currentCategory = this.getAttribute('data-category');
            localStorage.setItem('currentCategory', state.currentCategory);
            searchMessages();
            scrollToResultsTop();
        });
    });

    // 퀴즈 버튼
    DOM.quizButtons?.forEach(btn => {
        btn.addEventListener('click', function() {
            startQuiz(this.getAttribute('data-quiz-type'));
        });
    });

    // 검색 입력
    if (DOM.searchInput) {
        DOM.searchInput.addEventListener('input', renderSearchSuggestions);
        DOM.searchInput.addEventListener('focus', renderSearchSuggestions);
        DOM.searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                if (DOM.searchSuggestions) {
                    DOM.searchSuggestions.style.display = 'none';
                    DOM.searchSuggestions.setAttribute('aria-hidden', 'true');
                }
            }, 200);
        });
        DOM.searchInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                searchMessages();
                if (DOM.searchSuggestions) {
                    DOM.searchSuggestions.style.display = 'none';
                    DOM.searchSuggestions.setAttribute('aria-hidden', 'true');
                }
            }
        });
    }

    // 검색 제안 키보드 네비게이션
    if (DOM.searchSuggestions) {
        DOM.searchSuggestions.addEventListener('keydown', e => {
            const suggestions = DOM.searchSuggestions.querySelectorAll('.suggestion');
            if (suggestions.length === 0) return;

            let currentIdx = -1;
            const active = document.activeElement;
            
            if (active?.closest('.suggestion') === active || 
                active?.closest('.suggestion span')?.parentElement === active.parentElement ||
                active?.closest('.suggestion button')?.parentElement === active.parentElement) {
                currentIdx = Array.from(suggestions).findIndex(s => 
                    s === active || s.querySelector('span') === active || s.querySelector('button') === active
                );
            }

            let nextIdx = currentIdx;
            const handleSuggestionAction = (idx) => {
                if (active?.classList.contains('delete-suggestion') || active?.closest('.delete-suggestion')) {
                    const text = suggestions[idx].querySelector('span')?.textContent;
                    const i = state.searchHistory.indexOf(text);
                    if (i !== -1) deleteSearchHistory(i);
                } else if (active?.classList.contains('clear-all') || active?.closest('.clear-all')) {
                    clearSearchHistory();
                } else {
                    const text = suggestions[idx].querySelector('span')?.textContent || suggestions[idx].textContent;
                    selectSuggestion(text);
                }
            };

            if (e.key === 'ArrowDown') {
                nextIdx = (currentIdx + 1) % suggestions.length;
                e.preventDefault();
            } else if (e.key === 'ArrowUp') {
                nextIdx = (currentIdx - 1 + suggestions.length) % suggestions.length;
                e.preventDefault();
            } else if (e.key === 'Enter') {
                if (currentIdx >= 0) {
                    handleSuggestionAction(currentIdx);
                } else if (DOM.searchInput.value.trim() !== '') {
                    searchMessages();
                    DOM.searchSuggestions.style.display = 'none';
                    DOM.searchSuggestions.setAttribute('aria-hidden', 'true');
                }
                e.preventDefault();
            } else if (e.key === 'Delete' && currentIdx >= 0) {
                const text = suggestions[currentIdx].querySelector('span')?.textContent;
                const i = state.searchHistory.indexOf(text);
                if (i !== -1) deleteSearchHistory(i);
                e.preventDefault();
            }

            if (nextIdx !== currentIdx) {
                suggestions[nextIdx].focus();
            }
        });
    }

    // 검색 결과 키보드 네비게이션
    if (DOM.searchResults) {
        DOM.searchResults.addEventListener('keydown', e => {
            const results = DOM.searchResults.querySelectorAll('.result-item');
            if (results.length === 0) return;

            const currentIdx = Array.from(results).findIndex(r => r === document.activeElement);
            let nextIdx = currentIdx;

            if (e.key === 'ArrowDown') {
                nextIdx = (currentIdx + 1) % results.length;
                e.preventDefault();
            } else if (e.key === 'ArrowUp') {
                nextIdx = (currentIdx - 1 + results.length) % results.length;
                e.preventDefault();
            } else if (e.key === 'Enter' && currentIdx >= 0) {
                results[currentIdx].querySelector('.copy-button')?.click();
                e.preventDefault();
            }

            if (nextIdx !== currentIdx) {
                results[nextIdx].focus();
            }
        });
    }

    // 스크롤 이벤트 (맨 위로 버튼)
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const show = window.scrollY > 300;
            DOM.backToTop?.classList.toggle('show', show);
            DOM.backToTop?.setAttribute('aria-hidden', !show);
        }, 100);
    });

    // 전역 단축키
    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === '/') {
            e.preventDefault();
            DOM.searchInput?.focus();
        } else if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            searchMessages();
        } else if (e.ctrlKey && e.key === 'Backspace') {
            e.preventDefault();
            clearSearch();
        }
    });

    // 버튼 키보드 접근성
    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                btn.click();
            }
        });
    });

    // 개별 버튼 이벤트
    DOM.clearSearch?.addEventListener('click', clearSearch);
    DOM.randomMessageButton?.addEventListener('click', generateRandomMessage);
    DOM.backToTop?.addEventListener('click', scrollToTop);

    // 정렬 변경
    DOM.sortSelect?.addEventListener('change', e => {
        state.currentSortOrder = e.target.value;
        searchMessages();
    });
};

/**
 * 애플리케이션 초기화
 */
const initializeApp = () => {
    DOM = getDOMElements();

    const initialBtn = document.querySelector(`.category-container button[data-category="${state.currentCategory}"]`);
    if (initialBtn) {
        initialBtn.classList.add('active');
        initialBtn.setAttribute('aria-current', 'true');
    }

    attachEventListeners();

    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);

    showPage(CONSTANTS.PAGES.HOME);

    if (state.newlyAddedMessages.length > 0) {
        renderNewMessageButton(state.newlyAddedMessages.length);
    }
};

document.addEventListener('DOMContentLoaded', initializeApp);